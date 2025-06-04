const { validationResult } = require('express-validator');
const SalesInquiry = require('../models/SalesInquiry');
const Distributor = require('../models/Distributor');
const StaffActivity = require('../models/StaffActivity');
const logger = require('../utils/logger');

/**
 * @desc    Create a new sales inquiry
 * @route   POST /api/sales-inquiries
 * @access  Private (Marketing Staff)
 */
exports.createSalesInquiry = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { distributorId, distributorName, products } = req.body;

    // Find distributor to verify it exists
    const distributor = await Distributor.findById(distributorId);
    if (!distributor) {
      return res.status(404).json({
        success: false,
        error: 'Distributor not found'
      });
    }

    // Validate products array
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one product is required'
      });
    }

    // Get shop name from distributor
    const shopName = distributor.shopName || '';

    // Create sales inquiry
    const salesInquiry = await SalesInquiry.create({
      distributorId,
      distributorName: distributorName || distributor.name,
      shopName,
      products,
      createdBy: req.user.id
    });

    // Populate references for response
    const populatedInquiry = await SalesInquiry.findById(salesInquiry._id)
      .populate('distributorId', 'name contact address shopName')
      .populate('createdBy', 'name role');

    // Log staff activity
    await StaffActivity.create({
      staffId: req.user.id,
      activityType: 'Inquiry',
      details: `Created new sales inquiry for ${distributorName || distributor.name} with ${products.length} product(s)`,
      status: 'Completed',
      relatedId: salesInquiry._id,
      onModel: 'SalesInquiry'
    });

    res.status(201).json({
      success: true,
      data: populatedInquiry
    });
  } catch (error) {
    logger.error(`Error in createSalesInquiry controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get all sales inquiries
 * @route   GET /api/sales-inquiries
 * @access  Private (All staff)
 */
exports.getAllSalesInquiries = async (req, res, next) => {
  try {
    const { status, distributorId } = req.query;
    
    // Build query based on filters
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (distributorId) {
      query.distributorId = distributorId;
    }
    
    // Get all sales inquiries with populated fields
    const salesInquiries = await SalesInquiry.find(query)
      .populate('distributorId', 'name contact address shopName')
      .populate('createdBy', 'name role')
      .populate('managerId', 'name role')
      .populate('processedBy', 'name role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: salesInquiries.length,
      data: salesInquiries
    });
  } catch (error) {
    logger.error(`Error in getAllSalesInquiries controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get a single sales inquiry
 * @route   GET /api/sales-inquiries/:id
 * @access  Private (All staff)
 */
exports.getSalesInquiry = async (req, res, next) => {
  try {
    const salesInquiry = await SalesInquiry.findById(req.params.id)
      .populate('distributorId', 'name contact address shopName')
      .populate('createdBy', 'name role')
      .populate('managerId', 'name role')
      .populate('processedBy', 'name role');

    if (!salesInquiry) {
      return res.status(404).json({
        success: false,
        error: 'Sales inquiry not found'
      });
    }

    res.status(200).json({
      success: true,
      data: salesInquiry
    });
  } catch (error) {
    logger.error(`Error in getSalesInquiry controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Update sales inquiry status
 * @route   PATCH /api/sales-inquiries/:id
 * @access  Private (Admin, MLM)
 */
exports.updateSalesInquiryStatus = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { status, notes } = req.body;

    // Validate status
    if (!['Processing', 'Completed', 'Rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Status must be Processing, Completed, or Rejected'
      });
    }
    
    // Find sales inquiry
    let salesInquiry = await SalesInquiry.findById(req.params.id);
    
    if (!salesInquiry) {
      return res.status(404).json({
        success: false,
        error: 'Sales inquiry not found'
      });
    }
    
    // Check if user is authorized to update status
    if (req.user.role !== 'Administrator' && req.user.role !== 'Admin' && req.user.role !== 'Mid-Level Manager') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update sales inquiry status'
      });
    }
    
    // Update sales inquiry
    salesInquiry = await SalesInquiry.findByIdAndUpdate(
      req.params.id, 
      {
        status,
        notes: notes || '',
        processedBy: req.user.id,
        processedDate: new Date()
      },
      { new: true, runValidators: true }
    )
      .populate('distributorId', 'name contact address')
      .populate('createdBy', 'name role')
      .populate('processedBy', 'name role');

    // Log staff activity
    await StaffActivity.create({
      staffId: req.user.id,
      activityType: 'Inquiry',
      details: `Updated sales inquiry status to ${status} for ${salesInquiry.distributorName}`,
      status: 'Completed',
      relatedId: salesInquiry._id,
      onModel: 'SalesInquiry'
    });

    res.status(200).json({
      success: true,
      data: salesInquiry
    });
  } catch (error) {
    logger.error(`Error in updateSalesInquiryStatus controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get sales inquiries by user
 * @route   GET /api/sales-inquiries/user
 * @access  Private (Marketing Staff)
 */
exports.getUserSalesInquiries = async (req, res, next) => {
  try {
    const { status } = req.query;
    
    // Build query
    const query = { createdBy: req.user.id };
    
    if (status) {
      query.status = status;
    }
    
    // Get user's sales inquiries
    const salesInquiries = await SalesInquiry.find(query)
      .populate('distributorId', 'name contact address shopName')
      .populate('createdBy', 'name role')
      .populate('managerId', 'name role')
      .populate('processedBy', 'name role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: salesInquiries.length,
      data: salesInquiries
    });
  } catch (error) {
    logger.error(`Error in getUserSalesInquiries controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Delete a sales inquiry
 * @route   DELETE /api/sales-inquiries/:id
 * @access  Private (Admin only)
 */
exports.deleteSalesInquiry = async (req, res, next) => {
  try {
    // Find sales inquiry by ID
    const salesInquiry = await SalesInquiry.findById(req.params.id);
    
    if (!salesInquiry) {
      return res.status(404).json({
        success: false,
        error: 'Sales inquiry not found'
      });
    }
    
    // Check if user is authorized to delete (Admin only)
    if (req.user.role !== 'Administrator' && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete sales inquiries'
      });
    }
    
    // Delete the sales inquiry
    await SalesInquiry.findByIdAndDelete(req.params.id);
    
    // Log staff activity
    await StaffActivity.create({
      staffId: req.user.id,
      activityType: 'Inquiry',
      details: `Deleted sales inquiry for ${salesInquiry.distributorName}`,
      status: 'Completed',
      relatedId: salesInquiry._id,
      onModel: 'SalesInquiry'
    });
    
    res.status(200).json({
      success: true,
      message: 'Sales inquiry deleted successfully'
    });
  } catch (error) {
    logger.error(`Error in deleteSalesInquiry controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Add manager comment to a sales inquiry
 * @route   PATCH /api/sales-inquiries/:id/comment
 * @access  Private (Mid-Level Manager)
 */
exports.addManagerComment = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { comment } = req.body;

    // Find the sales inquiry
    let salesInquiry = await SalesInquiry.findById(req.params.id);

    if (!salesInquiry) {
      return res.status(404).json({
        success: false,
        error: 'Sales inquiry not found'
      });
    }

    // Update the sales inquiry with the manager comment
    salesInquiry = await SalesInquiry.findByIdAndUpdate(
      req.params.id,
      {
        managerComment: comment,
        managerId: req.user.id,
        managerCommentDate: new Date(),
        status: 'Commented'
      },
      { new: true, runValidators: true }
    )
      .populate('distributorId', 'name contact address shopName')
      .populate('createdBy', 'name role')
      .populate('managerId', 'name role')
      .populate('processedBy', 'name role');
    
    // Log staff activity
    await StaffActivity.create({
      staffId: req.user.id,
      activityType: 'Inquiry',
      details: `Added comment to sales inquiry for ${salesInquiry.distributorName}`,
      status: 'Completed',
      relatedId: salesInquiry._id,
      onModel: 'SalesInquiry'
    });

    res.status(200).json({
      success: true,
      data: salesInquiry
    });
  } catch (error) {
    logger.error(`Error in addManagerComment controller: ${error.message}`);
    next(error);
  }
}; 