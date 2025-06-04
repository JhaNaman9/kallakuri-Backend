const { validationResult } = require('express-validator');
const MarketingStaffActivity = require('../models/MarketingStaffActivity');
const User = require('../models/User');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

/**
 * @desc    Create a marketing staff activity with punch-in
 * @route   POST /api/mobile/marketing-activity/punch-in
 * @access  Private (Marketing Staff)
 */
exports.punchIn = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    // Check if user already has an active punch-in
    const existingActivity = await MarketingStaffActivity.findOne({
      marketingStaffId: req.user.id,
      status: 'Punched In',
      meetingEndTime: null
    });

    if (existingActivity) {
      return res.status(400).json({
        success: false,
        error: 'You are already punched in at another location. Please punch out first.'
      });
    }

    const {
      retailShop,
      distributor,
      areaName,
      tripCompanion,
      modeOfTransport,
      selfieImage,
      shopTypes,
      shops,
      brandSupplyEstimates,
      salesOrders
    } = req.body;

    // Store the selfie image
    let selfieImagePath = '';
    if (selfieImage) {
      // Extract base64 data
      const base64Data = selfieImage.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(__dirname, '../../uploads/selfies');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      // Create unique filename
      const filename = `selfie_${req.user.id}_${Date.now()}.jpg`;
      const filePath = path.join(uploadsDir, filename);
      
      // Write file
      fs.writeFileSync(filePath, buffer);
      
      // Store relative path
      selfieImagePath = `/uploads/selfies/${filename}`;
    }

    // Create marketing staff activity
    const activityData = {
      marketingStaffId: req.user.id,
      retailShop,
      distributor,
      areaName,
      tripCompanion,
      modeOfTransport,
      meetingStartTime: new Date(),
      selfieImage: selfieImagePath || selfieImage,
      shopTypes,
      shops: shops || [],
      status: 'Punched In',
      salesOrders: salesOrders || []
    };

    // Process and clean up the brand supply estimates
    if (brandSupplyEstimates && brandSupplyEstimates.length > 0) {
      const processedBrandEstimates = brandSupplyEstimates.map(brand => {
        const brandData = {
          name: brand.name,
          variants: []
        };
        
        // Add _id if it exists and is not an empty string
        if (brand._id && brand._id.trim && brand._id.trim() !== '') {
          try {
            brandData._id = new mongoose.Types.ObjectId(brand._id);
          } catch (e) {
            brandData._id = new mongoose.Types.ObjectId();
          }
        } else {
          brandData._id = new mongoose.Types.ObjectId();
        }
        
        if (brand.variants && Array.isArray(brand.variants)) {
          brandData.variants = brand.variants.map(variant => {
            const variantData = {
              name: variant.name || 'Unnamed Variant',
              sizes: []
            };
            
            if (variant._id && variant._id.trim && variant._id.trim() !== '') {
              try {
                variantData._id = new mongoose.Types.ObjectId(variant._id);
              } catch (e) {
                variantData._id = new mongoose.Types.ObjectId();
              }
            } else {
              variantData._id = new mongoose.Types.ObjectId();
            }
            
            if (variant.sizes && Array.isArray(variant.sizes)) {
              variantData.sizes = variant.sizes.map(size => ({
                name: size.name || 'Unnamed Size',
                openingStock: size.openingStock || 0,
                proposedMarketRate: size.proposedMarketRate || 0,
                _id: new mongoose.Types.ObjectId()
              }));
            }
            
            return variantData;
          });
        }
        
        return brandData;
      });
      
      activityData.brandSupplyEstimates = processedBrandEstimates;
    }

    const activity = await MarketingStaffActivity.create(activityData);

    res.status(201).json({
      success: true,
      data: activity
    });
  } catch (error) {
    logger.error(`Error in punchIn controller: ${error.message}`);
    res.status(400).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * @desc    Punch out - update existing activity
 * @route   PATCH /api/mobile/marketing-activity/:id/punch-out 
 * @access  Private (Marketing Staff)
 */
exports.punchOut = async (req, res, next) => {
  try {
    const { distributorId } = req.body;

    if (!distributorId) {
      return res.status(400).json({
        success: false,
        error: 'Distributor ID is required for punch out'
      });
    }

    // Find the active punch-in activity for this marketing staff
    const activity = await MarketingStaffActivity.findOne({
      _id: req.params.id,
      marketingStaffId: req.user.id,
      status: 'Punched In',
      meetingEndTime: null
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'No active punch-in found'
      });
    }

    // Check if already punched out
    if (activity.status === 'Punched Out') {
      return res.status(400).json({
        success: false,
        error: 'Already punched out for this activity'
      });
    }

    // Update with punch out time and additional data
    activity.meetingEndTime = new Date();
    activity.status = 'Punched Out';
    activity.distributorId = distributorId;

    // Calculate duration
    const durationMs = new Date(activity.meetingEndTime) - new Date(activity.meetingStartTime);
    activity.durationMinutes = Math.floor(durationMs / 60000);

    await activity.save();

    res.status(200).json({
      success: true,
      data: activity
    });
  } catch (error) {
    logger.error(`Error in punchOut controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get all marketing staff activities
 * @route   GET /api/marketing-activity
 * @access  Private (Admin, Mid-Level Manager)
 */
exports.getMarketingActivities = async (req, res, next) => {
  try {
    const { staffId, fromDate, toDate, status, distributor, page = 1, limit = 10 } = req.query;
    
    // Build query
    const query = {};
    
    if (staffId) {
      query.marketingStaffId = staffId;
    }
    
    if (fromDate || toDate) {
      query.createdAt = {};
      
      if (fromDate) {
        const startDate = new Date(fromDate);
        startDate.setHours(0, 0, 0, 0);
        query.createdAt.$gte = startDate;
      }
      
      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDate;
      }
    }
    
    if (status) {
      query.status = status;
    }
    
    if (distributor) {
      query.distributor = { $regex: new RegExp(distributor, 'i') };
    }
    
    // Parse pagination parameters
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    
    // Get total count for pagination
    const totalCount = await MarketingStaffActivity.countDocuments(query);
    
    // Get activities with pagination
    const activities = await MarketingStaffActivity.find(query)
      .populate('marketingStaffId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Prepare pagination info
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.status(200).json({
      success: true,
      count: totalCount,
      data: activities,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages,
        totalItems: totalCount,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error) {
    logger.error(`Error in getMarketingActivities controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get a single marketing staff activity
 * @route   GET /api/marketing-activity/:id
 * @access  Private (Admin, Mid-Level Manager, Marketing Staff)
 */
exports.getMarketingActivity = async (req, res, next) => {
  try {
    const activity = await MarketingStaffActivity.findById(req.params.id)
      .populate('marketingStaffId', 'name email role')
      .populate('distributorId', 'name shopName')
      .populate({
        path: 'shops',
        select: 'name ownerName address type',
        populate: {
          path: 'distributorId',
          select: 'name shopName'
        }
      })
      .populate('salesOrders');

    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found'
      });
    }

    // For Marketing Staff, only allow viewing own activities
    if (req.user.role === 'Marketing Staff' && 
        activity.marketingStaffId._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this activity'
      });
    }

    // Calculate additional metrics
    const activityObj = activity.toObject();
    
    // Calculate duration if activity has both start and end times
    if (activityObj.meetingStartTime && activityObj.meetingEndTime) {
      const durationMs = new Date(activityObj.meetingEndTime) - new Date(activityObj.meetingStartTime);
      const durationMinutes = Math.floor(durationMs / 60000);
      activityObj.durationMinutes = durationMinutes;
    }
    
    // Count shops visited and ensure they are populated
    if (activityObj.shops && activityObj.shops.length > 0) {
      activityObj.shopsVisitedCount = activityObj.shops.length;
      activityObj.shops = activityObj.shops.map(shop => ({
        ...shop,
        distributorName: shop.distributorId?.name || 'Unknown',
        salesOrders: activityObj.salesOrders?.filter(order => order.shopId?.toString() === shop._id?.toString()) || []
      }));
    }
    
    // Get other activities for the same staff on the same day
    const activityDate = new Date(activity.createdAt);
    const startOfDay = new Date(activityDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(activityDate.setHours(23, 59, 59, 999));
    
    const otherActivities = await MarketingStaffActivity.find({
      marketingStaffId: activity.marketingStaffId._id,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      _id: { $ne: activity._id }
    })
    .populate('distributorId', 'name')
    .select('distributorId');
    
    activityObj.otherDistributorsVisited = otherActivities.map(a => ({
      id: a.distributorId?._id,
      name: a.distributorId?.name || 'Unknown'
    }));

    res.status(200).json({
      success: true,
      data: activityObj
    });
  } catch (error) {
    console.error('Error in getMarketingActivity:', error);
    logger.error(`Error in getMarketingActivity controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get marketing staff activities by staff ID
 * @route   GET /api/mobile/marketing-activity/my-activities
 * @access  Private (Marketing Staff)
 */
exports.getMyActivities = async (req, res, next) => {
  try {
    const { date } = req.query;
    
    // Build query
    const query = { marketingStaffId: req.user.id };
    
    if (date) {
      const queryDate = new Date(date);
      const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));
      
      query.createdAt = { $gte: startOfDay, $lte: endOfDay };
    }
    
    // Get activities with full details
    const activities = await MarketingStaffActivity.find(query)
      .populate('marketingStaffId', 'name email')
      .populate('initialSupplyEstimate')
      .populate('proposedMarketRate')
      .sort({ createdAt: -1 });

    // Calculate additional metrics if needed
    const enhancedActivities = activities.map(activity => {
      const activityObj = activity.toObject();
      
      // Calculate duration if activity has both start and end times
      if (activityObj.meetingStartTime && activityObj.meetingEndTime) {
        const durationMs = new Date(activityObj.meetingEndTime) - new Date(activityObj.meetingStartTime);
        const durationMinutes = Math.floor(durationMs / 60000);
        activityObj.durationMinutes = durationMinutes;
      }
      
      // Count shops visited
      if (activityObj.shops && activityObj.shops.length > 0) {
        activityObj.shopsVisitedCount = activityObj.shops.length;
      }
      
      return activityObj;
    });

    res.status(200).json({
      success: true,
      count: enhancedActivities.length,
      data: enhancedActivities
    });
  } catch (error) {
    logger.error(`Error in getMyActivities controller: ${error.message}`);
    next(error);
  }
};