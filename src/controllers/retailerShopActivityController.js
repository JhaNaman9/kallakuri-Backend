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

    const distributor = await Distributor.findById(distributorId);
    if (!distributor) {
      return res.status(404).json({
        success: false,
        error: 'Distributor not found'
      });
    }

    const shop = await Shop.findOne({
      _id: shopId,
      distributorId: distributorId,
      isActive: true
    });

    if (!shop) {
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
      if (isPunchedIn !== undefined) {
        activity.isPunchedIn = isPunchedIn;
        if (!isPunchedIn) {
          activity.punchOutTime = new Date();
          activity.status = 'Completed';
        }
      }

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
    } else {
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
    }

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

    const populatedActivity = await RetailerShopActivity.findById(activity._id)
      .populate('shopId', 'name ownerName address type')
      .populate('distributorId', 'name shopName address')
      .populate('marketingStaffId', 'name email');

    res.status(activity.isNew ? 201 : 200).json({
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
      return res.status(200).json({
        success: false,
        error: 'Activity not found'
      });
    }

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

    const distributor = await Distributor.findById(distributorId);
    if (!distributor) {
      return res.status(404).json({
        success: false,
        error: 'Distributor not found'
      });
    }

    const query = { distributorId };

    if (req.user.role === 'Marketing Staff') {
      query.marketingStaffId = req.user.id;
    }

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

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({
        success: false,
        error: 'Shop not found'
      });
    }

    const query = { shopId };

    if (req.user.role === 'Marketing Staff') {
      query.marketingStaffId = req.user.id;
    }

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

    let matchQuery = {
      'alternateProviders': { $exists: true, $ne: [] }
    };

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

    if (!comment) {
      return res.status(400).json({
        success: false,
        error: 'Comment is required'
      });
    }

    const activity = await RetailerShopActivity.findById(activityId);

    if (!activity) {
      return res.status(200).json({
        success: false,
        error: 'Activity not found'
      });
    }

    const providerIndex = activity.alternateProviders.findIndex(
      p => p._id.toString() === providerId
    );

    if (providerIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Alternate provider not found in this activity'
      });
    }

    activity.alternateProviders[providerIndex].mlmComment = comment;
    activity.alternateProviders[providerIndex].mlmId = req.user.id;
    activity.alternateProviders[providerIndex].commentDate = new Date();

    await activity.save();

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

    // Build query for RetailerShopActivity
    const query = {};
    if (distributorId) query.distributorId = distributorId;
    if (staffId) query.marketingStaffId = staffId;
    if (req.user.role === 'Marketing Staff') query.marketingStaffId = req.user.id;

    let activities = await RetailerShopActivity.find(query)
      .populate('shopId', 'name ownerName address type')
      .populate('distributorId', 'name shopName address')
      .populate('marketingStaffId', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    // Filter by date range if provided
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(-8640000000000000);
      const end = endDate ? new Date(endDate) : new Date(8640000000000000);
      activities = activities.filter(activity => {
        const activityDate = new Date(activity.createdAt);
        return activityDate >= start && activityDate <= end;
      });
    }

    // Only include activities with salesOrders
    const activitiesWithOrders = activities.filter(activity =>
      activity.salesOrders && activity.salesOrders.length > 0
    );

    // Format the response
    const salesOrderData = activitiesWithOrders.map(activity => ({
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
      salesOrders: activity.salesOrders,
      totalOrderItems: activity.salesOrders.length
    }));

    if (salesOrderData.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }
    return res.status(200).json({
      success: true,
      count: salesOrderData.length,
      data: salesOrderData
    });
  } catch (error) {
    console.error('Error in getSalesOrderActivities:', error);
    logger.error(`Error in getSalesOrderActivities controller: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while fetching sales orders.'
    });
  }
};
