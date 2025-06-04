const { validationResult } = require('express-validator');
const SupplyEstimate = require('../models/SupplyEstimate');
const Distributor = require('../models/Distributor');
const User = require('../models/User');
const StaffActivity = require('../models/StaffActivity');
const logger = require('../utils/logger');

/**
 * @desc    Create a new supply estimate
 * @route   POST /api/supply-estimates
 * @access  Private (All Staff)
 */
exports.createSupplyEstimate = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { distributorId, brands, notes, estimateType } = req.body;

    // Check if distributor exists
    const distributor = await Distributor.findById(distributorId);
    if (!distributor) {
      return res.status(404).json({
        success: false,
        error: 'Distributor not found'
      });
    }

    // Calculate total items (number of sizes across all variants and brands)
    let totalItems = 0;
    if (brands && Array.isArray(brands)) {
      brands.forEach(brand => {
        if (brand.variants && Array.isArray(brand.variants)) {
          brand.variants.forEach(variant => {
            if (variant.sizes && Array.isArray(variant.sizes)) {
              totalItems += variant.sizes.length;
            }
          });
        }
      });
    }

    // Create supply estimate
    const supplyEstimate = await SupplyEstimate.create({
      distributorId,
      submittedBy: req.user.id,
      brands: brands || [],
      totalItems,
      notes,
      estimateType: estimateType || 'Initial',
      revisionHistory: []
    });

    // Log staff activity
    await StaffActivity.create({
      staffId: req.user.id,
      activityType: 'Supply Estimate',
      details: `Submitted ${estimateType || 'Initial'} supply estimate for distributor: ${distributor.name}`,
      status: 'Completed',
      relatedId: supplyEstimate._id,
      onModel: 'SupplyEstimate'
    });

    res.status(201).json({
      success: true,
      data: supplyEstimate
    });
    
    logger.info(`Staff ${req.user.id} submitted supply estimate for distributor ${distributorId}`);
  } catch (error) {
    logger.error(`Error in createSupplyEstimate controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get all supply estimates
 * @route   GET /api/supply-estimates
 * @access  Private (All Staff)
 */
exports.getAllSupplyEstimates = async (req, res, next) => {
  try {
    // Build query
    const query = {};
    
    // Filter by distributor
    if (req.query.distributorId) {
      query.distributorId = req.query.distributorId;
    }
    
    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    // For marketing staff and godown incharge, only show their own submissions
    if (['Marketing Staff', 'Godown Incharge'].includes(req.user.role)) {
      query.submittedBy = req.user.id;
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await SupplyEstimate.countDocuments(query);
    
    // Execute query
    const supplyEstimates = await SupplyEstimate.find(query)
      .populate('distributorId', 'name')
      .populate('submittedBy', 'name')
      .populate('revisedBy', 'name')
      .sort({ createdAt: -1 })
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
    
    res.status(200).json({
      success: true,
      count: supplyEstimates.length,
      pagination,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: supplyEstimates
    });
    
    logger.info(`Staff ${req.user.id} retrieved supply estimates list`);
  } catch (error) {
    logger.error(`Error in getAllSupplyEstimates controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get a supply estimate by ID
 * @route   GET /api/supply-estimates/:id
 * @access  Private (All Staff)
 */
exports.getSupplyEstimateById = async (req, res, next) => {
  try {
    const supplyEstimate = await SupplyEstimate.findById(req.params.id)
      .populate('distributorId', 'name contact address')
      .populate('submittedBy', 'name')
      .populate('revisedBy', 'name');
    
    if (!supplyEstimate) {
      return res.status(404).json({
        success: false,
        error: 'Supply estimate not found'
      });
    }
    
    // Check if user is allowed to view this estimate
    if (
      ['Marketing Staff', 'Godown Incharge'].includes(req.user.role) && 
      supplyEstimate.submittedBy._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this supply estimate'
      });
    }
    
    res.status(200).json({
      success: true,
      data: supplyEstimate
    });
    
    logger.info(`Staff ${req.user.id} viewed supply estimate ${req.params.id}`);
  } catch (error) {
    logger.error(`Error in getSupplyEstimateById controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Approve a supply estimate
 * @route   PATCH /api/supply-estimates/:id/approve
 * @access  Private (Admin, Mid-Level Manager)
 */
exports.approveSupplyEstimate = async (req, res, next) => {
  try {
    const { notes } = req.body;
    
    // Find estimate
    const supplyEstimate = await SupplyEstimate.findById(req.params.id);
    
    if (!supplyEstimate) {
      return res.status(404).json({
        success: false,
        error: 'Supply estimate not found'
      });
    }
    
    // Only allow approving pending estimates
    if (supplyEstimate.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        error: `Cannot approve an estimate that is already ${supplyEstimate.status.toLowerCase()}`
      });
    }
    
    // Update estimate
    supplyEstimate.status = 'Approved';
    supplyEstimate.revisedBy = req.user.id;
    supplyEstimate.revisionDate = Date.now();
    
    if (notes) {
      supplyEstimate.revisionNotes = notes;
    }
    
    await supplyEstimate.save();
    
    // Log staff activity
    await StaffActivity.create({
      staffId: req.user.id,
      activityType: 'Supply Estimate',
      details: `Approved supply estimate ID: ${supplyEstimate._id}`,
      status: 'Completed',
      relatedId: supplyEstimate._id,
      onModel: 'SupplyEstimate'
    });
    
    // Get the distributor and submitter details for the response
    const updatedEstimate = await SupplyEstimate.findById(req.params.id)
      .populate('distributorId', 'name')
      .populate('submittedBy', 'name')
      .populate('revisedBy', 'name');
    
    res.status(200).json({
      success: true,
      data: updatedEstimate,
      message: 'Supply estimate approved successfully'
    });
    
    logger.info(`Staff ${req.user.id} approved supply estimate ${req.params.id}`);
  } catch (error) {
    logger.error(`Error in approveSupplyEstimate controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Reject a supply estimate
 * @route   PATCH /api/supply-estimates/:id/reject
 * @access  Private (Admin, Mid-Level Manager)
 */
exports.rejectSupplyEstimate = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const { reason } = req.body;
    
    // Find estimate
    const supplyEstimate = await SupplyEstimate.findById(req.params.id);
    
    if (!supplyEstimate) {
      return res.status(404).json({
        success: false,
        error: 'Supply estimate not found'
      });
    }
    
    // Only allow rejecting pending estimates
    if (supplyEstimate.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        error: `Cannot reject an estimate that is already ${supplyEstimate.status.toLowerCase()}`
      });
    }
    
    // Update estimate
    supplyEstimate.status = 'Rejected';
    supplyEstimate.revisedBy = req.user.id;
    supplyEstimate.revisionDate = Date.now();
    supplyEstimate.revisionNotes = reason;
    
    await supplyEstimate.save();
    
    // Log staff activity
    await StaffActivity.create({
      staffId: req.user.id,
      activityType: 'Supply Estimate',
      details: `Rejected supply estimate ID: ${supplyEstimate._id}`,
      status: 'Completed',
      relatedId: supplyEstimate._id,
      onModel: 'SupplyEstimate'
    });
    
    // Get the distributor and submitter details for the response
    const updatedEstimate = await SupplyEstimate.findById(req.params.id)
      .populate('distributorId', 'name')
      .populate('submittedBy', 'name')
      .populate('revisedBy', 'name');
    
    res.status(200).json({
      success: true,
      data: updatedEstimate,
      message: 'Supply estimate rejected successfully'
    });
    
    logger.info(`Staff ${req.user.id} rejected supply estimate ${req.params.id}`);
  } catch (error) {
    logger.error(`Error in rejectSupplyEstimate controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get all estimates for a specific distributor
 * @route   GET /api/supply-estimates/distributor/:distributorId
 * @access  Private (All Staff)
 */
exports.getEstimatesByDistributorId = async (req, res, next) => {
  try {
    // Check if distributor exists
    const distributor = await Distributor.findById(req.params.distributorId);
    if (!distributor) {
      return res.status(404).json({
        success: false,
        error: 'Distributor not found'
      });
    }
    
    // Build query
    const query = { distributorId: req.params.distributorId };
    
    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    // For marketing staff and godown incharge, only show their own submissions
    if (['Marketing Staff', 'Godown Incharge'].includes(req.user.role)) {
      query.submittedBy = req.user.id;
    }
    
    // Get estimates
    const estimates = await SupplyEstimate.find(query)
      .populate('submittedBy', 'name')
      .populate('revisedBy', 'name')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: estimates.length,
      data: estimates
    });
    
    logger.info(`Staff ${req.user.id} retrieved supply estimates for distributor ${req.params.distributorId}`);
  } catch (error) {
    logger.error(`Error in getEstimatesByDistributorId controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get all estimates submitted by a specific staff member
 * @route   GET /api/supply-estimates/staff/:staffId
 * @access  Private (Admin, Mid-Level Manager)
 */
exports.getEstimatesByStaffId = async (req, res, next) => {
  try {
    // Check if staff exists
    const staff = await User.findById(req.params.staffId);
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }
    
    // Build query
    const query = { submittedBy: req.params.staffId };
    
    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    // Get estimates
    const estimates = await SupplyEstimate.find(query)
      .populate('distributorId', 'name')
      .populate('revisedBy', 'name')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: estimates.length,
      data: estimates
    });
    
    logger.info(`Staff ${req.user.id} retrieved supply estimates submitted by staff ${req.params.staffId}`);
  } catch (error) {
    logger.error(`Error in getEstimatesByStaffId controller: ${error.message}`);
    next(error);
  }
}; 