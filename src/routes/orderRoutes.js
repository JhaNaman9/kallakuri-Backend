const express = require('express');
const { check, param } = require('express-validator');
const orderController = require('../controllers/orderController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply protect middleware to all routes
router.use(protect);

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Create a new order request
 *     description: Marketing Staff submits an order request for a distributor
 *     tags: [Orders]
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
 *                 description: Distributor ID
 *               items:
 *                 type: array
 *                 description: Array of order items
 *                 items:
 *                   type: object
 *                   required:
 *                     - productName
 *                     - quantity
 *                     - unit
 *                   properties:
 *                     productName:
 *                       type: string
 *                       description: Product name
 *                     quantity:
 *                       type: number
 *                       description: Quantity
 *                     unit:
 *                       type: string
 *                       description: Unit of measurement
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Distributor not found
 */
router.post(
  '/',
  restrictTo('Marketing Staff'),
  [
    check('distributorId', 'Distributor ID is required').not().isEmpty().isMongoId(),
    check('items', 'Items must be an array with at least one item').isArray({ min: 1 }),
    check('items.*.productName', 'Product name is required for each item').not().isEmpty(),
    check('items.*.quantity', 'Quantity is required and must be a positive number for each item').isInt({ min: 1 }),
    check('items.*.unit', 'Unit is required for each item').not().isEmpty()
  ],
  orderController.createOrder
);

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Get all orders
 *     description: Get orders with optional filters (distributor, status). Mid-Level Manager sees all orders, Marketing Staff sees only their own orders.
 *     tags: [Orders]
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
 *           enum: [Requested, Approved, Rejected, Dispatched]
 *         description: Filter by order status
 *     responses:
 *       200:
 *         description: List of orders
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.get('/', restrictTo('Mid-Level Manager', 'Marketing Staff', 'Godown Incharge'), orderController.getOrders);

/**
 * @swagger
 * /orders/{orderId}:
 *   get:
 *     summary: Get a single order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         schema:
 *           type: string
 *         required: true
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order details
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Order not found
 */
router.get(
  '/:orderId',
  restrictTo('Mid-Level Manager', 'Marketing Staff', 'Godown Incharge'),
  [
    param('orderId', 'Order ID must be a valid MongoDB ID').isMongoId()
  ],
  orderController.getOrder
);

/**
 * @swagger
 * /orders/track/{orderId}:
 *   get:
 *     summary: Track order status
 *     description: Mid-Level Manager tracks order from request to dispatch
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         schema:
 *           type: string
 *         required: true
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order tracking information
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Order not found
 */
router.get(
  '/track/:orderId',
  restrictTo('Mid-Level Manager', 'Marketing Staff', 'Godown Incharge'),
  [
    param('orderId', 'Order ID must be a valid MongoDB ID').isMongoId()
  ],
  orderController.trackOrder
);

/**
 * @swagger
 * /orders/{orderId}/approve:
 *   patch:
 *     summary: Approve or reject an order
 *     description: Mid-Level Manager approves or rejects an order with comments
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         schema:
 *           type: string
 *         required: true
 *         description: Order ID
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
 *                 enum: [Approved, Rejected]
 *                 description: Approval status
 *               comments:
 *                 type: string
 *                 description: Comments on the order
 *     responses:
 *       200:
 *         description: Order approved/rejected successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Order not found
 */
router.patch(
  '/:orderId/approve',
  restrictTo('Mid-Level Manager'),
  [
    param('orderId', 'Order ID must be a valid MongoDB ID').isMongoId(),
    check('status', 'Status is required and must be Approved or Rejected')
      .not().isEmpty()
      .isIn(['Approved', 'Rejected']),
    check('comments', 'Comments are required').not().isEmpty()
  ],
  orderController.approveOrder
);

/**
 * @swagger
 * /orders/{orderId}/dispatch:
 *   patch:
 *     summary: Dispatch an order
 *     description: Godown Incharge updates the order status to Dispatched
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         schema:
 *           type: string
 *         required: true
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order dispatched successfully
 *       400:
 *         description: Invalid input data or order not in Approved state
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Order not found
 */
router.patch(
  '/:orderId/dispatch',
  restrictTo('Godown Incharge'),
  [
    param('orderId', 'Order ID must be a valid MongoDB ID').isMongoId()
  ],
  orderController.dispatchOrder
);

module.exports = router; 