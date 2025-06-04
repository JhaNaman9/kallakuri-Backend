const { validationResult } = require('express-validator');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * @desc    Get all staff members with filtering, sorting, and pagination
 * @route   GET /api/staff
 * @access  Private/Admin
 */
exports.getAllStaff = async (req, res, next) => {
  try {
    // Build query
    let query = {};
    
    // Filter by role if provided
    if (req.query.role) {
      query.role = req.query.role;
    }
    
    // Filter by active status if provided
    if (req.query.active !== undefined) {
      // Convert string to boolean
      query.active = req.query.active === 'true';
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await User.countDocuments(query);
    
    // Sorting
    let sortBy = {};
    if (req.query.sort) {
      // Convert sort string (e.g., 'name,-createdAt') to object
      const sortFields = req.query.sort.split(',');
      sortFields.forEach(field => {
        if (field.startsWith('-')) {
          sortBy[field.substr(1)] = -1;
        } else {
          sortBy[field] = 1;
        }
      });
    } else {
      // Default sort by createdAt descending
      sortBy = { createdAt: -1 };
    }
    
    // Execute query
    const staff = await User.find(query)
      .select('-password -passwordChangedAt -passwordResetToken -passwordResetExpires')
      .sort(sortBy)
      .skip(startIndex)
      .limit(limit);
    
    // Pagination result
    const pagination = {};
    
    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }
    
    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }
    
    // Return response
    res.status(200).json({
      success: true,
      count: staff.length,
      pagination,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: staff
    });
    
    // Log successful operation
    logger.info(`Admin ${req.user.id} retrieved staff list`);
  } catch (error) {
    logger.error(`Error in getAllStaff controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get a staff member by ID
 * @route   GET /api/staff/:id
 * @access  Private/Admin
 */
exports.getStaffById = async (req, res, next) => {
  try {
    const staff = await User.findById(req.params.id)
      .select('-password -passwordChangedAt -passwordResetToken -passwordResetExpires');
    
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: staff
    });
    
    // Log successful operation
    logger.info(`Admin ${req.user.id} retrieved staff member ${req.params.id}`);
  } catch (error) {
    logger.error(`Error in getStaffById controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Create a new staff member
 * @route   POST /api/staff
 * @access  Private/Admin
 */
exports.createStaff = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const { name, email, password, role } = req.body;
    
    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        error: 'Staff member with this email already exists'
      });
    }
    
    // Password strength validation
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long'
      });
    }
    
    // Password complexity check (at least one uppercase, one lowercase, one number, one special char)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        error: 'Password must include at least one uppercase letter, one lowercase letter, one number, and one special character'
      });
    }
    
    // Create new staff member
    const staff = await User.create({
      name,
      email,
      password,
      role
    });
    
    // Remove password from response
    staff.password = undefined;
    
    res.status(201).json({
      success: true,
      data: staff
    });
    
    // Log successful operation
    logger.info(`Admin ${req.user.id} created new staff member ${staff._id}`);
  } catch (error) {
    logger.error(`Error in createStaff controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Update a staff member
 * @route   PUT /api/staff/:id
 * @access  Private/Admin
 */
exports.updateStaff = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    // Destructure fields from request body
    const { name, email, role, active } = req.body;
    
    // Check if staff member exists
    const staff = await User.findById(req.params.id);
    
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }
    
    // Check if email already exists (if trying to update email)
    if (email && email !== staff.email) {
      const emailExists = await User.findOne({ email });
      
      if (emailExists) {
        return res.status(400).json({
          success: false,
          error: 'Email is already in use'
        });
      }
    }
    
    // Update fields
    if (name) staff.name = name;
    if (email) staff.email = email;
    if (role) staff.role = role;
    if (active !== undefined) staff.active = active;
    
    // Save updated staff member
    const updatedStaff = await staff.save();
    
    res.status(200).json({
      success: true,
      data: updatedStaff
    });
    
    // Log successful operation
    logger.info(`Admin ${req.user.id} updated staff member ${req.params.id}`);
  } catch (error) {
    logger.error(`Error in updateStaff controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Reset a staff member's password
 * @route   POST /api/staff/:id/reset-password
 * @access  Private/Admin
 */
exports.resetStaffPassword = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const { newPassword } = req.body;
    
    // Find staff member
    const staff = await User.findById(req.params.id);
    
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }
    
    // Password complexity check
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        error: 'Password must include at least one uppercase letter, one lowercase letter, one number, and one special character'
      });
    }
    
    // Update password
    staff.password = newPassword;
    
    // Reset login attempts and account lock if present
    staff.loginAttempts = 0;
    staff.accountLocked = false;
    staff.lockUntil = undefined;
    
    await staff.save();
    
    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
    
    // Log successful operation
    logger.info(`Admin ${req.user.id} reset password for staff member ${req.params.id}`);
  } catch (error) {
    logger.error(`Error in resetStaffPassword controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Toggle a staff member's active status
 * @route   PATCH /api/staff/:id/toggle-status
 * @access  Private/Admin
 */
exports.toggleStaffStatus = async (req, res, next) => {
  try {
    // Find staff member
    const staff = await User.findById(req.params.id);
    
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }
    
    // Toggle active status
    staff.active = !staff.active;
    
    // Save updated staff member
    const updatedStaff = await staff.save();
    
    // Provide appropriate message
    const statusMessage = staff.active 
      ? 'Staff member has been activated' 
      : 'Staff member has been deactivated';
    
    res.status(200).json({
      success: true,
      data: updatedStaff,
      message: statusMessage
    });
    
    // Log successful operation
    logger.info(`Admin ${req.user.id} toggled active status for staff member ${req.params.id} to ${staff.active}`);
  } catch (error) {
    logger.error(`Error in toggleStaffStatus controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Delete a staff member
 * @route   DELETE /api/staff/:id
 * @access  Private/Admin
 */
exports.deleteStaff = async (req, res, next) => {
  try {
    // Find staff member
    const staff = await User.findById(req.params.id);
    
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }
    
    // Prevent deletion of the last admin
    if (staff.role === 'Admin') {
      const adminCount = await User.countDocuments({ role: 'Admin' });
      
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete the last admin user'
        });
      }
    }
    
    // Delete staff member
    await staff.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Staff member deleted successfully'
    });
    
    // Log successful operation
    logger.info(`Admin ${req.user.id} deleted staff member ${req.params.id}`);
  } catch (error) {
    logger.error(`Error in deleteStaff controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get staff dashboard statistics
 * @route   GET /api/staff/dashboard/stats
 * @access  Private/Admin
 */
exports.getStaffStats = async (req, res, next) => {
  try {
    // Get total staff count
    const totalStaff = await User.countDocuments();
    
    // Get active staff count
    const activeStaff = await User.countDocuments({ active: true });
    
    // Get staff count by role
    const staffByRole = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Transform array to object
    const staffByRoleObj = {};
    staffByRole.forEach(item => {
      staffByRoleObj[item._id] = item.count;
    });
    
    // Get recently added staff
    const recentStaff = await User.find()
      .select('name email role createdAt')
      .sort({ createdAt: -1 })
      .limit(5);
    
    res.status(200).json({
      success: true,
      data: {
        totalStaff,
        activeStaff,
        inactiveStaff: totalStaff - activeStaff,
        staffByRole: staffByRoleObj,
        recentStaff
      }
    });
    
    // Log successful operation
    logger.info(`Admin ${req.user.id} retrieved staff statistics`);
  } catch (error) {
    logger.error(`Error in getStaffStats controller: ${error.message}`);
    next(error);
  }
}; 

/**
 * @desc    Get staff members by role
 * @route   GET /api/staff/by-role/:role
 * @access  Private
 */
exports.getStaffByRole = async (req, res, next) => {
  try {
    const { role } = req.params;
    
    // Validate role
    const validRoles = ['Admin', 'Marketing Staff', 'Mid-Level Manager', 'Godown Incharge', 'App Developer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role specified'
      });
    }
    
    // Find active staff with the specified role
    const staff = await User.find({ 
      role, 
      active: true 
    })
    .select('name email')
    .sort({ name: 1 });
    
    res.status(200).json({
      success: true,
      count: staff.length,
      data: staff
    });
    
    // Log successful operation
    logger.info(`User ${req.user.id} retrieved staff list by role: ${role}`);
  } catch (error) {
    logger.error(`Error in getStaffByRole controller: ${error.message}`);
    next(error);
  }
}; 