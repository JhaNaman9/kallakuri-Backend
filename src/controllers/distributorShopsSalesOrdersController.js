const RetailerShopActivity = require('../models/RetailerShopActivity');

/**
 * Get all shops for a distributor, each with their sales orders (clean logic)
 * @route GET /api/mobile/retailer-shop-activity/distributor-shops-sales-orders
 * @query distributorId (required), startDate (optional), endDate (optional)
 */
exports.getDistributorShopsSalesOrders = async (req, res) => {
  try {
    const { distributorId, startDate, endDate } = req.query;
    if (!distributorId) {
      return res.status(400).json({ success: false, error: 'distributorId is required' });
    }

    // Build query
    const query = { distributorId };
    // Filter by logged-in marketing staff
    if (req.user && req.user.id) {
      query.marketingStaffId = req.user.id;
    } else {
      return res.status(401).json({ success: false, error: 'Unauthorized: No staff user found' });
    }
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(-8640000000000000);
      const end = endDate ? new Date(endDate) : new Date(8640000000000000);
      query.createdAt = { $gte: start, $lte: end };
    }

    // Find all activities for this distributor and staff
    const activities = await RetailerShopActivity.find(query)
      .populate('shopId', 'name ownerName address type')
      .lean();

    // Group by shopId
    const shopMap = {};
    for (const activity of activities) {
      if (!activity.shopId) continue;
      const shopKey = activity.shopId._id.toString();
      if (!shopMap[shopKey]) {
        shopMap[shopKey] = {
          shopId: shopKey,
          shopName: activity.shopId.name,
          shopOwner: activity.shopId.ownerName,
          shopAddress: activity.shopId.address,
          shopType: activity.shopId.type,
          salesOrders: []
        };
      }
      // Add all sales orders for this activity
      if (Array.isArray(activity.salesOrders) && activity.salesOrders.length > 0) {
        shopMap[shopKey].salesOrders.push(...activity.salesOrders);
      }
    }

    const data = Object.values(shopMap);
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    console.error('Error in getDistributorShopsSalesOrders:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};
