const mongoose = require('mongoose');
const DamageClaim = require('../models/DamageClaim');
const Order = require('../models/Order');
const StaffActivity = require('../models/StaffActivity');
const User = require('../models/User');
const Distributor = require('../models/Distributor');
const Product = require('../models/Product');

/**
 * Get analytics for damage claims
 */
exports.getDamageClaimsAnalytics = async (req, res) => {
  try {
    const { timeRange } = req.query;
    const dateFilter = getDateFilterFromTimeRange(timeRange);

    // Total claims count
    const totalClaims = await DamageClaim.countDocuments(dateFilter);
    
    // Claims by status
    const approvedClaims = await DamageClaim.countDocuments({ 
      ...dateFilter, 
      status: { $in: ['Approved', 'Partially Approved'] } 
    });
    const pendingClaims = await DamageClaim.countDocuments({ ...dateFilter, status: 'Pending' });
    const rejectedClaims = await DamageClaim.countDocuments({ ...dateFilter, status: 'Rejected' });
    
    // Approval rate
    const approvalRate = totalClaims > 0 
      ? Math.round((approvedClaims / totalClaims) * 100) 
      : 0;
    
    // Average processing time (days)
    const processedClaims = await DamageClaim.find({
      ...dateFilter,
      status: { $in: ['Approved', 'Partially Approved', 'Rejected'] },
      approvedDate: { $exists: true }
    });
    
    let avgProcessingTime = 0;
    if (processedClaims.length > 0) {
      const totalProcessingTime = processedClaims.reduce((sum, claim) => {
        const createdDate = new Date(claim.createdAt);
        const processedDate = new Date(claim.approvedDate || claim.updatedAt);
        const processingTime = (processedDate - createdDate) / (1000 * 60 * 60 * 24); // days
        return sum + processingTime;
      }, 0);
      avgProcessingTime = parseFloat((totalProcessingTime / processedClaims.length).toFixed(1));
    }
    
    // Claims by distributor
    const claimsByDistributor = await DamageClaim.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$distributorId', name: { $first: '$distributorName' }, claims: { $sum: 1 } } },
      { $project: { _id: 0, name: 1, claims: 1 } },
      { $sort: { claims: -1 } },
      { $limit: 6 }
    ]);
    
    // Claims by product
    const claimsByProduct = await DamageClaim.aggregate([
      { $match: dateFilter },
      { 
        $group: { 
          _id: { brand: '$brand', variant: '$variant', size: '$size' },
          claims: { $sum: 1 } 
        } 
      },
      { 
        $project: { 
          _id: 0, 
          name: { 
            $concat: [ 
              '$_id.brand', ' ', 
              '$_id.variant', ' ', 
              '$_id.size' 
            ] 
          },
          claims: 1 
        } 
      },
      { $sort: { claims: -1 } },
      { $limit: 6 }
    ]);
    
    // Claims by damage type
    const claimsByDamageType = await DamageClaim.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$damageType', value: { $sum: 1 } } },
      { $project: { _id: 0, name: '$_id', value: 1 } },
      { $sort: { value: -1 } }
    ]);
    
    // Monthly approval rate trend
    const approvalRateByMonth = await getMonthlyTrendData(
      DamageClaim,
      { ...dateFilter, status: { $in: ['Approved', 'Partially Approved', 'Rejected'] } },
      (results) => {
        return results.map(month => {
          const approvalRate = month.total > 0 
            ? Math.round((month.approved / month.total) * 100) 
            : 0;
          return {
            month: month.month,
            approvalRate
          };
        });
      }
    );
    
    // Monthly claims trend
    const claimsTrend = await getMonthlyTrendData(
      DamageClaim,
      dateFilter,
      (results) => {
        return results.map(month => ({
          month: month.month,
          submitted: month.total,
          approved: month.approved,
          rejected: month.rejected
        }));
      }
    );

    res.status(200).json({
      totalClaims,
      approvedClaims,
      rejectedClaims,
      pendingClaims,
      approvalRate,
      avgProcessingTime,
      claimsByDistributor,
      claimsByProduct,
      claimsByDamageType,
      approvalRateByMonth,
      claimsTrend
    });
  } catch (error) {
    console.error('Error getting damage claims analytics:', error);
    res.status(500).json({ message: 'Error getting damage claims analytics' });
  }
};

/**
 * Get analytics for orders
 */
exports.getOrderAnalytics = async (req, res) => {
  try {
    const { timeRange } = req.query;
    const dateFilter = getDateFilterFromTimeRange(timeRange);

    // Total orders count
    const totalOrders = await Order.countDocuments(dateFilter);
    
    // Orders by status
    const approvedOrders = await Order.countDocuments({ ...dateFilter, status: 'Approved' });
    const pendingOrders = await Order.countDocuments({ ...dateFilter, status: 'Requested' });
    const rejectedOrders = await Order.countDocuments({ ...dateFilter, status: 'Rejected' });
    const dispatchedOrders = await Order.countDocuments({ ...dateFilter, status: 'Dispatched' });
    
    // Fulfillment rate
    const fulfillmentRate = totalOrders > 0 
      ? Math.round(((approvedOrders + dispatchedOrders) / totalOrders) * 100) 
      : 0;
    
    // Average processing time (days)
    const processedOrders = await Order.find({
      ...dateFilter,
      status: { $in: ['Approved', 'Rejected', 'Dispatched'] }
    });
    
    let avgProcessingTime = 0;
    if (processedOrders.length > 0) {
      const totalProcessingTime = processedOrders.reduce((sum, order) => {
        const createdDate = new Date(order.createdAt);
        const processedDate = new Date(order.updatedAt);
        const processingTime = (processedDate - createdDate) / (1000 * 60 * 60 * 24); // days
        return sum + processingTime;
      }, 0);
      avgProcessingTime = parseFloat((totalProcessingTime / processedOrders.length).toFixed(1));
    }
    
    // Orders by distributor
    const ordersByDistributor = await Order.aggregate([
      { $match: dateFilter },
      { 
        $lookup: {
          from: 'distributors',
          localField: 'distributorId',
          foreignField: '_id',
          as: 'distributorInfo'
        } 
      },
      { $unwind: '$distributorInfo' },
      { $group: { _id: '$distributorId', name: { $first: '$distributorInfo.name' }, orders: { $sum: 1 } } },
      { $project: { _id: 0, name: 1, orders: 1 } },
      { $sort: { orders: -1 } },
      { $limit: 6 }
    ]);
    
    // Order status distribution
    const orderStatusDistribution = [
      { name: 'Approved', value: approvedOrders },
      { name: 'Pending', value: pendingOrders },
      { name: 'Rejected', value: rejectedOrders },
      { name: 'Dispatched', value: dispatchedOrders }
    ];
    
    // Monthly order trend
    const orderTrend = await getMonthlyTrendData(
      Order,
      dateFilter,
      (results) => {
        return results.map(month => ({
          month: month.month,
          requested: month.total,
          approved: month.approved,
          dispatched: month.dispatched || 0
        }));
      }
    );
    
    // Monthly fulfillment rate trend
    const fulfillmentTrend = await getMonthlyTrendData(
      Order,
      dateFilter,
      (results) => {
        return results.map(month => {
          const fulfillmentRate = month.total > 0 
            ? Math.round(((month.approved + (month.dispatched || 0)) / month.total) * 100) 
            : 0;
          return {
            month: month.month,
            fulfillmentRate
          };
        });
      }
    );

    // Top ordered products
    const topProducts = await Order.aggregate([
      { $match: dateFilter },
      { $unwind: '$items' },
      { $group: { 
        _id: '$items.productName', 
        orders: { $sum: 1 },
        quantity: { $sum: '$items.quantity' }
      }},
      { $project: { 
        _id: 0, 
        name: '$_id', 
        orders: 1,
        quantity: 1,
        value: { $multiply: ['$orders', '$quantity'] }
      }},
      { $sort: { orders: -1 } },
      { $limit: 5 }
    ]);

    res.status(200).json({
      totalOrders,
      approvedOrders,
      rejectedOrders,
      pendingOrders,
      dispatchedOrders,
      fulfillmentRate,
      avgProcessingTime,
      ordersByDistributor,
      orderStatusDistribution,
      orderTrend,
      fulfillmentTrend,
      topProducts
    });
  } catch (error) {
    console.error('Error getting order analytics:', error);
    res.status(500).json({ message: 'Error getting order analytics' });
  }
};

/**
 * Get analytics for staff activity
 */
exports.getStaffActivityAnalytics = async (req, res) => {
  try {
    const { timeRange } = req.query;
    const dateFilter = getDateFilterFromTimeRange(timeRange);

    // Total activities count
    const totalActivities = await StaffActivity.countDocuments(dateFilter);
    
    // Activities by status
    const completedActivities = await StaffActivity.countDocuments({ 
      ...dateFilter, 
      status: 'Completed' 
    });
    const pendingActivities = await StaffActivity.countDocuments({ 
      ...dateFilter, 
      status: 'Pending' 
    });
    const inProgressActivities = await StaffActivity.countDocuments({ 
      ...dateFilter, 
      status: 'In Progress' 
    });
    
    // Average productivity
    // This is a placeholder calculation - in a real system, you'd have a more sophisticated
    // method of calculating productivity based on completion times, quality, etc.
    const avgProductivity = completedActivities > 0 
      ? Math.round((completedActivities / totalActivities) * 100) 
      : 0;
    
    // Activity by staff member
    const activityByStaff = await StaffActivity.aggregate([
      { $match: dateFilter },
      { 
        $lookup: {
          from: 'users',
          localField: 'staffId',
          foreignField: '_id',
          as: 'staffInfo'
        } 
      },
      { $unwind: '$staffInfo' },
      { $group: { 
        _id: '$staffId', 
        name: { $first: { $concat: ['$staffInfo.firstName', ' ', '$staffInfo.lastName'] } }, 
        activities: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } }
      }},
      { $project: { 
        _id: 0, 
        name: 1, 
        activities: 1,
        productivity: { 
          $cond: [
            { $gt: ['$activities', 0] },
            { $multiply: [{ $divide: ['$completed', '$activities'] }, 100] },
            0
          ]
        }
      }},
      { $sort: { activities: -1 } },
      { $limit: 10 }
    ]);
    
    // Activity by type
    const activityByType = await StaffActivity.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$activityType', value: { $sum: 1 } } },
      { $project: { _id: 0, name: '$_id', value: 1 } },
      { $sort: { value: -1 } }
    ]);
    
    // Monthly activity trend
    const activityTrend = await getMonthlyActivityTrend(dateFilter);
    
    // Staff productivity
    const staffWithActivity = await StaffActivity.distinct('staffId', dateFilter);
    const productivityByStaff = await Promise.all(
      staffWithActivity.map(async (staffId) => {
        const staffActivities = await StaffActivity.find({ 
          ...dateFilter, 
          staffId 
        });
        
        const totalActivities = staffActivities.length;
        const completedActivities = staffActivities.filter(a => a.status === 'Completed').length;
        
        const productivity = totalActivities > 0 
          ? Math.round((completedActivities / totalActivities) * 100) 
          : 0;
        
        const staff = await User.findById(staffId);
        const name = staff ? `${staff.firstName} ${staff.lastName}` : 'Unknown Staff';
        
        return { name, productivity };
      })
    );
    
    // Sort by productivity in descending order
    productivityByStaff.sort((a, b) => b.productivity - a.productivity);
    
    // Top performers
    const topPerformers = await generateTopPerformers(dateFilter);

    res.status(200).json({
      totalActivities,
      completedActivities,
      pendingActivities,
      inProgressActivities,
      avgProductivity,
      activityByStaff,
      activityByType,
      activityTrend,
      productivityByStaff,
      topPerformers
    });
  } catch (error) {
    console.error('Error getting staff activity analytics:', error);
    res.status(500).json({ message: 'Error getting staff activity analytics' });
  }
};

/**
 * Get date filter object from time range string
 * @param {string} timeRange - Time range string (e.g., 'last7days', 'last30days')
 * @returns {Object} Date filter object
 */
const getDateFilterFromTimeRange = (timeRange) => {
  const now = new Date();
  let startDate;
  
  switch (timeRange) {
    case 'last7days':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'last30days':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 30);
      break;
    case 'last3months':
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 3);
      break;
    case 'last6months':
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 6);
      break;
    case 'lastYear':
      startDate = new Date(now);
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    default:
      // Default to last 30 days
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 30);
  }
  
  return { createdAt: { $gte: startDate, $lte: now } };
};

/**
 * Get monthly trend data
 * @param {Model} model - Mongoose model
 * @param {Object} filter - Filter object
 * @param {Function} transformer - Function to transform the results
 * @returns {Array} Monthly trend data
 */
const getMonthlyTrendData = async (model, filter, transformer) => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-indexed (0 = January)
  const currentYear = now.getFullYear();
  
  // Get data for the last 6 months
  const monthlyData = [];
  
  for (let i = 5; i >= 0; i--) {
    let month = currentMonth - i;
    let year = currentYear;
    
    if (month < 0) {
      month += 12;
      year -= 1;
    }
    
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0); // Last day of the month
    
    const monthlyFilter = {
      ...filter,
      createdAt: { $gte: startDate, $lte: endDate }
    };
    
    const totalCount = await model.countDocuments(monthlyFilter);
    
    let approvedCount = 0;
    let rejectedCount = 0;
    let dispatchedCount = 0;
    
    if (model.modelName === 'DamageClaim') {
      approvedCount = await model.countDocuments({
        ...monthlyFilter,
        status: { $in: ['Approved', 'Partially Approved'] }
      });
      rejectedCount = await model.countDocuments({
        ...monthlyFilter,
        status: 'Rejected'
      });
    } else if (model.modelName === 'Order') {
      approvedCount = await model.countDocuments({
        ...monthlyFilter,
        status: 'Approved'
      });
      rejectedCount = await model.countDocuments({
        ...monthlyFilter,
        status: 'Rejected'
      });
      dispatchedCount = await model.countDocuments({
        ...monthlyFilter,
        status: 'Dispatched'
      });
    }
    
    monthlyData.push({
      month: months[month],
      year,
      total: totalCount,
      approved: approvedCount,
      rejected: rejectedCount,
      dispatched: dispatchedCount
    });
  }
  
  return transformer ? transformer(monthlyData) : monthlyData;
};

/**
 * Get monthly activity trend by type
 * @param {Object} dateFilter - Date filter object
 * @returns {Array} Monthly activity trend data
 */
const getMonthlyActivityTrend = async (dateFilter) => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const monthlyData = [];
  
  for (let i = 5; i >= 0; i--) {
    let month = currentMonth - i;
    let year = currentYear;
    
    if (month < 0) {
      month += 12;
      year -= 1;
    }
    
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    
    const monthlyFilter = {
      ...dateFilter,
      createdAt: { $gte: startDate, $lte: endDate }
    };
    
    // Get counts by activity type
    const taskCount = await StaffActivity.countDocuments({
      ...monthlyFilter,
      activityType: 'Task'
    });
    
    const orderCount = await StaffActivity.countDocuments({
      ...monthlyFilter,
      activityType: 'Order'
    });
    
    const damageClaimCount = await StaffActivity.countDocuments({
      ...monthlyFilter,
      activityType: 'Damage Claim'
    });
    
    monthlyData.push({
      month: months[month],
      tasks: taskCount,
      orders: orderCount,
      damageClaims: damageClaimCount
    });
  }
  
  return monthlyData;
};

/**
 * Generate top performers data
 * @param {Object} dateFilter - Date filter object
 * @returns {Array} Top performers data
 */
const generateTopPerformers = async (dateFilter) => {
  // Get all staff with activity
  const staffWithActivity = await StaffActivity.distinct('staffId', dateFilter);
  
  const performanceData = await Promise.all(
    staffWithActivity.map(async (staffId) => {
      // Get staff details
      const staff = await User.findById(staffId);
      if (!staff) return null;
      
      // Get staff activities
      const activities = await StaffActivity.find({ 
        ...dateFilter, 
        staffId 
      });
      
      const totalActivities = activities.length;
      if (totalActivities === 0) return null;
      
      const completedActivities = activities.filter(a => a.status === 'Completed').length;
      const completionRate = Math.round((completedActivities / totalActivities) * 100);
      
      // Calculate average response time (placeholder calculation)
      // In a real system, you'd have more precise timestamps for activity lifecycle
      const responseTimes = activities.map(activity => {
        const createdDate = new Date(activity.createdAt);
        const completedDate = activity.status === 'Completed' 
          ? new Date(activity.updatedAt)
          : new Date(); // Use current time for non-completed activities
        return (completedDate - createdDate) / (1000 * 60); // minutes
      });
      
      const avgResponseTime = responseTimes.length > 0
        ? Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length)
        : 0;
      
      // Calculate productivity score (custom formula)
      // 50% based on completion rate, 30% on volume, 20% on response time
      const volumeScore = Math.min(totalActivities / 100 * 100, 100); // Cap at 100
      const responseTimeScore = Math.max(0, 100 - (avgResponseTime / 120 * 100)); // Lower is better, cap at 2 hours
      
      const productivityScore = Math.round(
        completionRate * 0.5 +
        volumeScore * 0.3 +
        responseTimeScore * 0.2
      );
      
      return {
        name: `${staff.firstName} ${staff.lastName}`,
        activities: totalActivities,
        completionRate,
        avgResponseTime: `${avgResponseTime} min`,
        productivityScore
      };
    })
  );
  
  // Remove null entries and sort by productivity score
  return performanceData
    .filter(data => data !== null)
    .sort((a, b) => b.productivityScore - a.productivityScore)
    .slice(0, 5);
};

/**
 * Get overview analytics for dashboard
 */
exports.getOverviewAnalytics = async (req, res) => {
  try {
    const { timeRange } = req.query;
    const dateFilter = getDateFilterFromTimeRange(timeRange || 'last30days');

    // Get counts
    const damageClaimsCount = await DamageClaim.countDocuments(dateFilter);
    const ordersCount = await Order.countDocuments(dateFilter);
    const activitiesCount = await StaffActivity.countDocuments(dateFilter);
    
    // Get approval/fulfillment rates
    const approvedClaims = await DamageClaim.countDocuments({ 
      ...dateFilter, 
      status: { $in: ['Approved', 'Partially Approved'] } 
    });
    const claimsApprovalRate = damageClaimsCount > 0 
      ? Math.round((approvedClaims / damageClaimsCount) * 100) 
      : 0;
    
    const approvedOrders = await Order.countDocuments({ 
      ...dateFilter, 
      status: { $in: ['Approved', 'Dispatched'] } 
    });
    const orderFulfillmentRate = ordersCount > 0 
      ? Math.round((approvedOrders / ordersCount) * 100) 
      : 0;
    
    const completedActivities = await StaffActivity.countDocuments({ 
      ...dateFilter, 
      status: 'Completed' 
    });
    const activityProductivity = activitiesCount > 0 
      ? Math.round((completedActivities / activitiesCount) * 100) 
      : 0;
    
    // Get monthly trend data
    const monthlyData = await getMonthlyTrendData(
      DamageClaim,
      dateFilter,
      (results) => {
        return results.map(month => ({
          month: month.month,
          damageClaimsCount: month.total
        }));
      }
    );
    
    // Add orders data to monthly trend
    const orderMonthlyData = await getMonthlyTrendData(
      Order,
      dateFilter,
      (results) => {
        return results.map(month => ({
          month: month.month,
          orderCount: month.total
        }));
      }
    );
    
    // Combine monthly data
    const combinedMonthlyData = monthlyData.map((item, index) => {
      return {
        ...item,
        orderCount: orderMonthlyData[index].orderCount
      };
    });
    
    // Add activity data to monthly trend
    const activityMonthly = await getMonthlyTrendData(
      StaffActivity,
      dateFilter,
      (results) => {
        return results.map(month => ({
          month: month.month,
          activityCount: month.total
        }));
      }
    );
    
    combinedMonthlyData.forEach((item, index) => {
      item.activityCount = activityMonthly[index].activityCount;
    });

    res.status(200).json({
      damageClaimsCount,
      ordersCount,
      activitiesCount,
      claimsApprovalRate,
      orderFulfillmentRate,
      activityProductivity,
      combinedMonthlyData
    });
  } catch (error) {
    console.error('Error getting overview analytics:', error);
    res.status(500).json({ message: 'Error getting overview analytics' });
  }
};