const express = require('express');
const { check } = require('express-validator');
const supplyEstimateController = require('../controllers/supplyEstimateController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply protect middleware to all routes
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Supply Estimates
 *   description: API endpoints for managing distributor supply estimates
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     EstimateItem:
 *       type: object
 *       required:
 *         - productName
 *         - quantity
 *         - units
 *       properties:
 *         productName:
 *           type: string
 *           description: Name of the product
 *         quantity:
 *           type: number
 *           description: Quantity of the product
 *         units:
 *           type: string
 *           description: Units of measurement (e.g., boxes, kg, pieces)
 *         notes:
 *           type: string
 *           description: Optional notes about the product
 *     SupplyEstimate:
 *       type: object
 *       required:
 *         - distributorId
 *         - items
 *         - totalItems
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated ID
 *         distributorId:
 *           type: string
 *           description: ID of the distributor
 *         submittedBy:
 *           type: string
 *           description: ID of the staff member who submitted the estimate
 *         status:
 *           type: string
 *           enum: [Pending, Approved, Rejected]
 *           description: Status of the supply estimate
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/EstimateItem'
 *           description: Array of products with estimated quantities
 *         totalItems:
 *           type: number
 *           description: Total number of product items
 *         notes:
 *           type: string
 *           description: Additional notes or comments
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Date and time when the estimate was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Date and time when the estimate was last updated
 */

/**
 * @swagger
 * /api/supply-estimates:
 *   post:
 *     summary: Submit a new supply estimate for a distributor
 *     tags: [Supply Estimates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - distributorId
 *               - items
 *             properties:
 *               distributorId:
 *                 type: string
 *                 description: ID of the distributor
 *               items:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/EstimateItem'
 *               notes:
 *                 type: string
 *                 description: Additional notes or comments
 *     responses:
 *       201:
 *         description: Supply estimate submitted successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Distributor not found
 */
router.post(
  '/',
  [
    check('distributorId', 'Distributor ID is required').not().isEmpty(),
    check('items', 'Items array is required').isArray({ min: 1 }),
    check('items.*.productName', 'Product name is required for all items').not().isEmpty(),
    check('items.*.quantity', 'Quantity is required for all items').isNumeric(),
    check('items.*.units', 'Units are required for all items').not().isEmpty()
  ],
  supplyEstimateController.createSupplyEstimate
);

/**
 * @swagger
 * /api/supply-estimates:
 *   get:
 *     summary: Get all supply estimates
 *     tags: [Supply Estimates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: distributorId
 *         schema:
 *           type: string
 *         description: Filter by distributor ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, Approved, Rejected]
 *         description: Filter by status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of supply estimates
 *       401:
 *         description: Not authenticated
 */
router.get('/', supplyEstimateController.getAllSupplyEstimates);

/**
 * @swagger
 * /api/supply-estimates/{id}:
 *   get:
 *     summary: Get a supply estimate by ID
 *     tags: [Supply Estimates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Supply estimate ID
 *     responses:
 *       200:
 *         description: Supply estimate details
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Supply estimate not found
 */
router.get('/:id', supplyEstimateController.getSupplyEstimateById);

/**
 * @swagger
 * /api/supply-estimates/{id}/approve:
 *   patch:
 *     summary: Approve a supply estimate
 *     tags: [Supply Estimates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Supply estimate ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 description: Notes regarding approval
 *     responses:
 *       200:
 *         description: Supply estimate approved successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Supply estimate not found
 */
router.patch(
  '/:id/approve',
  restrictTo('Admin', 'Mid-Level Manager'),
  supplyEstimateController.approveSupplyEstimate
);

/**
 * @swagger
 * /api/supply-estimates/{id}/reject:
 *   patch:
 *     summary: Reject a supply estimate
 *     tags: [Supply Estimates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Supply estimate ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for rejection
 *     responses:
 *       200:
 *         description: Supply estimate rejected successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Supply estimate not found
 */
router.patch(
  '/:id/reject',
  restrictTo('Admin', 'Mid-Level Manager'),
  [check('reason', 'Reason for rejection is required').not().isEmpty()],
  supplyEstimateController.rejectSupplyEstimate
);

/**
 * @swagger
 * /api/supply-estimates/distributor/{distributorId}:
 *   get:
 *     summary: Get all supply estimates for a specific distributor
 *     tags: [Supply Estimates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: distributorId
 *         required: true
 *         schema:
 *           type: string
 *         description: Distributor ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, Approved, Rejected]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of supply estimates for the distributor
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Distributor not found
 */
router.get('/distributor/:distributorId', supplyEstimateController.getEstimatesByDistributorId);

/**
 * @swagger
 * /api/supply-estimates/staff/{staffId}:
 *   get:
 *     summary: Get all supply estimates submitted by a specific staff member
 *     tags: [Supply Estimates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: string
 *         description: Staff ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, Approved, Rejected]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of supply estimates submitted by the staff member
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Staff member not found
 */
router.get(
  '/staff/:staffId',
  restrictTo('Admin', 'Mid-Level Manager'),
  supplyEstimateController.getEstimatesByStaffId
);

module.exports = router; 