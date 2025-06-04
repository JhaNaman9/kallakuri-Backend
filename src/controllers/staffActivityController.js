const { validationResult } = require('express-validator');
const StaffActivity = require('../models/StaffActivity');
const User = require('../models/User');
const logger = require('../utils/logger');
const { generateExcel } = require('../utils/excelGenerator');

/**
 * @desc    Create a staff activity record
 * @route   POST /api/staff-activity
 * @access  Private (Marketing Staff)
 */
exports.createStaffActivity = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { activityType, details, status, relatedId, onModel } = req.body;

    // Create staff activity
    const staffActivity = await StaffActivity.create({
      staffId: req.user.id,
      activityType,
      details,
      status,
      relatedId,
      onModel
    });

    res.status(201).json({
      success: true,
      data: staffActivity
    });
  } catch (error) {
    logger.error(`Error in createStaffActivity controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get staff activities by staff member and date
 * @route   GET /api/staff-activity
 * @access  Private (Mid-Level Manager)
 */
exports.getStaffActivities = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { staffId, staffType, fromDate, toDate, status, page = 1, limit = 10 } = req.query;
    
    // Build query
    const query = {};
    
    if (staffId) {
      query.staffId = staffId;
    }
    
    if (staffType) {
      query.staffType = staffType;
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
    
    // Parse pagination parameters
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    
    // Get total count for pagination
    const totalCount = await StaffActivity.countDocuments(query);
    
    // Get activities with pagination
    const activities = await StaffActivity.find(query)
      .populate('staffId', 'name email role')
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
    logger.error(`Error in getStaffActivities controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Download staff activities as Excel
 * @route   GET /api/staff-activity/download
 * @access  Private (Mid-Level Manager)
 */
exports.downloadStaffActivities = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { staffId, date } = req.query;
    
    // Validate staff ID
    const staff = await User.findById(staffId);
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }

    // Parse date
    const queryDate = new Date(date);
    const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));

    // Get activities
    const activities = await StaffActivity.find({
      staffId,
      date: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ date: 1 });

    // Format data for Excel
    const formattedData = activities.map(activity => {
      return {
        Date: new Date(activity.date).toLocaleDateString(),
        Time: new Date(activity.date).toLocaleTimeString(),
        'Staff Name': staff.name,
        'Activity Type': activity.activityType,
        Details: activity.details,
        Status: activity.status
      };
    });

    // Generate Excel file
    const wb = generateExcel({
      filename: `Staff_Activity_${staff.name}_${date}`,
      sheetName: 'Staff Activity',
      headers: ['Date', 'Time', 'Staff Name', 'Activity Type', 'Details', 'Status'],
      data: formattedData
    });

    // Set headers for Excel download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Staff_Activity_${staff.name}_${date}.xlsx"`);

    // Send Excel file
    wb.write('Staff_Activity.xlsx', res);
  } catch (error) {
    logger.error(`Error in downloadStaffActivities controller: ${error.message}`);
    next(error);
  }
}; 