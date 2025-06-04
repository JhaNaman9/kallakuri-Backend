const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const config = require('../config/config');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Middleware to protect routes that require authentication
 */
exports.protect = async (req, res, next) => {
  try {
    let token;
    
    // Get token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.jwt) {
      // Also check for token in cookies for web clients
      token = req.cookies.jwt;
    }
    
    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'You are not logged in. Please log in to access this resource.',
        code: 'NO_TOKEN'
      });
    }
    
    try {
      // Verify token
      const decoded = await promisify(jwt.verify)(token, config.jwtSecret, {
        algorithms: ['HS256']
      });
      
      // Check if user still exists
      const user = await User.findById(decoded.id).select('+passwordChangedAt');
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'The user associated with this token no longer exists.',
          code: 'USER_NOT_FOUND'
        });
      }
      
      // Check if user changed password after the token was issued
      if (user.passwordChangedAt && decoded.iat < user.passwordChangedAt.getTime() / 1000) {
        return res.status(401).json({
          success: false,
          error: 'User recently changed password. Please log in again.',
          code: 'PASSWORD_CHANGED'
        });
      }
      
      // Check token expiration time
      const currentTime = Math.floor(Date.now() / 1000);
      const tokenExpiresIn = decoded.exp - currentTime;
      
      // If token expires in less than 24 hours, add warning headers
      if (tokenExpiresIn < 24 * 60 * 60) {
        res.set('X-Token-Expires-Soon', 'true');
        res.set('X-Token-Expires-In', tokenExpiresIn.toString());
        
        // If token expires in less than 30 minutes, force refresh
        if (tokenExpiresIn < 30 * 60) {
          return res.status(401).json({
            success: false,
            error: 'Token is about to expire.',
            code: 'TOKEN_EXPIRING',
            expiresIn: tokenExpiresIn
          });
        }
      }
      
      // Grant access to protected route
      req.user = user;
      next();
    } catch (error) {
      // Handle specific JWT errors
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          error: 'Invalid token. Please log in again.',
          code: 'INVALID_TOKEN'
        });
      } else if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Your token has expired. Please log in again.',
          code: 'TOKEN_EXPIRED'
        });
      }
      
      // Log unexpected errors
      logger.error(`JWT error: ${error.message}`);
      throw error;
    }
  } catch (error) {
    logger.error(`Auth middleware error: ${error.message}`);
    res.status(401).json({
      success: false,
      error: 'Not authorized to access this resource',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Middleware to restrict access based on user roles
 * @param  {...String} roles - Roles that are allowed to access the route
 */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // Check if req.user exists and has a role
    if (!req.user || !req.user.role) {
      logger.error('User or user role is undefined in restrictTo middleware');
      return res.status(401).json({
        success: false,
        error: 'User not authenticated or role not defined'
      });
    }

    // Case-insensitive check for 'admin' role
    if (req.user.role.toLowerCase() === 'admin') {
      // Admin users can access everything
      return next();
    }
    
    // For other roles, check if user role is in the allowed roles (case-sensitive)
    if (!roles.includes(req.user.role)) {
      logger.warn(`Unauthorized access attempt: User ${req.user.id} with role ${req.user.role} tried to access a route restricted to ${roles.join(', ')}`);
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};

/**
 * Check if a user is logged in but don't return error
 * Useful for conditional rendering on front-end
 */
exports.isLoggedIn = async (req, res, next) => {
  try {
    let token;
    
    // Get token from Authorization header or cookies
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    }
    
    // If no token, just continue without setting req.user
    if (!token) {
      return next();
    }
    
    // Verify token
    const decoded = await promisify(jwt.verify)(token, config.jwtSecret, {
      algorithms: ['HS256']
    });
    
    // Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return next();
    }
    
    // Set user on request object
    req.user = user;
    next();
  } catch (error) {
    // Proceed without setting req.user
    next();
  }
};