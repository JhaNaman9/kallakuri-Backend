const RetailerShopActivity = require('../models/RetailerShopActivity');
const mongoose = require('mongoose');
const Shop = require('../models/Shop');
const Distributor = require('../models/Distributor');

/**
 * @desc    Create fresh sales orders for a shop by a marketing staff
 * @route   POST /api/mobile/fresh-orders
 * @access  Private (Marketing Staff)
 * @body    distributorId: ObjectId (required)
 * @body    shopId: ObjectId (required)
 * @body    orders: Array of { brandName, quantity, size, variant } (required)
 */
exports.createFreshOrder = async (req, res, next) => {
  try {
    const { distributorId, shopId, orders } = req.body;
    const staffId = req.user && req.user.id;
    const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
    if (!distributorId || !shopId || !Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({ success: false, error: 'distributorId, shopId, and orders array are required' });
    }
    if (!isValidObjectId(distributorId) || !isValidObjectId(shopId)) {
      return res.status(400).json({ success: false, error: 'distributorId and shopId must be valid MongoDB ObjectIds' });
    }
    if (!staffId) {
      return res.status(401).json({ success: false, error: 'Unauthorized: No staff user found' });
    }

    // Prepare sales order objects
    const salesOrders = orders.map(order => ({
      brandName: order.brandName,
      quantity: order.quantity,
      size: order.size,
      variant: order.variant,
      createdAt: new Date(),
      createdBy: staffId
    }));

    // Find or create RetailerShopActivity for today, staff, distributor, shop
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    let activity = await RetailerShopActivity.findOne({
      marketingStaffId: staffId,
      distributorId: distributorId,
      shopId: shopId,
      createdAt: { $gte: today, $lt: tomorrow }
    });

    if (!activity) {
      activity = new RetailerShopActivity({
        marketingStaffId: staffId,
        distributorId: distributorId,
        shopId: shopId,
        salesOrders: salesOrders,
        punchInTime: new Date(),
        isPunchedIn: true
      });
    } else {
      activity.salesOrders = salesOrders; // Only keep the new fresh orders
    }

    await activity.save();

    // Fetch shop and distributor names
    const shop = await Shop.findById(activity.shopId).select('name');
    const distributor = await Distributor.findById(activity.distributorId).select('name');

    // Respond with only the new sales order details, plus shopId, distributorId, marketingStaffId
    return res.status(201).json({
      success: true,
      data: {
        shopId: activity.shopId,
        shopName: shop ? shop.name : '',
        distributorId: activity.distributorId,
        distributorName: distributor ? distributor.name : '',
        marketingStaffId: activity.marketingStaffId,
        salesOrders: activity.salesOrders
      }
    });
  } catch (error) {
    console.error('Error in createFreshOrder:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};
exports.getFreshOrder = require('./getFreshOrder');
