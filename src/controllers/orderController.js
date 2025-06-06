const { validationResult } = require('express-validator');
const Order = require('../models/Order');
const Distributor = require('../models/Distributor');
const StaffActivity = require('../models/StaffActivity');
const logger = require('../utils/logger');

/**
 * @desc    Create a new order request
 * @route   POST /api/orders
 * @access  Private (Marketing Staff)
 */
exports.createOrder = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { distributorId, items } = req.body;

    // Validate distributor ID
    const distributor = await Distributor.findById(distributorId);
    if (!distributor) {
      return res.status(404).json({
        success: false,
        error: 'Distributor not found'
      });
    }

    // Create order
    const order = await Order.create({
      distributorId,
      items,
      status: 'Requested',
      createdBy: req.user.id
    });

    // Log staff activity
    await StaffActivity.create({
      staffId: req.user.id,
      activityType: 'Order',
      details: `Created order request for ${distributor.name}`,
      status: 'Completed',
      relatedId: order._id,
      onModel: 'Order'
    });

    res.status(201).json({
      success: true,
      data: order
    });
  } catch (error) {
    logger.error(`Error in createOrder controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get all orders (with optional distributor filter)
 * @route   GET /api/orders
 * @access  Private (Mid-Level Manager, Marketing Staff)
 */
exports.getOrders = async (req, res, next) => {
  try {
    const { distributorId, status } = req.query;
    
    // Build query
    const query = {};
    
    if (distributorId) {
      query.distributorId = distributorId;
    }
    
    if (status) {
      query.status = status;
    }
    
    // For Marketing Staff, only show their own orders
    // For Admin or Mid-Level Manager, show all orders
    if (req.user.role === 'Marketing Staff') {
      query.createdBy = req.user.id;
    }
    // No additional filter for Admin or Mid-Level Manager, they see all orders

    // Get orders with distributor details
    const orders = await Order.find(query)
      .populate('distributorId', 'name contact address')
      .populate('createdBy', 'name')
      .populate('approvedBy', 'name')
      .populate('dispatchedBy', 'name')
      .sort({ createdAt: -1 });

    // If the user is not allowed to see any orders, return empty (should not occur with above logic)
    // If you want to restrict further, add here.

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    logger.error(`Error in getOrders controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get a single order
 * @route   GET /api/orders/:orderId
 * @access  Private
 */
exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('distributorId', 'name contact address')
      .populate('createdBy', 'name')
      .populate('approvedBy', 'name')
      .populate('dispatchedBy', 'name');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // For Marketing Staff, only allow viewing their own orders
    if (req.user.role === 'Marketing Staff' && order.createdBy._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this order'
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    logger.error(`Error in getOrder controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Approve or reject an order
 * @route   PATCH /api/orders/:orderId/approve
 * @access  Private (Mid-Level Manager)
 */
exports.approveOrder = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { status, comments } = req.body;
    
    // Validate status
    if (status !== 'Approved' && status !== 'Rejected') {
      return res.status(400).json({
        success: false,
        error: 'Status must be either Approved or Rejected'
      });
    }

    // Find order
    let order = await Order.findById(req.params.orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }
    
    // Check if order is already approved or rejected
    if (order.status !== 'Requested') {
      return res.status(400).json({
        success: false,
        error: `Order is already ${order.status}`
      });
    }

    // Update order
    order = await Order.findByIdAndUpdate(
      req.params.orderId,
      {
        status,
        comments,
        approvedBy: req.user.id
      },
      { new: true, runValidators: true }
    )
      .populate('distributorId', 'name contact address')
      .populate('createdBy', 'name')
      .populate('approvedBy', 'name');

    // Log staff activity
    await StaffActivity.create({
      staffId: req.user.id,
      activityType: 'Order',
      details: `${status} order for ${order.distributorId.name}`,
      status: 'Completed',
      relatedId: order._id,
      onModel: 'Order'
    });

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    logger.error(`Error in approveOrder controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Update order dispatch status
 * @route   PATCH /api/orders/:orderId/dispatch
 * @access  Private (Godown Incharge)
 */
exports.dispatchOrder = async (req, res, next) => {
  try {
    // Find order
    let order = await Order.findById(req.params.orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }
    
    // Check if order is approved
    if (order.status !== 'Approved') {
      return res.status(400).json({
        success: false,
        error: 'Only approved orders can be dispatched'
      });
    }

    // Update order
    order = await Order.findByIdAndUpdate(
      req.params.orderId,
      {
        status: 'Dispatched',
        dispatchedBy: req.user.id
      },
      { new: true, runValidators: true }
    )
      .populate('distributorId', 'name contact address')
      .populate('createdBy', 'name')
      .populate('approvedBy', 'name')
      .populate('dispatchedBy', 'name');

    // Log staff activity
    await StaffActivity.create({
      staffId: req.user.id,
      activityType: 'Order',
      details: `Dispatched order for ${order.distributorId.name}`,
      status: 'Completed',
      relatedId: order._id,
      onModel: 'Order'
    });

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    logger.error(`Error in dispatchOrder controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Track order status
 * @route   GET /api/orders/track/:orderId
 * @access  Private
 */
exports.trackOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('distributorId', 'name contact address')
      .populate('createdBy', 'name')
      .populate('approvedBy', 'name')
      .populate('dispatchedBy', 'name');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Get order timeline from staff activities
    const activities = await StaffActivity.find({
      relatedId: order._id,
      onModel: 'Order'
    })
      .populate('staffId', 'name')
      .sort({ date: 1 });

    // Create tracking object
    const tracking = {
      order,
      timeline: activities.map(activity => ({
        date: activity.date,
        action: activity.details,
        staff: activity.staffId.name,
        status: order.status
      }))
    };

    res.status(200).json({
      success: true,
      data: tracking
    });
  } catch (error) {
    logger.error(`Error in trackOrder controller: ${error.message}`);
    next(error);
  }
}; 