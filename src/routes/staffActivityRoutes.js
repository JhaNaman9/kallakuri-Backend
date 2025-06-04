const express = require('express');
const { query, check } = require('express-validator');
const staffActivityController = require('../controllers/staffActivityController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply protect middleware to all routes
router.use(protect);

/**
 * @swagger
 * /staff-activity:
 *   post:
 *     summary: Create a staff activity record
 *     tags: [Staff Activity]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - activityType
 *               - details
 *               - status
 *             properties:
 *               activityType:
 *                 type: string
 *                 enum: [Task, Order, Damage Claim, Inquiry, Other]
 *                 description: Type of activity
 *               details:
 *                 type: string
 *                 description: Activity details
 *               status:
 *                 type: string
 *                 enum: [Completed, Pending, In Progress, Cancelled]
 *                 description: Activity status
 *               relatedId:
 *                 type: string
 *                 description: ID of related entity (optional)
 *               onModel:
 *                 type: string
 *                 enum: [Task, Order, DamageClaim]
 *                 description: Model type of related entity (optional)
 *     responses:
 *       201:
 *         description: Activity created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.post(
  '/',
  restrictTo('Marketing Staff'),
  [
    check('activityType', 'Activity type is required')
      .not().isEmpty()
      .isIn(['Task', 'Order', 'Damage Claim', 'Inquiry', 'Other']),
    check('details', 'Details are required').not().isEmpty(),
    check('status', 'Status is required')
      .not().isEmpty()
      .isIn(['Completed', 'Pending', 'In Progress', 'Cancelled']),
    check('relatedId', 'Related ID must be a valid MongoDB ID')
      .optional()
      .isMongoId(),
    check('onModel', 'onModel must be Task, Order, or DamageClaim')
      .optional()
      .isIn(['Task', 'Order', 'DamageClaim'])
  ],
  staffActivityController.createStaffActivity
);

/**
 * @swagger
 * /staff-activity:
 *   get:
 *     summary: Get staff activities with filtering and pagination
 *     description: Get staff activities with optional filters for staff, date range, and status
 *     tags: [Staff Activity]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: staffId
 *         schema:
 *           type: string
 *         required: false
 *         description: Staff member ID
 *       - in: query
 *         name: staffType
 *         schema:
 *           type: string
 *         required: false
 *         description: Type of staff
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Start date in YYYY-MM-DD format
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: End date in YYYY-MM-DD format
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         required: false
 *         description: Status filter
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         required: false
 *         description: Page number (default 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         required: false
 *         description: Number of items per page (default 10)
 *     responses:
 *       200:
 *         description: List of staff activities
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.get(
  '/',
  restrictTo('Mid-Level Manager'),
  staffActivityController.getStaffActivities
);

/**
 * @swagger
 * /staff-activity/download:
 *   get:
 *     summary: Download staff activities as Excel
 *     description: Mid-Level Manager can download activities of a specific staff member on a specific date as Excel
 *     tags: [Staff Activity]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: staffId
 *         schema:
 *           type: string
 *         required: true
 *         description: Staff member ID
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: Date in YYYY-MM-DD format
 *     responses:
 *       200:
 *         description: Excel file containing staff activities
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Staff member not found
 */
router.get(
  '/download',
  restrictTo('Mid-Level Manager'),
  [
    query('staffId', 'Staff ID is required').not().isEmpty().isMongoId(),
    query('date', 'Date is required in YYYY-MM-DD format').isDate()
  ],
  staffActivityController.downloadStaffActivities
);

module.exports = router; 