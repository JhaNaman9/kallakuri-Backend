const { validationResult } = require('express-validator');
const DamageClaim = require('../models/DamageClaim');
const Distributor = require('../models/Distributor');
const StaffActivity = require('../models/StaffActivity');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');
const { uploadImage } = require('../utils/imageUpload');

/**
 * @desc    Create a new damage claim
 * @route   POST /api/damage-claims
 * @access  Private
 */
exports.createDamageClaim = async (req, res, next) => {
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
      distributorId, 
      distributorName,
      brand,
      variant, 
      size, 
      pieces,
      manufacturingDate, 
      batchDetails, 
      damageType,
      reason
    } = req.body;

    // Find distributor to verify it exists
    const distributor = await Distributor.findById(distributorId);
    if (!distributor) {
      return res.status(404).json({
        success: false,
        error: 'Distributor not found'
      });
    }

    // Create damage claim object
    const damageClaimData = {
      distributorId,
      distributorName: distributorName || distributor.name,
      brand,
      variant,
      size,
      pieces,
      manufacturingDate,
      batchDetails,
      damageType,
      reason,
      createdBy: req.user.id,
      images: []
    };

    // Handle image upload if present
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const imagePath = await uploadImage(file, 'damage-claims');
        damageClaimData.images.push(imagePath);
      }
    } else if (req.body.images && Array.isArray(req.body.images)) {
      // Handle image URLs passed in the request body
      damageClaimData.images = req.body.images;
    }

    // Create the damage claim
    const damageClaim = await DamageClaim.create(damageClaimData);

    // Populate references for response
    const populatedClaim = await DamageClaim.findById(damageClaim._id)
      .populate('distributorId', 'name contact address')
      .populate('createdBy', 'name role');

    res.status(201).json({
      success: true,
      data: populatedClaim
    });
  } catch (error) {
    logger.error(`Error in createDamageClaim controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get all damage claims
 * @route   GET /api/damage-claims
 * @access  Private (Admin, MLM)
 */
exports.getAllDamageClaims = async (req, res, next) => {
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
    
    // For non-admin users, restrict to only the claims they created
    if (req.user.role !== 'Administrator' && req.user.role !== 'Admin' && req.user.role !== 'Mid-Level Manager') {
      query.createdBy = req.user.id;
    }

    // Get all damage claims with populated fields
    const damageClaims = await DamageClaim.find(query)
      .populate('distributorId', 'name contact address')
      .populate('createdBy', 'name role')
      .populate('approvedBy', 'name role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: damageClaims.length,
      data: damageClaims
    });
  } catch (error) {
    logger.error(`Error in getAllDamageClaims controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get a single damage claim
 * @route   GET /api/damage-claims/:id
 * @access  Private
 */
exports.getDamageClaim = async (req, res, next) => {
  try {
    const damageClaim = await DamageClaim.findById(req.params.id)
      .populate('distributorId', 'name contact address')
      .populate('createdBy', 'name role')
      .populate('approvedBy', 'name role');

    if (!damageClaim) {
      return res.status(404).json({
        success: false,
        error: 'Damage claim not found'
      });
    }

    // Check if user is allowed to view this claim
    const isAdmin = req.user.role === 'Administrator' || req.user.role === 'Admin';
    const isMLM = req.user.role === 'Mid-Level Manager';
    const isCreator = damageClaim.createdBy._id.toString() === req.user.id;
    
    if (!isAdmin && !isMLM && !isCreator) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this damage claim'
      });
    }

    res.status(200).json({
      success: true,
      data: damageClaim
    });
  } catch (error) {
    logger.error(`Error in getDamageClaim controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Update damage claim status (approve/reject)
 * @route   PATCH /api/damage-claims/:id
 * @access  Private (Admin, MLM)
 */
exports.updateDamageClaimStatus = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { status, approvedPieces, comment } = req.body;

    // Validate status
    if (!['Approved', 'Partially Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Status must be Approved, Partially Approved, or Rejected'
      });
    }
    
    // Find damage claim
    let damageClaim = await DamageClaim.findById(req.params.id);
    
    if (!damageClaim) {
      return res.status(404).json({
        success: false,
        error: 'Damage claim not found'
      });
    }
    
    // Check if user is authorized to update status
    if (req.user.role !== 'Administrator' && req.user.role !== 'Admin' && req.user.role !== 'Mid-Level Manager') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update damage claim status'
      });
    }
    
    // Validate approvedPieces for Partially Approved status
    if (status === 'Partially Approved') {
      if (!approvedPieces || approvedPieces <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Approved pieces must be greater than 0 for Partially Approved status'
        });
      }
      
      if (approvedPieces >= damageClaim.pieces) {
        return res.status(400).json({
          success: false,
          error: 'For partial approval, approved pieces must be less than total pieces'
        });
      }
    }
    
    // Generate tracking ID for approved or partially approved claims
    let trackingId = null;
    if (status === 'Approved' || status === 'Partially Approved') {
      const datePrefix = new Date().toISOString().slice(2, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      trackingId = `DMG${datePrefix}${randomSuffix}`;
      console.log(`Generated tracking ID: ${trackingId} for claim ${req.params.id}`);
    }
    
    // Update damage claim
    const updateData = {
      status,
      approvedBy: req.user.id,
      comment: comment || '',
      approvedDate: new Date()
    };
    
    // Add approvedPieces for Approved and Partially Approved status
    if (status === 'Approved') {
      updateData.approvedPieces = damageClaim.pieces;
    } else if (status === 'Partially Approved') {
      updateData.approvedPieces = approvedPieces;
    }
    
    // Add tracking ID if generated
    if (trackingId) {
      updateData.trackingId = trackingId;
    }
    
    // Update the damage claim
    damageClaim = await DamageClaim.findByIdAndUpdate(
      req.params.id, 
      updateData,
      { new: true, runValidators: true }
    )
      .populate('distributorId', 'name contact address')
      .populate('createdBy', 'name role')
      .populate('approvedBy', 'name role');

    // Log staff activity
    const actionText = status === 'Approved' 
      ? 'Approved' 
      : (status === 'Partially Approved' ? 'Partially approved' : 'Rejected');
    
    await StaffActivity.create({
      staffId: req.user.id,
      activityType: 'Damage Claim',
      details: `${actionText} damage claim for ${damageClaim.distributorName}: ${damageClaim.brand} ${damageClaim.variant}`,
      status: 'Completed',
      relatedId: damageClaim._id,
      onModel: 'DamageClaim'
    });

    res.status(200).json({
      success: true,
      data: damageClaim
    });
  } catch (error) {
    logger.error(`Error in updateDamageClaimStatus controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get damage claims by user
 * @route   GET /api/damage-claims/user
 * @access  Private
 */
exports.getUserDamageClaims = async (req, res, next) => {
  try {
    const { status } = req.query;
    
    // Build query
    const query = { createdBy: req.user.id };
    
    if (status) {
      query.status = status;
    }
    
    // Get user's damage claims
    const damageClaims = await DamageClaim.find(query)
      .populate('distributorId', 'name contact address')
      .populate('createdBy', 'name role')
      .populate('approvedBy', 'name role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: damageClaims.length,
      data: damageClaims
    });
  } catch (error) {
    logger.error(`Error in getUserDamageClaims controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get all distributors for damage claim form
 * @route   GET /api/damage-claims/distributors
 * @access  Private
 */
exports.getAllDistributors = async (req, res, next) => {
  try {
    // Get all distributors
    const distributors = await Distributor.find({})
      .select('_id name contact address')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: distributors.length,
      data: distributors
    });
  } catch (error) {
    logger.error(`Error in getAllDistributors controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Add MLM comment to a damage claim
 * @route   PATCH /api/damage-claims/:claimId/mlm-comment
 * @access  Private (Mid-Level Manager)
 */
exports.addMLMComment = async (req, res, next) => {
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

    // Find damage claim
    let damageClaim = await DamageClaim.findById(req.params.claimId)
      .populate('distributorId', 'name');
    
    if (!damageClaim) {
      return res.status(404).json({
        success: false,
        error: 'Damage claim not found'
      });
    }
    
    // Check if claim is in the correct state
    if (damageClaim.status !== 'Pending' && damageClaim.status !== 'Commented') {
      return res.status(400).json({
        success: false,
        error: `Cannot add comment to a claim with status ${damageClaim.status}`
      });
    }

    // Update damage claim
    damageClaim = await DamageClaim.findByIdAndUpdate(
      req.params.claimId,
      {
        mlmComment: comment,
        status: 'Commented',
        mlmId: req.user.id
      },
      { new: true, runValidators: true }
    )
      .populate('distributorId', 'name contact address')
      .populate('createdBy', 'name role')
      .populate('mlmId', 'name role');

    // Log staff activity
    await StaffActivity.create({
      staffId: req.user.id,
      activityType: 'Damage Claim Comment',
      details: `Added comments to damage claim for ${damageClaim.distributorId.name}`,
      status: 'Completed',
      relatedId: damageClaim._id,
      onModel: 'DamageClaim'
    });

    res.status(200).json({
      success: true,
      data: damageClaim
    });
  } catch (error) {
    logger.error(`Error in addMLMComment controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Process damage claim (approve, partially approve, or reject)
 * @route   PATCH /api/damage-claims/:claimId/process
 * @access  Private (Admin)
 */
exports.processDamageClaim = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { status, adminComment, approvedPieces } = req.body;
    
    // Find damage claim
    let damageClaim = await DamageClaim.findById(req.params.claimId)
      .populate('distributorId', 'name');
    
    if (!damageClaim) {
      return res.status(404).json({
        success: false,
        error: 'Damage claim not found'
      });
    }
    
    // Validate the action based on status
    if (status !== 'Approved' && status !== 'Partially Approved' && status !== 'Rejected') {
      return res.status(400).json({
        success: false,
        error: 'Status must be Approved, Partially Approved, or Rejected'
      });
    }
    
    // If partially approved, approvedPieces must be provided and valid
    if (status === 'Partially Approved') {
      if (!approvedPieces || approvedPieces <= 0 || approvedPieces >= damageClaim.pieces) {
        return res.status(400).json({
          success: false,
          error: 'Approved pieces must be greater than zero and less than the damaged pieces'
        });
      }
    }
    
    // If approved, set approvedPieces to damagedPieces
    const finalApprovedPieces = status === 'Approved' 
      ? damageClaim.pieces 
      : (status === 'Partially Approved' ? approvedPieces : 0);
    
    // Generate tracking ID for approved or partially approved claims
    let trackingId = null;
    if (status === 'Approved' || status === 'Partially Approved') {
      const datePrefix = new Date().toISOString().slice(2, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      trackingId = `DMG${datePrefix}${randomSuffix}`;
      console.log(`Generated tracking ID: ${trackingId} for claim ${req.params.claimId}`);
    }
    
    // Update damage claim
    const updateData = {
      status,
      adminComment,
      adminId: req.user.id,
      approvedPieces: finalApprovedPieces
    };
    
    // Add tracking ID if generated
    if (trackingId) {
      updateData.trackingId = trackingId;
    }
    
    damageClaim = await DamageClaim.findByIdAndUpdate(
      req.params.claimId,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('distributorId', 'name contact address')
      .populate('createdBy', 'name role')
      .populate('mlmId', 'name role')
      .populate('adminId', 'name role');

    // Log staff activity
    const actionText = status === 'Approved' 
      ? 'Approved' 
      : (status === 'Partially Approved' ? 'Partially approved' : 'Rejected');
    
    await StaffActivity.create({
      staffId: req.user.id,
      activityType: 'Damage Claim',
      details: `${actionText} damage claim for ${damageClaim.distributorId.name}: ${damageClaim.brand} ${damageClaim.variant}`,
      status: 'Completed',
      relatedId: damageClaim._id,
      onModel: 'DamageClaim'
    });

    res.status(200).json({
      success: true,
      data: damageClaim
    });
  } catch (error) {
    logger.error(`Error in processDamageClaim controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get a damage claim by tracking ID
 * @route   GET /api/damage-claims/tracking/:trackingId
 * @access  Private (Godown Incharge, Admin)
 */
exports.getDamageClaimByTracking = async (req, res, next) => {
  try {
    const { trackingId } = req.params;
    
    // Verify user is Godown Incharge or Admin
    if (req.user.role !== 'Godown Incharge' && req.user.role !== 'Administrator' && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access tracking information'
      });
    }
    
    const damageClaim = await DamageClaim.findOne({ trackingId })
      .populate('distributorId', 'name contact address')
      .populate('createdBy', 'name role')
      .populate('mlmId', 'name role')
      .populate('adminId', 'name role');
    
    if (!damageClaim) {
      return res.status(404).json({
        success: false,
        error: 'Damage claim not found'
      });
    }
    
    // If user is not admin, check if the claim is approved or partially approved
    if (req.user.role === 'Godown Incharge' && 
        damageClaim.status !== 'Approved' && damageClaim.status !== 'Partially Approved') {
      return res.status(400).json({
        success: false,
        error: 'Damage claim is not approved for replacement'
      });
    }
    
    res.status(200).json({
      success: true,
      data: damageClaim
    });
  } catch (error) {
    logger.error(`Error in getDamageClaimByTracking controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Delete a damage claim
 * @route   DELETE /api/damage-claims/:id
 * @access  Private (Admin only)
 */
exports.deleteDamageClaim = async (req, res, next) => {
  try {
    // Find damage claim by ID
    const damageClaim = await DamageClaim.findById(req.params.id);
    
    if (!damageClaim) {
      return res.status(404).json({
        success: false,
        error: 'Damage claim not found'
      });
    }
    
    // Check if user is authorized to delete (Admin only)
    if (req.user.role !== 'Administrator' && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete damage claims'
      });
    }
    
    // Delete images from storage if needed (assuming images are stored locally or in cloud)
    // This step might be needed if you store images in a cloud service or local storage
    
    // Delete the damage claim
    await DamageClaim.findByIdAndDelete(req.params.id);
    
    // Log staff activity
    await StaffActivity.create({
      staffId: req.user.id,
      activityType: 'Damage Claim',
      details: `Deleted damage claim for ${damageClaim.distributorName}`,
      status: 'Completed',
      relatedId: damageClaim._id,
      onModel: 'DamageClaim'
    });
    
    res.status(200).json({
      success: true,
      message: 'Damage claim deleted successfully'
    });
  } catch (error) {
    logger.error(`Error in deleteDamageClaim controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get all damage claims for Godown Incharge
 * @route   GET /api/mobile/damage-claims/godown/all
 * @access  Private (Godown Incharge)
 */
exports.getGodownAllDamageClaims = async (req, res, next) => {
  try {
    // Verify user is Godown Incharge
    if (req.user.role !== 'Godown Incharge' && req.user.role !== 'Administrator' && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this resource'
      });
    }

    const { status, page = 1, limit = 10 } = req.query;
    
    // Build query
    const query = {};
    
    // Only show approved or partially approved claims for Godown Incharge
    if (status && ['Approved', 'Partially Approved', 'Pending', 'Rejected'].includes(status)) {
      query.status = status;
    }

    // Pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Count total documents for pagination
    const total = await DamageClaim.countDocuments(query);
    
    // Get damage claims with pagination
    const damageClaims = await DamageClaim.find(query)
      .populate('distributorId', 'name contact address')
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Return response with pagination info
    res.status(200).json({
      success: true,
      count: damageClaims.length,
      total,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        pageSize: limitNum,
        totalItems: total
      },
      data: damageClaims
    });
  } catch (error) {
    logger.error(`Error in getGodownAllDamageClaims controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get approved damage claims for Godown Incharge
 * @route   GET /api/mobile/damage-claims/godown/approved
 * @access  Private (Godown Incharge)
 */
exports.getGodownApprovedClaims = async (req, res, next) => {
  try {
    // Verify user is Godown Incharge
    if (req.user.role !== 'Godown Incharge' && req.user.role !== 'Administrator' && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this resource'
      });
    }
    
    // Query for approved or partially approved claims with tracking IDs
    const query = {
      status: { $in: ['Approved', 'Partially Approved'] },
      trackingId: { $exists: true, $ne: null }
    };
    
    // Get damage claims
    const damageClaims = await DamageClaim.find(query)
      .populate('distributorId', 'name contact address')
      .populate('createdBy', 'name role')
      .sort({ updatedAt: -1 });
    
    res.status(200).json({
      success: true,
      count: damageClaims.length,
      data: damageClaims
    });
  } catch (error) {
    logger.error(`Error in getGodownApprovedClaims controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get specific damage claim for Godown Incharge
 * @route   GET /api/mobile/damage-claims/godown/:id
 * @access  Private (Godown Incharge)
 */
exports.getGodownDamageClaimById = async (req, res, next) => {
  try {
    // Verify user is Godown Incharge
    if (req.user.role !== 'Godown Incharge' && req.user.role !== 'Administrator' && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this resource'
      });
    }
    
    const damageClaim = await DamageClaim.findById(req.params.id)
      .populate('distributorId', 'name contact address')
      .populate('createdBy', 'name role')
      .populate('mlmId', 'name role')
      .populate('adminId', 'name role');
    
    if (!damageClaim) {
      return res.status(404).json({
        success: false,
        error: 'Damage claim not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: damageClaim
    });
  } catch (error) {
    logger.error(`Error in getGodownDamageClaimById controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Create replacement for an approved damage claim
 * @route   POST /api/damage-claims/replacement
 * @access  Private (Godown Incharge)
 */
exports.createReplacement = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { trackingId, dispatchDate, approvedBy, channelledTo, referenceNumber } = req.body;

    // Find damage claim by tracking ID
    const damageClaim = await DamageClaim.findOne({ trackingId })
      .populate('distributorId', 'name contact address')
      .populate('createdBy', 'name role')
      .populate('approvedBy', 'name role');

    if (!damageClaim) {
      return res.status(404).json({
        success: false,
        error: 'Damage claim not found with this tracking ID'
      });
    }

    // Verify claim is approved or partially approved
    if (damageClaim.status !== 'Approved' && damageClaim.status !== 'Partially Approved') {
      return res.status(400).json({
        success: false,
        error: 'Only approved or partially approved claims can have replacements'
      });
    }

    // Update the claim with replacement details and status
    const updatedClaim = await DamageClaim.findByIdAndUpdate(
      damageClaim._id,
      {
        replacementDetails: {
          dispatchDate: new Date(dispatchDate),
          approvedBy,
          channelledTo,
          referenceNumber,
          processedBy: req.user.id,
          processedAt: new Date()
        },
        replacementStatus: 'Completed'
      },
      { new: true, runValidators: true }
    ).populate('distributorId', 'name contact address');

    // Log staff activity
    await StaffActivity.create({
      staffId: req.user.id,
      activityType: 'Damage Claim Replacement',
      details: `Processed replacement for damage claim ${trackingId} for ${damageClaim.distributorName}`,
      status: 'Completed',
      relatedId: damageClaim._id,
      onModel: 'DamageClaim'
    });

    res.status(200).json({
      success: true,
      data: updatedClaim
    });

  } catch (error) {
    logger.error(`Error in createReplacement controller: ${error.message}`);
    next(error);
  }
};