const RetailerShopActivity = require('../models/RetailerShopActivity');
const mongoose = require('mongoose');
const Shop = require('../models/Shop');
const Distributor = require('../models/Distributor');

/**
 * @desc    Get fresh sales order for a shop and distributor for the current day
 * @route   GET /api/mobile/fresh-orders?distributorId=&shopId=
 * @access  Private (Marketing Staff, Admin)
 */
module.exports = async (req, res, next) => {
  try {
    const staffId = req.user && req.user.id;
    const userRole = req.user && req.user.role;

    // Only marketing staff and admin can access
    if (userRole !== 'admin' && userRole !== 'Marketing Staff') {
      return res.status(403).json({ success: false, error: 'Access denied: Only admin or marketing staff can view fresh orders.' });
    }

    // Build query for all orders
    const baseQuery = {};
    if (userRole === 'Marketing Staff') {
      baseQuery.marketingStaffId = staffId;
    }

    // Fetch all matching activities
    const activities = await RetailerShopActivity.find(baseQuery);
    if (!activities || activities.length === 0) {
      return res.status(404).json({ success: false, error: 'No sales orders found' });
    }

    // Populate shop and distributor names for each order
    const results = await Promise.all(activities.map(async (activity) => {
      const shop = await Shop.findById(activity.shopId).select('name');
      const distributor = await Distributor.findById(activity.distributorId).select('name');
      return {
        shopId: activity.shopId,
        shopName: shop ? shop.name : '',
        distributorId: activity.distributorId,
        distributorName: distributor ? distributor.name : '',
        marketingStaffId: activity.marketingStaffId,
        salesOrders: activity.salesOrders
      };
    }));

    return res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error in getFreshOrder:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};
