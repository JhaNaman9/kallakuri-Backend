const express = require('express');
const { check, query } = require('express-validator');
const retailerShopActivityController = require('../controllers/retailerShopActivityController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply protect middleware to all routes
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Retailer Shop Activity
 *   description: API endpoints for managing retailer shop activities
 */

/**
 * @swagger
 * /api/retailer-shop-activity:
 *   get:
 *     summary: Get all retailer shop activities
 *     tags: [Retailer Shop Activity]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: staffId
 *         schema:
 *           type: string
 *         description: Filter by staff ID
 *       - in: query
 *         name: distributorId
 *         schema:
 *           type: string
 *         description: Filter by distributor ID
 *       - in: query
 *         name: shopId
 *         schema:
 *           type: string
 *         description: Filter by shop ID
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by date in YYYY-MM-DD format
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [In Progress, Completed]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of retailer shop activities
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.get(
  '/',
  restrictTo('Admin', 'Mid-Level Manager'),
  retailerShopActivityController.getAllActivities
);

/**
 * @swagger
 * /api/retailer-shop-activity/{id}:
 *   get:
 *     summary: Get a single retailer shop activity
 *     tags: [Retailer Shop Activity]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Activity ID
 *     responses:
 *       200:
 *         description: Activity details
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Activity not found
 */
router.get('/:id', retailerShopActivityController.getActivity);

/**
 * @swagger
 * /api/retailer-shop-activity/distributor/{distributorId}:
 *   get:
 *     summary: Get retailer shop activities by distributor
 *     tags: [Retailer Shop Activity]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: distributorId
 *         schema:
 *           type: string
 *         required: true
 *         description: Distributor ID
 *     responses:
 *       200:
 *         description: List of activities for the distributor
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Distributor not found
 */
router.get('/distributor/:distributorId', retailerShopActivityController.getActivitiesByDistributor);

/**
 * @swagger
 * /api/retailer-shop-activity/shop/{shopId}:
 *   get:
 *     summary: Get retailer shop activities by shop
 *     tags: [Retailer Shop Activity]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shopId
 *         schema:
 *           type: string
 *         required: true
 *         description: Shop ID
 *     responses:
 *       200:
 *         description: List of activities for the shop
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Shop not found
 */
router.get('/shop/:shopId', retailerShopActivityController.getActivitiesByShop);

/**
 * @swagger
 * /api/retailer-shop-activity/alternate-providers:
 *   get:
 *     summary: Get alternate providers with insights
 *     tags: [Retailer Shop Activity]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: distributorId
 *         schema:
 *           type: string
 *         description: Filter by distributor ID
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from date (YYYY-MM-DD)
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to date (YYYY-MM-DD)
 *       - in: query
 *         name: brandName
 *         schema:
 *           type: string
 *         description: Filter by brand name (case insensitive partial match)
 *     responses:
 *       200:
 *         description: List of alternate providers with insights
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.get('/alternate-providers', 
  restrictTo('Admin', 'Mid-Level Manager'),
  retailerShopActivityController.getAlternateProviders);

/**
 * @swagger
 * /api/retailer-shop-activity/{activityId}/alternate-provider/{providerId}/comment:
 *   patch:
 *     summary: Add MLM comment to alternate provider
 *     tags: [Retailer Shop Activity]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: activityId
 *         schema:
 *           type: string
 *         required: true
 *         description: Activity ID
 *       - in: path
 *         name: providerId
 *         schema:
 *           type: string
 *         required: true
 *         description: Alternate provider ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - comment
 *             properties:
 *               comment:
 *                 type: string
 *                 description: MLM comment on alternate provider
 *     responses:
 *       200:
 *         description: Comment added successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Activity or provider not found
 */
router.patch('/:activityId/alternate-provider/:providerId/comment',
  restrictTo('Admin', 'Mid-Level Manager'),
  retailerShopActivityController.addAlternateProviderComment);

// Mobile app routes
const mobileRouter = express.Router();

// Apply protect middleware to all mobile routes
mobileRouter.use(protect);

/**
 * @swagger
 * /api/mobile/retailer-shop-activity:
 *   post:
 *     summary: Create or update retailer shop activity with all data
 *     tags: [Mobile App]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shopId
 *               - distributorId
 *             properties:
 *               shopId:
 *                 type: string
 *                 description: Shop ID
 *               distributorId:
 *                 type: string
 *                 description: Distributor ID
 *               isPunchedIn:
 *                 type: boolean
 *                 description: Whether the staff is punched in
 *               salesOrders:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     brandName:
 *                       type: string
 *                     variant:
 *                       type: string
 *                     size:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                     isDisplayedInCounter:
 *                       type: boolean
 *               alternateProviders:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     for:
 *                       type: string
 *                     brandName:
 *                       type: string
 *                     variant:
 *                       type: string
 *                     size:
 *                       type: string
 *                     rate:
 *                       type: number
 *                     stockDate:
 *                       type: string
 *               complaint:
 *                 type: string
 *               marketInsight:
 *                 type: string
 *               voiceNote:
 *                 type: string
 *               voiceNoteBase64:
 *                 type: string
 *                 format: base64
 *               mobileNumber:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [In Progress, Completed]
 *     responses:
 *       201:
 *         description: Activity created successfully
 *       200:
 *         description: Activity updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Shop or distributor not found
 */
mobileRouter.post(
  '/',
  restrictTo('Marketing Staff'),
  [
    check('shopId', 'Shop ID is required').not().isEmpty(),
    check('distributorId', 'Distributor ID is required').not().isEmpty()
  ],
  retailerShopActivityController.createOrUpdateActivity
);

/**
 * @swagger
 * /api/mobile/retailer-shop-activity/my-activities:
 *   get:
 *     summary: Get logged in marketing staff's retailer shop activities
 *     tags: [Mobile App]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by date in YYYY-MM-DD format
 *       - in: query
 *         name: distributorId
 *         schema:
 *           type: string
 *         description: Filter by distributor ID
 *       - in: query
 *         name: shopId
 *         schema:
 *           type: string
 *         description: Filter by shop ID
 *     responses:
 *       200:
 *         description: List of activities
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
mobileRouter.get(
  '/my-activities',
  restrictTo('Marketing Staff'),
  retailerShopActivityController.getMyActivities
);

/**
 * @swagger
 * /api/mobile/retailer-shop-activity/{id}:
 *   get:
 *     summary: Get a specific retailer shop activity
 *     tags: [Mobile App]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Activity ID
 *     responses:
 *       200:
 *         description: Activity details
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Activity not found
 */
mobileRouter.get('/:id', retailerShopActivityController.getActivity);

/**
 * @swagger
 * /api/mobile/retailer-shop-activity/sales-orders:
 *   get:
 *     summary: Get all sales order activities with details
 *     description: Retrieves detailed information about shop visits and sales orders. Marketing staff can only see their own activities while Admin and Mid-Level Managers can see all activities.
 *     tags: [Mobile App]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from date (YYYY-MM-DD)
 *         example: "2025-06-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to date (YYYY-MM-DD)
 *         example: "2025-06-04"
 *       - in: query
 *         name: distributorId
 *         schema:
 *           type: string
 *         description: Filter by distributor ID
 *       - in: query
 *         name: staffId
 *         schema:
 *           type: string
 *         description: Filter by staff ID
 *     responses:
 *       200:
 *         description: Successfully retrieved sales order activities
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 1
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       activityId:
 *                         type: string
 *                         example: "60d21b4667d0d8992e610c85"
 *                       date:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-06-04T09:00:00Z"
 *                       staffName:
 *                         type: string
 *                         example: "John Doe"
 *                       distributorName:
 *                         type: string
 *                         example: "ABC Distributors"
 *                       distributorAddress:
 *                         type: string
 *                         example: "123 Main St, City"
 *                       shopName:
 *                         type: string
 *                         example: "XYZ Shop"
 *                       shopOwner:
 *                         type: string
 *                         example: "Shop Owner Name"
 *                       shopAddress:
 *                         type: string
 *                         example: "456 Shop St, City"
 *                       shopType:
 *                         type: string
 *                         enum: [Retailer, Whole Seller]
 *                         example: "Retailer"
 *                       punchInTime:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-06-04T09:00:00Z"
 *                       punchOutTime:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-06-04T11:00:00Z"
 *                       status:
 *                         type: string
 *                         enum: [In Progress, Completed]
 *                         example: "Completed"
 *                       salesOrders:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             brandName:
 *                               type: string
 *                               example: "Brand X"
 *                             variant:
 *                               type: string
 *                               example: "Regular"
 *                             size:
 *                               type: string
 *                               example: "100g"
 *                             quantity:
 *                               type: number
 *                               example: 50
 *                             isDisplayedInCounter:
 *                               type: boolean
 *                               example: true
 *                       totalOrderItems:
 *                         type: integer
 *                         example: 1
 *       401:
 *         description: Not authenticated - Valid JWT token required
 *       403:
 *         description: Not authorized - Requires proper role access
 */
mobileRouter.get('/sales-orders', retailerShopActivityController.getSalesOrderActivities);

// Export both routers
module.exports = {
  apiRouter: router,
  mobileRouter: mobileRouter
};