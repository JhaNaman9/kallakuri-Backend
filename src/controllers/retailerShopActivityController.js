const { validationResult } = require('express-validator');
const RetailerShopActivity = require('../models/RetailerShopActivity');
const Shop = require('../models/Shop');
const Distributor = require('../models/Distributor');
const User = require('../models/User');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

/**
 * @desc    Create or update retailer shop activity with all data
 * @route   POST /api/mobile/retailer-shop-activity
 * @access  Private (Marketing Staff)
 */
exports.createOrUpdateActivity = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      shopId,
      distributorId,
      isPunchedIn,
      salesOrders,
      alternateProviders,
      complaint,
      marketInsight,
      voiceNote,
      mobileNumber,
      status
    } = req.body;

    // First verify distributor exists
    const distributor = await Distributor.findById(distributorId);
    if (!distributor) {
      return res.status(404).json({
        success: false,
        error: 'Distributor not found'
      });
    }

    // Then verify shop exists and belongs to this distributor
    const shop = await Shop.findOne({ 
      _id: shopId,
      distributorId: distributorId,
      isActive: true
    });

    if (!shop) {
      // If not found in Shop collection, check legacy shops
      const isLegacyShop = distributor.retailShops.some(s => 
        s._id.toString() === shopId
      ) || distributor.wholesaleShops.some(s => 
        s._id.toString() === shopId
      );

      if (!isLegacyShop) {
        return res.status(404).json({
          success: false,
          error: 'Shop not found or does not belong to this distributor'
        });
      }
    }

    // Check for existing activity today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let activity = await RetailerShopActivity.findOne({
      shopId,
      marketingStaffId: req.user.id,
      createdAt: { $gte: today, $lt: tomorrow }
    });

    if (activity) {
      // Update existing activity
      if (isPunchedIn !== undefined) {
        activity.isPunchedIn = isPunchedIn;
        if (!isPunchedIn) {
          activity.punchOutTime = new Date();
          activity.status = 'Completed';
        }
      }

      // Only update fields if they are provided
      if (salesOrders && Array.isArray(salesOrders)) {
        activity.salesOrders = salesOrders;
      }
      if (alternateProviders && Array.isArray(alternateProviders)) {
        activity.alternateProviders = alternateProviders;
      }
      if (complaint !== undefined) activity.complaint = complaint;
      if (marketInsight !== undefined) activity.marketInsight = marketInsight;
      if (voiceNote) activity.voiceNote = voiceNote;
      if (mobileNumber) activity.mobileNumber = mobileNumber;
      if (status) activity.status = status;

      console.log('Updating existing activity:', {
        activityId: activity._id,
        shopId: activity.shopId,
        staffId: activity.marketingStaffId,
        status: activity.status,
        salesOrders: activity.salesOrders?.length || 0
      });
    } else {
      // Create new activity
      activity = new RetailerShopActivity({
        marketingStaffId: req.user.id,
        distributorId,
        shopId,
        isPunchedIn: isPunchedIn !== undefined ? isPunchedIn : true,
        punchInTime: new Date(),
        salesOrders: salesOrders || [],
        alternateProviders: alternateProviders || [],
        complaint,
        marketInsight,
        voiceNote,
        mobileNumber,
        status: status || 'In Progress'
      });

      console.log('Creating new activity:', {
        shopId: activity.shopId,
        staffId: activity.marketingStaffId,
        status: activity.status,
        salesOrders: activity.salesOrders?.length || 0
      });
    }

    // Save voice note if provided as base64
    if (req.body.voiceNoteBase64) {
      const voiceNoteDir = path.join(__dirname, '../../uploads/voice-notes');
      if (!fs.existsSync(voiceNoteDir)) {
        fs.mkdirSync(voiceNoteDir, { recursive: true });
      }

      const voiceNoteFile = `voice_${activity._id}_${Date.now()}.wav`;
      const voiceNotePath = path.join(voiceNoteDir, voiceNoteFile);
      
      fs.writeFileSync(voiceNotePath, Buffer.from(req.body.voiceNoteBase64, 'base64'));
      activity.voiceNote = `/uploads/voice-notes/${voiceNoteFile}`;
    }

    await activity.save();

    // Populate references for response
    const populatedActivity = await RetailerShopActivity.findById(activity._id)
      .populate('shopId', 'name ownerName address type')
      .populate('distributorId', 'name shopName address')
      .populate('marketingStaffId', 'name email')
      .lean();

    res.status(201).json({
      success: true,
      data: populatedActivity
    });
  } catch (error) {
    console.error('Error in createOrUpdateActivity:', error);
    logger.error(`Error in createOrUpdateActivity controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get all retailer shop activities for a marketing staff
 * @route   GET /api/mobile/retailer-shop-activity/my-activities
 * @access  Private (Marketing Staff)
 */
exports.getMyActivities = async (req, res, next) => {
  try {
    const { date, distributorId, shopId } = req.query;
    
    // Build query
    const query = { marketingStaffId: req.user.id };
    
    if (date) {
      const queryDate = new Date(date);
      const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));
      
      query.createdAt = { $gte: startOfDay, $lte: endOfDay };
    }
    
    if (distributorId) {
      query.distributorId = distributorId;
    }
    
    if (shopId) {
      query.shopId = shopId;
    }
    
    // Get activities with populated references
    const activities = await RetailerShopActivity.find(query)
      .populate('shopId', 'name ownerName address type')
      .populate('distributorId', 'name shopName address')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: activities.length,
      data: activities
    });
  } catch (error) {
    logger.error(`Error in getMyActivities controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get a specific retailer shop activity
 * @route   GET /api/mobile/retailer-shop-activity/:id
 * @access  Private (Marketing Staff)
 */
exports.getActivity = async (req, res, next) => {
  try {
    const activity = await RetailerShopActivity.findById(req.params.id)
      .populate('shopId', 'name ownerName address type')
      .populate('distributorId', 'name shopName address')
      .populate('marketingStaffId', 'name email')
      .populate('alternateProviders.mlmId', 'name');

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

    res.status(200).json({
      success: true,
      data: activity
    });
  } catch (error) {
    logger.error(`Error in getActivity controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get all retailer shop activities (for admin/manager)
 * @route   GET /api/retailer-shop-activity
 * @access  Private (Admin, Mid-Level Manager)
 */
exports.getAllActivities = async (req, res, next) => {
  try {
    const { staffId, distributorId, shopId, date, status } = req.query;
    
    // Build query
    const query = {};
    
    if (staffId) {
      query.marketingStaffId = staffId;
    }
    
    if (distributorId) {
      query.distributorId = distributorId;
    }
    
    if (shopId) {
      query.shopId = shopId;
    }
    
    if (date) {
      const queryDate = new Date(date);
      const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));
      
      query.createdAt = { $gte: startOfDay, $lte: endOfDay };
    }
    
    if (status) {
      query.status = status;
    }
    
    // Get activities with populated references
    const activities = await RetailerShopActivity.find(query)
      .populate('shopId', 'name ownerName address type')
      .populate('distributorId', 'name shopName address')
      .populate('marketingStaffId', 'name email')
      .populate('alternateProviders.mlmId', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: activities.length,
      data: activities
    });
  } catch (error) {
    logger.error(`Error in getAllActivities controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get retailer shop activities by distributor
 * @route   GET /api/retailer-shop-activity/distributor/:distributorId
 * @access  Private (Admin, Mid-Level Manager, Marketing Staff)
 */
exports.getActivitiesByDistributor = async (req, res, next) => {
  try {
    const { distributorId } = req.params;
    
    // Verify distributor exists
    const distributor = await Distributor.findById(distributorId);
    if (!distributor) {
      return res.status(404).json({
        success: false,
        error: 'Distributor not found'
      });
    }
    
    // Build query
    const query = { distributorId };
    
    // For Marketing Staff, only allow viewing own activities
    if (req.user.role === 'Marketing Staff') {
      query.marketingStaffId = req.user.id;
    }
    
    // Get activities with populated references
    const activities = await RetailerShopActivity.find(query)
      .populate('shopId', 'name ownerName address type')
      .populate('distributorId', 'name shopName address')
      .populate('marketingStaffId', 'name email')
      .populate('alternateProviders.mlmId', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: activities.length,
      data: activities
    });
  } catch (error) {
    logger.error(`Error in getActivitiesByDistributor controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get retailer shop activities by shop
 * @route   GET /api/retailer-shop-activity/shop/:shopId
 * @access  Private (Admin, Mid-Level Manager, Marketing Staff)
 */
exports.getActivitiesByShop = async (req, res, next) => {
  try {
    const { shopId } = req.params;
    
    // Verify shop exists
    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({
        success: false,
        error: 'Shop not found'
      });
    }
    
    // Build query
    const query = { shopId };
    
    // For Marketing Staff, only allow viewing own activities
    if (req.user.role === 'Marketing Staff') {
      query.marketingStaffId = req.user.id;
    }
    
    // Get activities with populated references
    const activities = await RetailerShopActivity.find(query)
      .populate('shopId', 'name ownerName address type')
      .populate('distributorId', 'name shopName address')
      .populate('marketingStaffId', 'name email')
      .populate('alternateProviders.mlmId', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: activities.length,
      data: activities
    });
  } catch (error) {
    logger.error(`Error in getActivitiesByShop controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get alternate providers with insights
 * @route   GET /api/retailer-shop-activity/alternate-providers
 * @access  Private (Admin & Mid-Level Manager)
 */
exports.getAlternateProviders = async (req, res, next) => {
  try {
    const { distributorId, dateFrom, dateTo, brandName } = req.query;
    
    // Build base query to find activities with alternate providers
    let matchQuery = {
      'alternateProviders': { $exists: true, $ne: [] }
    };
    
    // Add filters if provided
    if (distributorId) {
      matchQuery.distributorId = mongoose.Types.ObjectId(distributorId);
    }
    
    if (dateFrom || dateTo) {
      matchQuery.createdAt = {};
      
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        matchQuery.createdAt.$gte = fromDate;
      }
      
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        matchQuery.createdAt.$lte = toDate;
      }
    }
    
    // Build aggregate pipeline
    const pipeline = [
      { $match: matchQuery },
      { $unwind: '$alternateProviders' },
      {
        $lookup: {
          from: 'distributors',
          localField: 'distributorId',
          foreignField: '_id',
          as: 'distributor'
        }
      },
      {
        $lookup: {
          from: 'shops',
          localField: 'shopId',
          foreignField: '_id',
          as: 'shop'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'marketingStaffId',
          foreignField: '_id',
          as: 'staff'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'alternateProviders.mlmId',
          foreignField: '_id',
          as: 'mlm'
        }
      },
      {
        $project: {
          _id: 1,
          activityId: '$_id',
          distributorId: 1,
          distributorName: { $arrayElemAt: ['$distributor.name', 0] },
          shopId: 1,
          shopName: { $arrayElemAt: ['$shop.name', 0] },
          staffId: '$marketingStaffId',
          staffName: { $arrayElemAt: ['$staff.name', 0] },
          date: '$createdAt',
          alternateProvider: '$alternateProviders',
          marketInsight: 1,
          mlmName: { $arrayElemAt: ['$mlm.name', 0] }
        }
      }
    ];
    
    // Filter by brand name if provided
    if (brandName) {
      pipeline.splice(1, 0, {
        $match: {
          'alternateProviders.brandName': { $regex: brandName, $options: 'i' }
        }
      });
    }
    
    const results = await RetailerShopActivity.aggregate(pipeline);
    
    res.status(200).json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    logger.error(`Error in getAlternateProviders controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Add MLM comment to alternate provider
 * @route   PATCH /api/retailer-shop-activity/:activityId/alternate-provider/:providerId/comment
 * @access  Private (Mid-Level Manager & Admin)
 */
exports.addAlternateProviderComment = async (req, res, next) => {
  try {
    const { activityId, providerId } = req.params;
    const { comment } = req.body;
    
    // Validate comment
    if (!comment) {
      return res.status(400).json({
        success: false,
        error: 'Comment is required'
      });
    }
    
    // Find activity
    const activity = await RetailerShopActivity.findById(activityId);
    
    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found'
      });
    }
    
    // Find the specific alternate provider
    const providerIndex = activity.alternateProviders.findIndex(
      p => p._id.toString() === providerId
    );
    
    if (providerIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Alternate provider not found in this activity'
      });
    }
    
    // Update the alternate provider with MLM comment
    activity.alternateProviders[providerIndex].mlmComment = comment;
    activity.alternateProviders[providerIndex].mlmId = req.user.id;
    activity.alternateProviders[providerIndex].commentDate = new Date();
    
    await activity.save();
    
    // Get fully populated activity for response
    const updatedActivity = await RetailerShopActivity.findById(activityId)
      .populate('shopId', 'name ownerName address type')
      .populate('distributorId', 'name shopName address')
      .populate('marketingStaffId', 'name email')
      .populate('alternateProviders.mlmId', 'name');
    
    res.status(200).json({
      success: true,
      data: updatedActivity
    });
  } catch (error) {
    logger.error(`Error in addAlternateProviderComment controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get all sales order activities with details
 * @route   GET /api/mobile/retailer-shop-activity/sales-orders
 * @access  Private (Marketing Staff, Admin, Mid-Level Manager)
 */
exports.getSalesOrderActivities = async (req, res, next) => {
  try {
    const { startDate, endDate, distributorId, staffId } = req.query;
    
    // Start with a basic query
    const query = {};
    
    // Add distributor filter if provided
    if (distributorId) {
      query.distributorId = distributorId;
    }

    // For Marketing Staff, only show their own activities
    if (req.user.role === 'Marketing Staff') {
      query.marketingStaffId = req.user.id;
    }

    // Log query for debugging
    console.log('Query:', JSON.stringify(query));
    console.log('User role:', req.user.role);
    console.log('User ID:', req.user.id);

    // Get all activities first
    const activities = await RetailerShopActivity.find(query)
      .populate('shopId', 'name ownerName address type')
      .populate('distributorId', 'name shopName address')
      .populate('marketingStaffId', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    // Log initial activities found
    console.log('Total activities found:', activities.length);

    // Filter activities to only those with sales orders
    const activitiesWithOrders = activities.filter(activity => 
      activity.salesOrders && activity.salesOrders.length > 0
    );

    // Log filtered activities
    console.log('Activities with orders:', activitiesWithOrders.length);

    if (activitiesWithOrders.length > 0) {
      console.log('Sample activity:', {
        id: activitiesWithOrders[0]._id,
        staffId: activitiesWithOrders[0].marketingStaffId?._id,
        distributorId: activitiesWithOrders[0].distributorId?._id,
        salesOrders: activitiesWithOrders[0].salesOrders?.length || 0
      });
    }

    // Transform matching activities
    const detailedActivities = activitiesWithOrders.map(activity => ({
      activityId: activity._id,
      date: activity.createdAt,
      staffName: activity.marketingStaffId?.name || 'Unknown',
      distributorName: activity.distributorId?.name || 'Unknown',
      distributorAddress: activity.distributorId?.address || 'Unknown',
      shopName: activity.shopId?.name || 'Unknown',
      shopOwner: activity.shopId?.ownerName || 'Unknown',
      shopAddress: activity.shopId?.address || 'Unknown',
      shopType: activity.shopId?.type || 'Unknown',
      punchInTime: activity.punchInTime,
      punchOutTime: activity.punchOutTime,
      status: activity.status,
      salesOrders: activity.salesOrders.map(order => ({
        brandName: order.brandName,
        variant: order.variant,
        size: order.size,
        quantity: order.quantity,
        isDisplayedInCounter: order.isDisplayedInCounter
      })),
      totalOrderItems: activity.salesOrders.length
    }));

    if (detailedActivities.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No activities with sales orders found"
      });
    }

    // Return success response with data
    res.status(200).json({
      success: true,
      count: detailedActivities.length,
      data: detailedActivities
    });
  } catch (error) {
    logger.error(`Error in getSalesOrderActivities controller: ${error.message}`);
    next(error);
  }
};