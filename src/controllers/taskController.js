const { validationResult } = require('express-validator');
const Task = require('../models/Task');
const StaffActivity = require('../models/StaffActivity');
const logger = require('../utils/logger');
const User = require('../models/User');

/**
 * @desc    Create a new task
 * @route   POST /api/tasks
 * @access  Private (Marketing Staff)
 */
exports.createTask = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { 
      title, 
      description, 
      assignedTo, 
      staffRole, 
      distributorId, 
      brand, 
      variant, 
      size, 
      quantity, 
      deadline,
      assignedDate,
      items, // Array of additional items for Godown Incharge tasks
      assigneeName, // New field for external user name
      isExternalUser // Flag to indicate if user doesn't exist in the system
    } = req.body;

    // Create task with common fields
    const taskData = {
      title,
      description: description || '',
      status: 'Pending',
      createdBy: req.user.id,
      staffRole: staffRole || 'Marketing Staff',
      assignedDate: assignedDate || new Date()
    };

    // Handle assignment based on whether it's an external user or not
    if (isExternalUser && assigneeName) {
      // For external users, store name in externalAssignee field
      taskData.externalAssignee = {
        name: assigneeName,
        isExternalUser: true
      };
      // assignedTo remains null/undefined
    } else {
      // For existing users, use the assignedTo field
      taskData.assignedTo = assignedTo || req.user.id; // Default to self if not specified
    }

    // Add role-specific fields
    if (staffRole === 'Marketing Staff') {
      if (distributorId) {
        taskData.distributorId = distributorId;
      }
      if (deadline) {
        taskData.deadline = deadline;
      }
    } else if (staffRole === 'Godown Incharge') {
      if (brand) taskData.brand = brand;
      if (variant) taskData.variant = variant;
      if (size) taskData.size = size;
      if (quantity) taskData.quantity = quantity;
      
      // Add multiple items if provided
      if (items && Array.isArray(items) && items.length > 0) {
        taskData.items = items.map(item => ({
          brand: item.brand,
          variant: item.variant,
          size: item.size || 'N/A',
          quantity: item.quantity
        }));
      }
    } else if (staffRole === 'Mid-Level Manager') {
      // Mid-Level Manager specific fields
      if (deadline) {
        taskData.deadline = deadline;
      }
    }

    // Create task
    const task = await Task.create(taskData);

    // Log staff activity
    await StaffActivity.create({
      staffId: req.user.id,
      activityType: 'Task',
      details: `Created task: ${title}`,
      status: 'Completed',
      relatedId: task._id,
      onModel: 'Task'
    });

    // Populate references for response
    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name')
      .populate('createdBy', 'name')
      .populate('distributorId', 'name shopName contact address retailShopCount wholesaleShopCount orderCount retailShops wholesaleShops');

    res.status(201).json({
      success: true,
      data: populatedTask
    });
  } catch (error) {
    logger.error(`Error in createTask controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get all tasks (with optional filters)
 * @route   GET /api/tasks
 * @access  Private (Marketing Staff, Mid-Level Manager)
 */
exports.getTasks = async (req, res, next) => {
  try {
    const { status, assignedTo, staffRole, type, creatorRole } = req.query;
    
    console.log("Task filter query parameters:", req.query);
    
    // Build query
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (assignedTo) {
      query.assignedTo = assignedTo;
    }
    
    if (staffRole) {
      query.staffRole = staffRole;
    }
    
    // Filter by task type (internal or external)
    if (type === 'internal') {
      query.taskType = 'internal';
    } else if (type === 'external') {
      query.$or = [
        { taskType: 'external' },
        { 'externalAssignee.isExternalUser': true }
      ];
    }
    
    // Filter by creator role if specified (for internal tasks tab)
    if (creatorRole) {
      // Check if creatorRole is an array (multiple values from query params come as array)
      const roleArray = Array.isArray(creatorRole) ? creatorRole : [creatorRole];
      
      // Debug output to check roles being used
      console.log(`Filtering tasks by creator roles: ${JSON.stringify(roleArray)}`);
      
      // Find users with any of the specified roles
      const usersWithRole = await User.find({ role: { $in: roleArray } }).select('_id');
      const userIds = usersWithRole.map(user => user._id);
      
      if (userIds.length === 0) {
        return res.status(200).json({
          success: true,
          count: 0,
          data: []
        });
      }
      
      query.createdBy = { $in: userIds };
    }
    
    console.log("Final query:", JSON.stringify(query));

    // Get tasks with populated fields
    const tasks = await Task.find(query)
      .populate('assignedTo', 'name role')
      .populate('createdBy', 'name role')
      .populate('distributorId', 'name shopName contact address retailShopCount wholesaleShopCount orderCount retailShops wholesaleShops')
      .sort({ createdAt: -1 });
    
    // Extra debug output for internal tasks
    if (type === 'internal' || creatorRole) {
      const taskCreators = tasks.map(t => 
        t.createdBy ? `${t.createdBy.name} (${t.createdBy.role})` : 'Unknown'
      );
      console.log(`Task creators: ${JSON.stringify(taskCreators)}`);
    }

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    logger.error(`Error in getTasks controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get a single task
 * @route   GET /api/tasks/:taskId
 * @access  Private
 */
exports.getTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId)
      .populate('assignedTo', 'name')
      .populate('createdBy', 'name')
      .populate('distributorId', 'name shopName contact address retailShopCount wholesaleShopCount orderCount retailShops wholesaleShops');

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // For Marketing Staff, only allow viewing tasks they created or are assigned to
    if (req.user.role === 'Marketing Staff' && 
        task.createdBy._id.toString() !== req.user.id && 
        task.assignedTo._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this task'
      });
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    logger.error(`Error in getTask controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Update task status
 * @route   PATCH /api/tasks/:taskId
 * @access  Private (Marketing Staff)
 */
exports.updateTaskStatus = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { status, report } = req.body;
    
    // Validate status
    if (!['Pending', 'In Progress', 'Completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Status must be Pending, In Progress, or Completed'
      });
    }

    // Find task
    let task = await Task.findById(req.params.taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    
    // For Marketing Staff, only allow updating tasks they are assigned to
    if (req.user.role === 'Marketing Staff' && task.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this task'
      });
    }

    // Update object with status and optional report
    const updateData = { status };
    if (report) {
      updateData.report = report;
    }

    // Update task
    task = await Task.findByIdAndUpdate(
      req.params.taskId,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('assignedTo', 'name')
      .populate('createdBy', 'name')
      .populate('distributorId', 'name shopName contact address retailShopCount wholesaleShopCount orderCount retailShops wholesaleShops');

    // Log staff activity
    await StaffActivity.create({
      staffId: req.user.id,
      activityType: 'Task',
      details: `Updated task status to ${status}: ${task.title}`,
      status: 'Completed',
      relatedId: task._id,
      onModel: 'Task'
    });

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    logger.error(`Error in updateTaskStatus controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Create a task from mobile app
 * @route   POST /api/tasks/mobile
 * @access  Private (Any authenticated user)
 */
exports.createMobileAppTask = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { 
      title, 
      description, 
      assignedTo, 
      assigneeName,
      isNewUser,
      staffRole, 
      distributorId, 
      brand, 
      variant, 
      size, 
      quantity, 
      deadline,
      assignedDate,
      items
    } = req.body;

    // Create task with common fields
    const taskData = {
      title,
      description: description || '',
      status: 'Pending',
      createdBy: req.user.id,
      staffRole: staffRole || 'Marketing Staff',
      assignedDate: assignedDate || new Date()
    };

    // Handle assignment based on whether it's a new external user or existing user
    if (isNewUser && assigneeName) {
      // For external users, store name in externalAssignee field
      taskData.externalAssignee = {
        name: assigneeName,
        isExternalUser: true
      };
      // assignedTo remains null/undefined
    } else {
      // For existing users, use the assignedTo field
      if (!assignedTo) {
        return res.status(400).json({
          success: false,
          error: 'For existing users, assignedTo is required'
        });
      }
      taskData.assignedTo = assignedTo;
    }

    // Add role-specific fields
    if (staffRole === 'Marketing Staff') {
      if (distributorId) {
        taskData.distributorId = distributorId;
      }
      if (deadline) {
        taskData.deadline = deadline;
      }
    } else if (staffRole === 'Godown Incharge') {
      if (brand) taskData.brand = brand;
      if (variant) taskData.variant = variant;
      if (size) taskData.size = size;
      if (quantity) taskData.quantity = quantity;
      
      // Add multiple items if provided
      if (items && Array.isArray(items) && items.length > 0) {
        taskData.items = items.map(item => ({
          brand: item.brand,
          variant: item.variant,
          size: item.size || 'N/A',
          quantity: item.quantity
        }));
      }
    } else if (staffRole === 'Mid-Level Manager') {
      // Mid-Level Manager specific fields
      if (deadline) {
        taskData.deadline = deadline;
      }
    }

    // Create task
    const task = await Task.create(taskData);

    // Log staff activity
    await StaffActivity.create({
      staffId: req.user.id,
      activityType: 'Task',
      details: `Created task from mobile app: ${title}`,
      status: 'Completed',
      relatedId: task._id,
      onModel: 'Task'
    });

    // Populate references for response
    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name')
      .populate('createdBy', 'name')
      .populate('distributorId', 'name shopName contact address retailShopCount wholesaleShops orderCount retailShops wholesaleShops');

    res.status(201).json({
      success: true,
      data: populatedTask
    });
  } catch (error) {
    logger.error(`Error in createMobileAppTask controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Create internal task from mobile app (simplified)
 * @route   POST /api/tasks/internal-task
 * @access  Private (Any authenticated user)
 */
exports.createInternalTask = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { 
      taskDetail, 
      assignTo,
      isOtherUser,
      otherUserName
    } = req.body;

    // Get the full user object to ensure we have the correct role
    const creator = await User.findById(req.user.id).select('name role');
    
    if (!creator) {
      return res.status(400).json({
        success: false,
        error: 'Creator user not found'
      });
    }

    console.log(`Creating internal task. Creator: ${creator.name} (${creator.role}) - ID: ${req.user.id}`);

    // Create task with common fields
    const taskData = {
      title: taskDetail, // Use taskDetail as the title
      description: '', // Empty description
      status: 'Pending',
      createdBy: req.user.id,
      staffRole: creator.role, // Use the actual role of the creator
      assignedDate: new Date(),
      taskType: 'internal' // Explicitly set task type to internal
    };

    // Handle assignment based on whether it's an external user or not
    if (isOtherUser) {
      if (!otherUserName) {
        return res.status(400).json({
          success: false,
          error: 'External user name is required when isOtherUser is true'
        });
      }
      // For external users, store name in externalAssignee field
      taskData.externalAssignee = {
        name: otherUserName,
        isExternalUser: true
      };
    } else {
      if (!assignTo) {
        return res.status(400).json({
          success: false,
          error: 'Assigned user ID is required when isOtherUser is false'
        });
      }
      // For existing users, use the assignTo field
      taskData.assignedTo = assignTo;
    }

    // Create the task
    const task = await Task.create(taskData);

    // Log the staff activity
    await StaffActivity.create({
      staffId: req.user.id,
      activityType: 'Task Creation',
      details: `Created internal task: ${taskDetail}`,
      status: 'Completed',
      relatedId: task._id,
      onModel: 'Task'
    });

    // Fetch the populated task for the response
    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name role')
      .populate('createdBy', 'name role');

    console.log('Created internal task:', populatedTask);

    res.status(201).json({
      success: true,
      data: populatedTask
    });
  } catch (error) {
    logger.error(`Error in createInternalTask controller: ${error.message}`);
    console.error('Stack trace:', error.stack);
    next(error);
  }
};

/**
 * @desc    Delete a task
 * @route   DELETE /api/tasks/:taskId
 * @access  Private (Task creator or Administrator)
 */
exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // Authorization check - only allow task creator or admin to delete
    if (req.user.role !== 'Administrator' && task.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this task'
      });
    }

    // Delete the task
    await Task.findByIdAndDelete(req.params.taskId);

    // Log staff activity
    await StaffActivity.create({
      staffId: req.user.id,
      activityType: 'Task',
      details: `Deleted task: ${task.title}`,
      status: 'Completed',
      relatedId: null,
      onModel: 'Task'
    });

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    logger.error(`Error in deleteTask controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get tasks created by a specific user
 * @route   GET /api/tasks/created-by/:userId
 * @access  Private
 */
exports.getTasksByCreator = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // Validate userId
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Build query to find tasks created by this user
    const query = { createdBy: userId };
    
    // Get tasks with populated fields
    const tasks = await Task.find(query)
      .populate('assignedTo', 'name')
      .populate('createdBy', 'name role')
      .populate('distributorId', 'name shopName contact address retailShopCount wholesaleShopCount orderCount retailShops wholesaleShops')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    logger.error(`Error in getTasksByCreator controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Debug endpoint to get all internal tasks
 * @route   GET /api/tasks/debug/internal-tasks
 * @access  Private
 */
exports.debugInternalTasks = async (req, res, next) => {
  try {
    // Get all users
    const users = await User.find({}).select('_id name role');
    
    // Count users by role
    const usersByRole = {};
    users.forEach(user => {
      const role = user.role;
      usersByRole[role] = (usersByRole[role] || 0) + 1;
    });
    
    // Get all tasks with populated creator information
    const tasks = await Task.find({})
      .populate('assignedTo', 'name role')
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 });

    // Count tasks by creator role
    const tasksByRole = {};
    tasks.forEach(task => {
      if (task.createdBy && task.createdBy.role) {
        const role = task.createdBy.role;
        tasksByRole[role] = (tasksByRole[role] || 0) + 1;
      } else {
        tasksByRole['unknown'] = (tasksByRole['unknown'] || 0) + 1;
      }
    });

    // Get Marketing Staff tasks specifically
    const marketingStaffTasks = tasks.filter(
      task => task.createdBy && task.createdBy.role === 'Marketing Staff'
    );

    // Get App Developer tasks specifically
    const appDeveloperTasks = tasks.filter(
      task => task.createdBy && task.createdBy.role === 'App Developer'
    );
    
    // Get tasks that should be shown in internal tasks tab
    const internalTasksTabTasks = tasks.filter(
      task => task.createdBy && 
      (task.createdBy.role === 'Marketing Staff' || task.createdBy.role === 'App Developer')
    );

    res.status(200).json({
      success: true,
      users: {
        total: users.length,
        byRole: usersByRole
      },
      tasks: {
        totalCount: tasks.length,
        byRole: tasksByRole,
        marketingStaffCount: marketingStaffTasks.length,
        appDeveloperCount: appDeveloperTasks.length,
        internalTasksTabCount: internalTasksTabTasks.length
      },
      marketingStaffTasks: marketingStaffTasks.slice(0, 5), // Limit to first 5 for brevity
      appDeveloperTasks: appDeveloperTasks.slice(0, 5), // Limit to first 5 for brevity
      internalTasksTabTasks: internalTasksTabTasks.slice(0, 10) // Limit to first 10 for brevity
    });
  } catch (error) {
    logger.error(`Error in debugInternalTasks controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Debug endpoint to check tasks created by Chachi
 * @route   GET /api/tasks/debug/chachi-tasks
 * @access  Private
 */
exports.debugChachiTasks = async (req, res, next) => {
  try {
    // First, find the user named Chachi
    const chachiUser = await User.findOne({
      name: { $regex: 'chachi', $options: 'i' }
    }).select('_id name role');
    
    if (!chachiUser) {
      return res.status(404).json({
        success: false,
        error: 'User Chachi not found'
      });
    }
    
    console.log(`Found Chachi user: ${chachiUser.name} (${chachiUser.role}) - ${chachiUser._id}`);
    
    // Get all tasks created by Chachi
    const tasks = await Task.find({ createdBy: chachiUser._id })
      .populate('assignedTo', 'name role')
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 });
    
    console.log(`Found ${tasks.length} tasks created by Chachi`);
    
    // Get tasks that should appear in internal tasks tab
    const internalTasksTabQuery = {
      createdBy: chachiUser._id,
      assignedTo: { $exists: true, $ne: null },
      'externalAssignee.isExternalUser': { $ne: true }
    };
    
    const internalTasks = await Task.find(internalTasksTabQuery)
      .populate('assignedTo', 'name role')
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 });
    
    console.log(`Found ${internalTasks.length} internal tasks created by Chachi`);
    
    res.status(200).json({
      success: true,
      chachiUser,
      tasksCount: tasks.length,
      internalTasksCount: internalTasks.length,
      tasks: tasks.map(t => ({
        id: t._id,
        title: t.title,
        status: t.status,
        createdAt: t.createdAt,
        assignedTo: t.assignedTo ? {
          id: t.assignedTo._id,
          name: t.assignedTo.name,
          role: t.assignedTo.role
        } : null,
        externalAssignee: t.externalAssignee,
        isInternal: !t.externalAssignee?.isExternalUser && t.assignedTo != null
      })),
      internalTasks: internalTasks.map(t => ({
        id: t._id,
        title: t.title,
        status: t.status,
        createdAt: t.createdAt,
        assignedTo: t.assignedTo ? {
          id: t.assignedTo._id,
          name: t.assignedTo.name,
          role: t.assignedTo.role
        } : null
      }))
    });
  } catch (error) {
    logger.error(`Error in debugChachiTasks controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get tasks assigned to the current user
 * @route   GET /api/tasks/my-tasks
 * @access  Private
 */
exports.getMyTasks = async (req, res, next) => {
  try {
    // Build query to find tasks assigned to this user
    const query = { assignedTo: req.user.id };
    
    // Add status filter if provided
    if (req.query.status && ['Pending', 'In Progress', 'Completed'].includes(req.query.status)) {
      query.status = req.query.status;
    }
    
    // Get tasks with populated fields
    const tasks = await Task.find(query)
      .populate('assignedTo', 'name role')
      .populate('createdBy', 'name role')
      .populate('distributorId', 'name shopName contact address')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    logger.error(`Error in getMyTasks controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get tasks created by the current user
 * @route   GET /api/tasks/created-by-me
 * @access  Private
 */
exports.getTasksCreatedByMe = async (req, res, next) => {
  try {
    // Build query to find tasks created by this user
    const query = { createdBy: req.user.id };
    
    // Add status filter if provided
    if (req.query.status && ['Pending', 'In Progress', 'Completed'].includes(req.query.status)) {
      query.status = req.query.status;
    }
    
    // Get tasks with populated fields
    const tasks = await Task.find(query)
      .populate('assignedTo', 'name role')
      .populate('createdBy', 'name role')
      .populate('distributorId', 'name shopName contact address')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    logger.error(`Error in getTasksCreatedByMe controller: ${error.message}`);
    next(error);
  }
};