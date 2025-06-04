const express = require('express');
const { check, query } = require('express-validator');
const marketingStaffActivityController = require('../controllers/marketingStaffActivityController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply protect middleware to all routes
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Marketing Staff Activity
 *   description: API endpoints for managing marketing staff activities
 */

/**
 * @swagger
   * /marketing-activity:
 *   get:
 *     summary: Get marketing staff activities with filtering and pagination
 *     description: Get marketing staff activities with optional filters for staff, date range, distributor, and status
 *     tags: [Marketing Staff Activity]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: staffId
 *         schema:
 *           type: string
 *         required: false
 *         description: Marketing staff member ID
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
 *         description: Status filter (Punched In, Punched Out)
 *       - in: query
 *         name: distributor
 *         schema:
 *           type: string
 *         required: false
 *         description: Distributor name (partial match)
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
 *         description: List of marketing staff activities
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.get('/', 
  restrictTo('Admin', 'Mid-Level Manager'),
  marketingStaffActivityController.getMarketingActivities
);

/**
 * @swagger
 * /api/marketing-activity/{id}:
 *   get:
 *     summary: Get a single marketing activity
 *     tags: [Marketing Staff Activity]
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "60d21b4667d0d8992e610c85"
 *                     marketingStaffId:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: "60d21b1c67d0d8992e610c83"
 *                         name:
 *                           type: string
 *                           example: "John Doe"
 *                         email:
 *                           type: string
 *                           example: "john@example.com"
 *                         role:
 *                           type: string
 *                           example: "Marketing Staff"
 *                     retailShop:
 *                       type: string
 *                       example: "SuperMart"
 *                     distributor:
 *                       type: string
 *                       example: "Distribution Inc."
 *                     areaName:
 *                       type: string
 *                       example: "Downtown"
 *                     tripCompanion:
 *                       type: object
 *                       properties:
 *                         category:
 *                           type: string
 *                           example: "Marketing Staff"
 *                         name:
 *                           type: string
 *                           example: "Jane Smith"
 *                     modeOfTransport:
 *                       type: string
 *                       example: "Car"
 *                     meetingStartTime:
 *                       type: string
 *                       format: date-time
 *                       example: "2023-07-21T10:30:00.000Z"
 *                     meetingEndTime:
 *                       type: string
 *                       format: date-time
 *                       example: "2023-07-21T12:45:00.000Z"
 *                     durationMinutes:
 *                       type: integer
 *                       example: 135
 *                     selfieImage:
 *                       type: string
 *                       example: "/uploads/selfies/selfie_60f7b0b3c9d4a84e8c9d4a84_1689939000000.jpg"
 *                     shopTypes:
 *                       type: array
 *                       items:
 *                         type: string
 *                         enum: ["Retailer", "Whole Seller"]
 *                         example: "Retailer"
 *                     shops:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             example: "Nandu Shop"
 *                           type:
 *                             type: string
 *                             enum: ["Retailer", "Whole Seller"]
 *                             example: "Retailer"
 *                     shopsVisitedCount:
 *                       type: integer
 *                       example: 4
 *                     otherDistributorsVisited:
 *                       type: array
 *                       items:
 *                         type: string
 *                         example: "Another Distributor"
 *                     brandSupplyEstimates:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "60d21b4667d0d8992e610c10"
 *                           name:
 *                             type: string
 *                             example: "KG Brand"
 *                           variants:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 _id:
 *                                   type: string
 *                                   example: "60d21b4667d0d8992e610c11"
 *                                 name:
 *                                   type: string
 *                                   example: "pouch"
 *                                 sizes:
 *                                   type: array
 *                                   items:
 *                                     type: object
 *                                     properties:
 *                                       _id:
 *                                         type: string
 *                                         example: "60d21b4667d0d8992e610c12"
 *                                       name:
 *                                         type: string
 *                                         example: "100g"
 *                                       openingStock:
 *                                         type: number
 *                                         example: 50
 *                                       proposedMarketRate:
 *                                         type: number
 *                                         example: 45.5
 *                     status:
 *                       type: string
 *                       enum: ["Punched In", "Punched Out", "Completed"]
 *                       example: "Punched Out"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2023-07-21T10:30:00.000Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2023-07-21T12:45:00.000Z"
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Activity not found
 */
router.get('/:id', marketingStaffActivityController.getMarketingActivity);

// Mobile app routes
const mobileRouter = express.Router();

// Apply protect middleware to all mobile routes
mobileRouter.use(protect);

/**
 * @swagger
 * /api/mobile/marketing-activity/punch-in:
 *   post:
 *     summary: Punch in a marketing staff activity
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
 *               - retailShop
 *               - distributor
 *               - areaName
 *               - tripCompanion
 *               - modeOfTransport
 *               - selfieImage
 *               - shopTypes
 *             properties:
 *               retailShop:
 *                 type: string
 *                 description: Retail shop name
 *               distributor:
 *                 type: string
 *                 description: Distributor name
 *               areaName:
 *                 type: string
 *                 description: Area name
 *               tripCompanion:
 *                 type: object
 *                 required:
 *                   - category
 *                   - name
 *                 properties:
 *                   category:
 *                     type: string
 *                     enum: [Distributor Staff, Marketing Staff, Other]
 *                     description: Trip companion category
 *                   name:
 *                     type: string
 *                     description: Trip companion name
 *               modeOfTransport:
 *                 type: string
 *                 description: Mode of transport
 *               selfieImage:
 *                 type: string
 *                 format: base64
 *                 description: Base64 encoded selfie image
 *               shopTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [Retailer, Whole Seller]
 *                 description: Shop types
 *               shops:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - name
 *                     - type
 *                   properties:
 *                     name:
 *                       type: string
 *                       description: Shop name
 *                     type:
 *                       type: string
 *                       enum: [Retailer, Whole Seller]
 *                       description: Shop type
 *               brandSupplyEstimates:
 *                 type: array
 *                 description: List of brands with their variants and sizes
 *                 items:
 *                   type: object
 *                   required:
 *                     - name
 *                     - variants
 *                   properties:
 *                     _id:
 *                       type: string
 *                       description: Brand ID (optional, will be auto-generated if empty)
 *                     name:
 *                       type: string
 *                       description: Brand name
 *                     variants:
 *                       type: array
 *                       description: List of variants for this brand
 *                       items:
 *                         type: object
 *                         required:
 *                           - name
 *                           - sizes
 *                         properties:
 *                           _id:
 *                             type: string
 *                             description: Variant ID (optional, will be auto-generated if empty)
 *                           name:
 *                             type: string
 *                             description: Variant name (e.g., 'pouch', 'tin')
 *                           sizes:
 *                             type: array
 *                             description: List of sizes for this variant
 *                             items:
 *                               type: object
 *                               required:
 *                                 - name
 *                               properties:
 *                                 _id:
 *                                   type: string
 *                                   description: Size ID (optional, will be auto-generated if empty)
 *                                 name:
 *                                   type: string
 *                                   description: Size name (e.g., '100g', '200g', '500g')
 *                                 openingStock:
 *                                   type: number
 *                                   description: Opening stock quantity
 *                                 proposedMarketRate:
 *                                   type: number
 *                                   description: Proposed market rate
 *     responses:
 *       201:
 *         description: Activity created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "60d21b4667d0d8992e610c85"
 *                     marketingStaffId:
 *                       type: string
 *                       example: "60d21b1c67d0d8992e610c83"
 *                     retailShop:
 *                       type: string
 *                       example: "SuperMart"
 *                     distributor:
 *                       type: string
 *                       example: "Distribution Inc."
 *                     areaName:
 *                       type: string
 *                       example: "Downtown"
 *                     tripCompanion:
 *                       type: object
 *                       properties:
 *                         category:
 *                           type: string
 *                           example: "Marketing Staff"
 *                         name:
 *                           type: string
 *                           example: "John Doe"
 *                     modeOfTransport:
 *                       type: string
 *                       example: "Car"
 *                     meetingStartTime:
 *                       type: string
 *                       format: date-time
 *                     brandSupplyEstimates:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "60d21b4667d0d8992e610c10"
 *                           name:
 *                             type: string
 *                             example: "KG Brand"
 *                           variants:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 _id:
 *                                   type: string
 *                                   example: "60d21b4667d0d8992e610c11"
 *                                 name:
 *                                   type: string
 *                                   example: "pouch"
 *                                 sizes:
 *                                   type: array
 *                                   items:
 *                                     type: object
 *                                     properties:
 *                                       _id:
 *                                         type: string
 *                                         example: "60d21b4667d0d8992e610c12"
 *                                       name:
 *                                         type: string
 *                                         example: "100g"
 *                                       openingStock:
 *                                         type: number
 *                                         example: 50
 *                                       proposedMarketRate:
 *                                         type: number
 *                                         example: 45.5
 *                     selfieImage:
 *                       type: string
 *                     shopTypes:
 *                       type: array
 *                       items:
 *                         type: string
 *                     shops:
 *                       type: array
 *                       items:
 *                         type: object
 *                     status:
 *                       type: string
 *                       example: "Punched In"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
mobileRouter.post(
  '/punch-in',
  restrictTo('Marketing Staff'),
  [
    check('retailShop', 'Retail shop name is required').not().isEmpty(),
    check('distributor', 'Distributor name is required').not().isEmpty(),
    check('areaName', 'Area name is required').not().isEmpty(),
    check('tripCompanion', 'Trip companion is required').isObject(),
    check('tripCompanion.category', 'Trip companion category is required')
      .isIn(['Distributor Staff', 'Marketing Staff', 'Other']),
    check('tripCompanion.name', 'Trip companion name is required').not().isEmpty(),
    check('modeOfTransport', 'Mode of transport is required').not().isEmpty(),
    check('selfieImage', 'Selfie image is required').not().isEmpty(),
    check('shopTypes', 'Shop types is required').isArray({ min: 1 }),
    check('shopTypes.*', 'Shop type must be either Retailer or Whole Seller')
      .isIn(['Retailer', 'Whole Seller']),
    // More flexible validation for brands
    check('brandSupplyEstimates')
      .optional()
      .isArray()
      .withMessage('Brand supply estimates must be an array'),
    check('brandSupplyEstimates.*.name')
      .optional()
      .isString()
      .withMessage('Brand name must be a string')
  ],
  marketingStaffActivityController.punchIn
);

/**
 * @swagger
 * /api/mobile/marketing-activity/{id}/punch-out:
 *   patch:
 *     summary: Punch out a marketing staff activity
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - distributorId
 *             properties:
 *               distributorId:
 *                 type: string
 *                 description: ID of the distributor where marketing staff is punching out from
 *     responses:
 *       200:
 *         description: Successfully punched out
 *       400:
 *         description: Validation error or already punched out
 *       404:
 *         description: Activity not found
 */
mobileRouter.patch(
  '/:id/punch-out',
  restrictTo('Marketing Staff'),
  marketingStaffActivityController.punchOut
);

/**
 * @swagger
 * /api/mobile/marketing-activity/my-activities:
 *   get:
 *     summary: Get logged in marketing staff's activities
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
 *     responses:
 *       200:
 *         description: List of activities
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
 *                   example: 2
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: "60d21b4667d0d8992e610c85"
 *                       marketingStaffId:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "60d21b1c67d0d8992e610c83"
 *                           name:
 *                             type: string
 *                             example: "John Doe"
 *                           email:
 *                             type: string
 *                             example: "john@example.com"
 *                       retailShop:
 *                         type: string
 *                         example: "SuperMart"
 *                       distributor:
 *                         type: string
 *                         example: "Distribution Inc."
 *                       areaName:
 *                         type: string
 *                         example: "Downtown"
 *                       tripCompanion:
 *                         type: object
 *                         properties:
 *                           category:
 *                             type: string
 *                             example: "Marketing Staff"
 *                           name:
 *                             type: string
 *                             example: "Jane Smith"
 *                       modeOfTransport:
 *                         type: string
 *                         example: "Car"
 *                       meetingStartTime:
 *                         type: string
 *                         format: date-time
 *                         example: "2023-07-21T10:30:00.000Z"
 *                       meetingEndTime:
 *                         type: string
 *                         format: date-time
 *                         example: "2023-07-21T12:45:00.000Z"
 *                       durationMinutes:
 *                         type: integer
 *                         example: 135
 *                       selfieImage:
 *                         type: string
 *                         example: "/uploads/selfies/selfie_60f7b0b3c9d4a84e8c9d4a84_1689939000000.jpg"
 *                       shopTypes:
 *                         type: array
 *                         items:
 *                           type: string
 *                           enum: ["Retailer", "Whole Seller"]
 *                           example: "Retailer"
 *                       shops:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             name:
 *                               type: string
 *                               example: "Nandu Shop"
 *                             type:
 *                               type: string
 *                               enum: ["Retailer", "Whole Seller"]
 *                               example: "Retailer"
 *                       shopsVisitedCount:
 *                         type: integer
 *                         example: 4
 *                       brandSupplyEstimates:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             _id:
 *                               type: string
 *                               example: "60d21b4667d0d8992e610c10"
 *                             name:
 *                               type: string
 *                               example: "KG Brand"
 *                             variants:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   _id:
 *                                     type: string
 *                                     example: "60d21b4667d0d8992e610c11"
 *                                   name:
 *                                     type: string
 *                                     example: "pouch"
 *                                   sizes:
 *                                     type: array
 *                                     items:
 *                                       type: object
 *                                       properties:
 *                                         _id:
 *                                           type: string
 *                                           example: "60d21b4667d0d8992e610c12"
 *                                         name:
 *                                           type: string
 *                                           example: "100g"
 *                                         openingStock:
 *                                           type: number
 *                                           example: 50
 *                                         proposedMarketRate:
 *                                           type: number
 *                                           example: 45.5
 *                       status:
 *                         type: string
 *                         enum: ["Punched In", "Punched Out", "Completed"]
 *                         example: "Punched Out"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2023-07-21T10:30:00.000Z"
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2023-07-21T12:45:00.000Z"
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
mobileRouter.get(
  '/my-activities',
  restrictTo('Marketing Staff'),
  marketingStaffActivityController.getMyActivities
);

// Export both routers
module.exports = {
  apiRouter: router,
  mobileRouter: mobileRouter
};