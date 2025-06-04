const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const config = require('../config/config');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Generate JWT token
 * @param {Object} user - User object
 * @returns {String} - JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id, 
      role: user.role,
      iat: Math.floor(Date.now() / 1000) // Issued at time
    },
    config.jwtSecret,
    { 
      expiresIn: parseInt(config.jwtExpiration, 10), // Convert to integer to ensure it's treated as seconds
      algorithm: 'HS256' // Specify algorithm for security
    }
  );
};

/**
 * Create and send JWT token with secure options
 * @param {Object} user - User object
 * @param {Number} statusCode - HTTP status code
 * @param {Object} res - Response object
 */
const createSendToken = async (user, statusCode, res) => {
  // Generate token
  const token = generateToken(user);
  
  // Remove password from output
  user.password = undefined;
  
  // Set token as HTTP-Only secure cookie in production
  if (config.nodeEnv === 'production') {
    const cookieOptions = {
      expires: new Date(Date.now() + config.jwtExpiration * 1000),
      httpOnly: true, // Cannot be accessed by browser JavaScript
      secure: true, // Only sent on HTTPS
      sameSite: 'strict' // Protection against CSRF
    };
    
    res.cookie('jwt', token, cookieOptions);
  }
  
  // Update user's last login time
  await User.findByIdAndUpdate(user._id, { 
    lastLogin: Date.now() 
  });
  
  // Send response with isSubAdmin and permissions if applicable
  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isSubAdmin: user.isSubAdmin || false,
      permissions: user.permissions || []
    }
  });
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public (Admin only in frontend)
 */
exports.register = async (req, res, next) => {
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
        error: 'User already exists'
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

    // Create new user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'Marketing Staff'
    });

    // Send token
    await createSendToken(user, 201, res);
    
    // Log successful registration
    logger.info(`New user registered: ${user.email} with role ${user.role}`);
  } catch (error) {
    logger.error(`Error in register controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Login a user
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, password, role } = req.body;

    // Check for email and password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email and password'
      });
    }

    // Build query conditions - include role if provided (for mobile app login)
    const queryConditions = { email };
    
    // If checking for admin login specifically (from admin panel)
    const isAdminPanelLogin = req.headers['x-admin-panel'] === 'true';
    
    if (isAdminPanelLogin) {
      // Only allow Admin or Sub Admin roles for admin panel login
      queryConditions.$or = [
        { role: 'Admin' },
        { isSubAdmin: true }
      ];
    } else if (role) {
      // For specific role requests (e.g. mobile app)
      queryConditions.role = role;
    }

    // Find user and include password and account lock fields
    const user = await User.findOne(queryConditions)
      .select('+password +accountLocked +lockUntil +loginAttempts');
    
    // If no user found, return generic error (to prevent user enumeration)
    if (!user) {
      let errorMessage = 'Invalid credentials';
      // Provide more specific message for role mismatch if role was specified
      if (role) {
        // Check if user exists with that email but different role
        const userExists = await User.findOne({ email });
        if (userExists) {
          errorMessage = `No user with role '${role}' found for this email`;
        }
      } else if (isAdminPanelLogin) {
        // For admin panel logins that fail
        errorMessage = 'You do not have permission to access the admin panel';
      }
      
      logger.warn(`Failed login attempt for ${email}${role ? ' with role ' + role : ''}`);
      return res.status(401).json({
        success: false,
        error: errorMessage
      });
    }
    
    // Check if account is locked
    if (user.accountLocked && user.lockUntil > Date.now()) {
      const remainingTimeMinutes = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
      return res.status(401).json({
        success: false,
        error: `Account is temporarily locked. Please try again in ${remainingTimeMinutes} minutes.`
      });
    }
    
    // Reset account lock if lockUntil time has passed
    if (user.accountLocked && user.lockUntil <= Date.now()) {
      user.accountLocked = false;
      user.loginAttempts = 0;
      await user.save();
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      // Handle failed login attempt
      await user.handleFailedLogin();
      
      logger.warn(`Failed login attempt for user: ${email}`);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();
    
    // Send token
    await createSendToken(user, 200, res);
    
    // Log successful login
    logger.info(`User logged in: ${user.email} with role ${user.role}`);
  } catch (error) {
    logger.error(`Error in login controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get current user
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin,
        isSubAdmin: user.isSubAdmin || false,
        permissions: user.permissions || []
      }
    });
  } catch (error) {
    logger.error(`Error in getMe controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Update password
 * @route   PATCH /api/auth/update-password
 * @access  Private
 */
exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Validate request body
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Please provide current password and new password'
      });
    }
    
    // Get user with password
    const user = await User.findById(req.user.id).select('+password');
    
    // Check if current password is correct
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }
    
    // Password strength validation
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long'
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
    user.password = newPassword;
    await user.save();
    
    // Send token
    await createSendToken(user, 200, res);
    
    logger.info(`Password updated for user: ${user.email}`);
  } catch (error) {
    logger.error(`Error in updatePassword controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Logout user
 * @route   GET /api/auth/logout
 * @access  Private
 */
exports.logout = (req, res) => {
  // Clear JWT cookie if it exists
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

/**
 * @desc    Create a sub-admin user with specified permissions
 * @route   POST /api/auth/create-sub-admin
 * @access  Private (Admin only)
 */
exports.createSubAdmin = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name, email, password, permissions } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        error: 'User already exists'
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

    // Validate permissions
    const validPermissions = [
      'dashboard', 'staff', 'marketing', 'orders', 'damage', 
      'tasks', 'distributors', 'godown', 'sales', 'reports'
    ];
    
    if (permissions && !permissions.every(perm => validPermissions.includes(perm))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid permission(s) specified'
      });
    }

    // Create new sub-admin user
    const user = await User.create({
      name,
      email,
      password,
      role: 'Sub Admin',
      isSubAdmin: true,
      permissions: permissions || [],
      createdBy: req.user.id
    });

    // Remove sensitive fields
    user.password = undefined;

    res.status(201).json({
      success: true,
      data: user
    });
    
    // Log sub-admin creation
    logger.info(`New sub-admin created: ${user.email} by admin ${req.user.id}`);
  } catch (error) {
    logger.error(`Error in createSubAdmin controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get all sub-admins
 * @route   GET /api/auth/sub-admins
 * @access  Private (Admin only)
 */
exports.getSubAdmins = async (req, res, next) => {
  try {
    const subAdmins = await User.find({ isSubAdmin: true })
      .select('-password')
      .populate('createdBy', 'name email');

    res.status(200).json({
      success: true,
      count: subAdmins.length,
      data: subAdmins
    });
  } catch (error) {
    logger.error(`Error in getSubAdmins controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get a single sub-admin
 * @route   GET /api/auth/sub-admins/:id
 * @access  Private (Admin only)
 */
exports.getSubAdmin = async (req, res, next) => {
  try {
    const subAdmin = await User.findOne({ 
      _id: req.params.id,
      isSubAdmin: true
    })
    .select('-password')
    .populate('createdBy', 'name email');

    if (!subAdmin) {
      return res.status(404).json({
        success: false,
        error: 'Sub-admin not found'
      });
    }

    res.status(200).json({
      success: true,
      data: subAdmin
    });
  } catch (error) {
    logger.error(`Error in getSubAdmin controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Update a sub-admin
 * @route   PUT /api/auth/sub-admins/:id
 * @access  Private (Admin only)
 */
exports.updateSubAdmin = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name, email, permissions } = req.body;

    // Validate permissions
    const validPermissions = [
      'dashboard', 'staff', 'marketing', 'orders', 'damage', 
      'tasks', 'distributors', 'godown', 'sales', 'reports'
    ];
    
    if (permissions && !permissions.every(perm => validPermissions.includes(perm))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid permission(s) specified'
      });
    }

    // Find sub-admin
    let subAdmin = await User.findOne({
      _id: req.params.id,
      isSubAdmin: true
    });

    if (!subAdmin) {
      return res.status(404).json({
        success: false,
        error: 'Sub-admin not found'
      });
    }

    // Check if email is changed and new email already exists
    if (email && email !== subAdmin.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          error: 'Email already in use'
        });
      }
    }

    // Update sub-admin
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (permissions) updateData.permissions = permissions;

    subAdmin = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      data: subAdmin
    });
    
    logger.info(`Sub-admin updated: ${subAdmin._id} by admin ${req.user.id}`);
  } catch (error) {
    logger.error(`Error in updateSubAdmin controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Delete a sub-admin
 * @route   DELETE /api/auth/sub-admins/:id
 * @access  Private (Admin only)
 */
exports.deleteSubAdmin = async (req, res, next) => {
  try {
    // Find sub-admin
    const subAdmin = await User.findOne({
      _id: req.params.id,
      isSubAdmin: true
    });

    if (!subAdmin) {
      return res.status(404).json({
        success: false,
        error: 'Sub-admin not found'
      });
    }

    // Delete sub-admin
    await subAdmin.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
    
    logger.info(`Sub-admin deleted: ${req.params.id} by admin ${req.user.id}`);
  } catch (error) {
    logger.error(`Error in deleteSubAdmin controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Refresh JWT token
 * @route   POST /api/auth/refresh-token
 * @access  Private
 */
exports.refreshToken = async (req, res, next) => {
  try {
    // Token validation is already done in protect middleware
    // So if we reach here, the token was valid (but might be close to expiry)
    
    // Get user from db to ensure it still exists and is active
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Generate a new token
    const token = generateToken(user);
    
    // Set token as HTTP-Only secure cookie in production
    if (config.nodeEnv === 'production') {
      const cookieOptions = {
        expires: new Date(Date.now() + config.jwtExpiration * 1000),
        httpOnly: true,
        secure: true,
        sameSite: 'strict'
      };
      
      res.cookie('jwt', token, cookieOptions);
    }
    
    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      token
    });
  } catch (error) {
    logger.error(`Error in refreshToken controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get all users for tasks assignment
 * @route   GET /api/auth/all-users
 * @access  Private
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('_id name email role');
    
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    logger.error(`Error in getAllUsers controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get users by role
 * @route   GET /api/auth/users-by-role/:role
 * @access  Private
 */
exports.getUsersByRole = async (req, res, next) => {
  try {
    const { role } = req.params;
    
    if (!role) {
      return res.status(400).json({
        success: false,
        error: 'Role is required'
      });
    }
    
    // Find users with the specified role
    const users = await User.find({ role })
      .select('name email role');
    
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    logger.error(`Error in getUsersByRole controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Debug endpoint to check all users and their roles
 * @route   GET /api/auth/debug/users
 * @access  Private
 */
exports.debugUsers = async (req, res, next) => {
  try {
    // Get all users
    const users = await User.find({}).select('name email role');
    
    // Count users by role
    const usersByRole = {};
    users.forEach(user => {
      const role = user.role;
      usersByRole[role] = (usersByRole[role] || 0) + 1;
    });
    
    // Find the marketing staff user named Chachi
    const chachiUser = users.find(u => u.name.toLowerCase().includes('chachi'));
    
    res.status(200).json({
      success: true,
      count: users.length,
      usersByRole,
      users: users.map(u => ({
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        isChachi: chachiUser && u._id.toString() === chachiUser._id.toString()
      })),
      chachiUser: chachiUser || null
    });
  } catch (error) {
    logger.error(`Error in debugUsers controller: ${error.message}`);
    next(error);
  }
}; 