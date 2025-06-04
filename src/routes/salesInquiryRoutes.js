const express = require('express');
const { check, param } = require('express-validator');
const salesInquiryController = require('../controllers/salesInquiryController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply protect middleware to all routes
router.use(protect);

/**
 * @swagger
 * /api/sales-inquiries:
 *   post:
 *     summary: Create a new sales inquiry
 *     description: Submit a new sales inquiry for a distributor with multiple products
 *     tags: [Sales Inquiries]
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
 *               - distributorName
 *               - products
 *             properties:
 *               distributorId:
 *                 type: string
 *                 description: ID of the distributor
 *               distributorName:
 *                 type: string
 *                 description: Name of the distributor
 *               products:
 *                 type: array
 *                 description: Array of products for the inquiry
 *                 items:
 *                   type: object
 *                   required:
 *                     - brand
 *                     - variant
 *                     - size
 *                     - quantity
 *                   properties:
 *                     brand:
 *                       type: string
 *                       description: Brand name
 *                     variant:
 *                       type: string
 *                       description: Variant of the product
 *                     size:
 *                       type: string
 *                       description: Size of the product
 *                     quantity:
 *                       type: integer
 *                       description: Quantity requested
 *     responses:
 *       201:
 *         description: Sales inquiry created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Not authenticated
 */
router.post(
  '/',
  [
    check('distributorId', 'Distributor ID is required').notEmpty().isMongoId(),
    check('distributorName', 'Distributor name is required').notEmpty(),
    check('products', 'Products array is required').isArray({ min: 1 }),
    check('products.*.brand', 'Brand name is required for all products').notEmpty(),
    check('products.*.variant', 'Variant is required for all products').notEmpty(),
    check('products.*.size', 'Size is required for all products').notEmpty(),
    check('products.*.quantity', 'Quantity is required for all products').isInt({ min: 1 })
  ],
  salesInquiryController.createSalesInquiry
);

/**
 * @swagger
 * /api/sales-inquiries:
 *   get:
 *     summary: Get all sales inquiries
 *     description: Retrieve all sales inquiries with optional filtering by status or distributor
 *     tags: [Sales Inquiries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, Processing, Completed, Rejected]
 *         description: Filter inquiries by status
 *       - in: query
 *         name: distributorId
 *         schema:
 *           type: string
 *         description: Filter inquiries by distributor ID
 *     responses:
 *       200:
 *         description: List of sales inquiries
 *       401:
 *         description: Not authenticated
 */
router.get('/', salesInquiryController.getAllSalesInquiries);

/**
 * @swagger
 * /api/sales-inquiries/user:
 *   get:
 *     summary: Get current user's sales inquiries
 *     description: Retrieve all sales inquiries created by the current user
 *     tags: [Sales Inquiries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, Processing, Completed, Rejected]
 *         description: Filter inquiries by status
 *     responses:
 *       200:
 *         description: List of user's sales inquiries
 *       401:
 *         description: Not authenticated
 */
router.get('/user', salesInquiryController.getUserSalesInquiries);

/**
 * @swagger
 * /api/sales-inquiries/{id}:
 *   get:
 *     summary: Get a single sales inquiry
 *     description: Retrieve a specific sales inquiry by ID
 *     tags: [Sales Inquiries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sales inquiry ID
 *     responses:
 *       200:
 *         description: Sales inquiry details
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized to view this inquiry
 *       404:
 *         description: Sales inquiry not found
 */
router.get('/:id', salesInquiryController.getSalesInquiry);

/**
 * @swagger
 * /api/sales-inquiries/{id}:
 *   patch:
 *     summary: Update sales inquiry status
 *     description: Update the status of a sales inquiry
 *     tags: [Sales Inquiries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sales inquiry ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Processing, Completed, Rejected]
 *                 description: New status for the inquiry
 *               notes:
 *                 type: string
 *                 description: Notes about the processing of the inquiry
 *     responses:
 *       200:
 *         description: Sales inquiry status updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized to update this inquiry
 *       404:
 *         description: Sales inquiry not found
 */
router.patch(
  '/:id',
  restrictTo('Administrator', 'Admin', 'Mid-Level Manager'),
  [
    param('id', 'Invalid sales inquiry ID').isMongoId(),
    check('status', 'Status is required').notEmpty(),
    check('status', 'Status must be Processing, Completed, or Rejected').isIn([
      'Processing', 'Completed', 'Rejected'
    ]),
    check('notes', 'Notes must be a string').optional().isString()
  ],
  salesInquiryController.updateSalesInquiryStatus
);

/**
 * @swagger
 * /api/sales-inquiries/{id}/comment:
 *   patch:
 *     summary: Add manager comment to sales inquiry
 *     description: Mid-Level Manager adds a comment to a sales inquiry
 *     tags: [Sales Inquiries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sales inquiry ID
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
 *                 description: Comment from the mid-level manager
 *     responses:
 *       200:
 *         description: Comment added successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Sales inquiry not found
 */
router.patch(
  '/:id/comment',
  restrictTo('Mid-Level Manager', 'Administrator', 'Admin'),
  [
    param('id', 'Invalid sales inquiry ID').isMongoId(),
    check('comment', 'Comment is required').notEmpty()
  ],
  salesInquiryController.addManagerComment
);

/**
 * @swagger
 * /api/sales-inquiries/{id}:
 *   delete:
 *     summary: Delete a sales inquiry
 *     description: Delete a specific sales inquiry by ID (Admin only)
 *     tags: [Sales Inquiries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sales inquiry ID
 *     responses:
 *       200:
 *         description: Sales inquiry deleted successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized to delete this inquiry
 *       404:
 *         description: Sales inquiry not found
 */
router.delete(
  '/:id',
  restrictTo('Administrator', 'Admin'),
  param('id', 'Invalid sales inquiry ID').isMongoId(),
  salesInquiryController.deleteSalesInquiry
);

module.exports = router; 