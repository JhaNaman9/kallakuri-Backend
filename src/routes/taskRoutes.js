const express = require('express');
const { check, param, body } = require('express-validator');
const taskController = require('../controllers/taskController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply protect middleware to all routes
router.use(protect);

// Define exact path routes first with explicit paths
const internalTaskPath = '/internal-task'; // Define the exact path
const mobilePath = '/mobile'; // Define the exact path

/**
 * @swagger
 * /tasks:
 *   post:
 *     summary: Create a new task
 *     description: Create a task for any staff member or external user
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - staffRole
 *             properties:
 *               title:
 *                 type: string
 *                 description: Task title
 *               description:
 *                 type: string
 *                 description: Task description
 *               assignedTo:
 *                 type: string
 *                 description: User ID to assign the task to (not required if isExternalUser is true)
 *               isExternalUser:
 *                 type: boolean
 *                 description: Flag indicating if the assignee is not in the system
 *               assigneeName:
 *                 type: string
 *                 description: Name of the external assignee when isExternalUser is true
 *               staffRole:
 *                 type: string
 *                 enum: [Marketing Staff, Godown Incharge, Mid-Level Manager]
 *                 description: Role of the staff the task is assigned to
 *               distributorId:
 *                 type: string
 *                 description: Distributor ID (for Marketing Staff tasks)
 *               brand:
 *                 type: string
 *                 description: Brand name (for Godown Incharge tasks)
 *               variant:
 *                 type: string
 *                 description: Variant type (for Godown Incharge tasks)
 *               size:
 *                 type: string
 *                 description: Size (for Godown Incharge tasks)
 *               quantity:
 *                 type: number
 *                 description: Quantity (for Godown Incharge tasks)
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     brand:
 *                       type: string
 *                     variant:
 *                       type: string
 *                     size:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                 description: Multiple items for Godown Incharge tasks
 *               deadline:
 *                 type: string
 *                 format: date-time
 *                 description: Deadline for the task
 *               assignedDate:
 *                 type: string
 *                 format: date-time
 *                 description: Date the task is assigned
 *     responses:
 *       201:
 *         description: Task created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.post(
  '/',
  [
    check('title', 'Title is required').not().isEmpty(),
    check('staffRole', 'Staff role must be Marketing Staff, Godown Incharge, or Mid-Level Manager')
      .isIn(['Marketing Staff', 'Godown Incharge', 'Mid-Level Manager']),
    
    // External user validation
    check('isExternalUser', 'isExternalUser must be a boolean').optional().isBoolean(),
    check('assigneeName', 'Assignee name is required for external users').if(body => body.isExternalUser).notEmpty(),
    
    // MongoDB ID validations
    check('assignedTo', 'Assigned To must be a valid MongoDB ID').optional().isMongoId(),
    check('distributorId', 'Distributor ID must be a valid MongoDB ID').optional().isMongoId(),
    
    // Optional fields
    check('brand', 'Brand is required for Godown Incharge tasks').optional(),
    check('variant', 'Variant is required for Godown Incharge tasks').optional(),
    check('size', 'Size is required for Godown Incharge tasks').optional(),
    check('quantity', 'Quantity must be a positive number').optional().isNumeric().isInt({ min: 1 }),
    check('deadline', 'Deadline must be a valid date').optional().isISO8601(),
    check('assignedDate', 'Assigned date must be a valid date').optional().isISO8601(),
    check('items', 'Items must be an array of product information').optional().isArray()
  ],
  taskController.createTask
);

/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: Get all tasks
 *     description: Retrieve all tasks with optional filtering
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, In Progress, Completed]
 *         description: Filter by task status
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
 *         description: Filter by assigned user ID
 *       - in: query
 *         name: staffRole
 *         schema:
 *           type: string
 *           enum: [Marketing Staff, Godown Incharge, Mid-Level Manager]
 *         description: Filter by staff role
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [internal, external]
 *         description: Filter tasks by type (internal or external)
 *     responses:
 *       200:
 *         description: List of tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [Pending, In Progress, Completed]
 *                       assignedTo:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           name:
 *                             type: string
 *                       isExternalUser:
 *                         type: boolean
 *                       assigneeName:
 *                         type: string
 *                       staffRole:
 *                         type: string
 *                       deadline:
 *                         type: string
 *                         format: date-time
 *                       assignedDate:
 *                         type: string
 *                         format: date-time
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Not authenticated
 */
router.get('/', taskController.getTasks);

/**
 * @swagger
 * /tasks/mobile:
 *   post:
 *     summary: Create a task from mobile app
 *     description: Create a task for either an existing system user or a new external user
 *     tags: [Mobile App]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - staffRole
 *             properties:
 *               title:
 *                 type: string
 *                 description: Task title
 *               description:
 *                 type: string
 *                 description: Task description
 *               assignedTo:
 *                 type: string
 *                 description: User ID to assign the task to (required for existing users)
 *               isNewUser:
 *                 type: boolean
 *                 description: Flag indicating if the assignee is a new user not in the system
 *               assigneeName:
 *                 type: string
 *                 description: Name of the new external assignee (required when isNewUser is true)
 *               staffRole:
 *                 type: string
 *                 enum: [Marketing Staff, Godown Incharge, Mid-Level Manager]
 *                 description: Role of the staff the task is assigned to
 *               distributorId:
 *                 type: string
 *                 description: Distributor ID (for Marketing Staff tasks)
 *               brand:
 *                 type: string
 *                 description: Brand name (for Godown Incharge tasks)
 *               variant:
 *                 type: string
 *                 description: Variant type (for Godown Incharge tasks)
 *               size:
 *                 type: string
 *                 description: Size (for Godown Incharge tasks)
 *               quantity:
 *                 type: number
 *                 description: Quantity (for Godown Incharge tasks)
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     brand:
 *                       type: string
 *                     variant:
 *                       type: string
 *                     size:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                 description: Multiple items for Godown Incharge tasks
 *               deadline:
 *                 type: string
 *                 format: date-time
 *                 description: Deadline for the task
 *               assignedDate:
 *                 type: string
 *                 format: date-time
 *                 description: Date the task is assigned
 *     responses:
 *       201:
 *         description: Task created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     title:
 *                       type: string
 *                     description:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [Pending, In Progress, Completed]
 *                     assignedTo:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         name:
 *                           type: string
 *                     externalAssignee:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                         isExternalUser:
 *                           type: boolean
 *                     staffRole:
 *                       type: string
 *                     deadline:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Not authenticated
 */
router.post(
  mobilePath, // Use constant instead of string
  [
    check('title', 'Title is required').not().isEmpty(),
    check('staffRole', 'Staff role must be Marketing Staff, Godown Incharge, or Mid-Level Manager')
      .isIn(['Marketing Staff', 'Godown Incharge', 'Mid-Level Manager']),
    
    // External/New user validation
    check('isNewUser', 'isNewUser must be a boolean').optional().isBoolean(),
    check('assigneeName', 'Assignee name is required for new users').if(body => body.isNewUser).notEmpty(),
    
    // Existing user validation
    check('assignedTo', 'Assigned To must be a valid MongoDB ID').if(body => !body.isNewUser).isMongoId(),
    
    // MongoDB ID validations
    check('distributorId', 'Distributor ID must be a valid MongoDB ID').optional().isMongoId(),
    
    // Optional fields
    check('brand', 'Brand is required for Godown Incharge tasks').optional(),
    check('variant', 'Variant is required for Godown Incharge tasks').optional(),
    check('size', 'Size is required for Godown Incharge tasks').optional(),
    check('quantity', 'Quantity must be a positive number').optional().isNumeric().isInt({ min: 1 }),
    check('deadline', 'Deadline must be a valid date').optional().isISO8601(),
    check('assignedDate', 'Assigned date must be a valid date').optional().isISO8601(),
    check('items', 'Items must be an array of product information').optional().isArray()
  ],
  taskController.createMobileAppTask
);

/**
 * @swagger
 * /tasks/internal-task:
 *   post:
 *     summary: Create a simple internal task from mobile app
 *     description: Create a task with just task details and assignee information
 *     tags: [Mobile App]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - taskDetail
 *             properties:
 *               taskDetail:
 *                 type: string
 *                 description: Details of the task
 *               assignTo:
 *                 type: string
 *                 description: User ID to assign the task to (required if not using otherUserName)
 *               isOtherUser:
 *                 type: boolean
 *                 description: Flag indicating if assigning to a user not in the system
 *               otherUserName:
 *                 type: string
 *                 description: Name of user not in the system (required when isOtherUser is true)
 *     responses:
 *       201:
 *         description: Task created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     title:
 *                       type: string
 *                       description: Contains the task details
 *                     status:
 *                       type: string
 *                       enum: [Pending, In Progress, Completed]
 *                     assignedTo:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         name:
 *                           type: string
 *                       description: User details (only for system users)
 *                     externalAssignee:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                         isExternalUser:
 *                           type: boolean
 *                       description: External user details (only when isOtherUser is true)
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Not authenticated
 */
router.post(
  internalTaskPath,
  [
    check('taskDetail', 'Task detail is required').notEmpty(),
    check('isOtherUser', 'isOtherUser is required and must be a boolean').isBoolean(),
    // otherUserName is required if isOtherUser is true
    check('otherUserName').if(body('isOtherUser').equals('true')).notEmpty()
      .withMessage('Other user name is required when isOtherUser is true'),
    // assignTo is required if isOtherUser is false
    check('assignTo').if(body('isOtherUser').equals('false')).notEmpty()
      .withMessage('assignTo is required when isOtherUser is false'),
    check('assignTo').if(body('isOtherUser').equals('false')).isMongoId()
      .withMessage('assignTo must be a valid MongoDB ID')
  ],
  taskController.createInternalTask
);

// Make sure GET route for internal-task doesn't get misinterpreted as a taskId
router.get(internalTaskPath, (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'This endpoint only accepts POST requests for creating internal tasks'
  });
});

// Add GET handler for mobile endpoint
router.get(mobilePath, (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'This endpoint only accepts POST requests for creating mobile app tasks'
  });
});

/**
 * @swagger
 * /tasks/{taskId}:
 *   get:
 *     summary: Get a single task
 *     description: Retrieve details of a specific task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     title:
 *                       type: string
 *                     description:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [Pending, In Progress, Completed]
 *                     assignedTo:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         description: System user details (null for external users)
 *                     isExternalUser:
 *                       type: boolean
 *                       description: Flag indicating if the task is assigned to an external user
 *                     assigneeName:
 *                       type: string
 *                       description: Name of the external assignee (only present when isExternalUser is true)
 *                     staffRole:
 *                       type: string
 *                     distributorId:
 *                       type: string
 *                     brand:
 *                       type: string
 *                     variant:
 *                       type: string
 *                     size:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                     deadline:
 *                       type: string
 *                       format: date-time
 *                     assignedDate:
 *                       type: string
 *                       format: date-time
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Task not found
 */
router.get('/:taskId', taskController.getTask);

/**
 * @swagger
 * /tasks/{taskId}:
 *   patch:
 *     summary: Update task status
 *     description: Update the status of a task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Pending, In Progress, Completed]
 *                 description: New task status
 *               report:
 *                 type: string
 *                 description: URL or file path to the report document
 *     responses:
 *       200:
 *         description: Task status updated
 *       400:
 *         description: Invalid status
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Task not found
 */
router.patch(
  '/:taskId',
  [
    param('taskId', 'Task ID must be a valid MongoDB ID').isMongoId(),
    check('status', 'Status is required').not().isEmpty(),
    check('status', 'Status must be Pending, In Progress, or Completed').isIn(['Pending', 'In Progress', 'Completed']),
    check('report', 'Report must be a string').optional().isString()
  ],
  taskController.updateTaskStatus
);

/**
 * @swagger
 * /tasks/{taskId}:
 *   delete:
 *     summary: Delete a task
 *     description: Delete a specific task (only allowed for task creator or administrator)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized to delete this task
 *       404:
 *         description: Task not found
 */
router.delete('/:taskId', taskController.deleteTask);

/**
 * @swagger
 * /tasks/created-by/{userId}:
 *   get:
 *     summary: Get tasks created by a specific user
 *     description: Retrieve all tasks created by a specified user ID
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user who created the tasks
 *     responses:
 *       200:
 *         description: List of tasks created by the specified user
 *       400:
 *         description: Invalid user ID
 *       401:
 *         description: Not authenticated
 */
router.get('/created-by/:userId', protect, taskController.getTasksByCreator);

// Debug routes - should be disabled in production
router.get('/debug/internal-tasks', protect, taskController.debugInternalTasks);
router.get('/debug/chachi-tasks', protect, taskController.debugChachiTasks);

// Get my tasks (tasks assigned to the current user)
router.get('/my-tasks', taskController.getMyTasks);

// Get tasks created by me
router.get('/created-by-me', taskController.getTasksCreatedByMe);

module.exports = router; 