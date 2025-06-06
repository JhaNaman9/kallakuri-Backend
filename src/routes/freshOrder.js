const express = require('express');
const router = express.Router();
const freshOrderController = require('../controllers/freshOrderController');


const { protect } = require('../middleware/authMiddleware');

/**
 * @swagger
 * /api/mobile/fresh-orders:
 *   post:
 *     summary: Create fresh sales orders for a shop by marketing staff
 *     tags:
 *       - Orders
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
 *               - shopId
 *               - orders
 *             properties:
 *               distributorId:
 *                 type: string
 *                 description: The distributor's ObjectId
 *               shopId:
 *                 type: string
 *                 description: The shop's ObjectId
 *               orders:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - brandName
 *                     - quantity
 *                     - size
 *                     - variant
 *                   properties:
 *                     brandName:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                     size:
 *                       type: string
 *                     variant:
 *                       type: string
 *     responses:
 *       201:
 *         description: Sales orders created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/RetailerShopActivity'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
/**
 * @swagger
 * /api/mobile/fresh-orders:
 *   get:
 *     summary: Get today's sales order for a shop and distributor (role-based)
 *     description: |
 *       - Only marketing staff and admin can access this endpoint (must pass JWT token).
 *       - Marketing staff will see only their own orders.
 *       - Admin will see all orders for the given shop and distributor.
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sales order details found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     shopId:
 *                       type: string
 *                     shopName:
 *                       type: string
 *                     distributorId:
 *                       type: string
 *                     distributorName:
 *                       type: string
 *                     marketingStaffId:
 *                       type: string
 *                     salesOrders:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           brandName:
 *                             type: string
 *                           quantity:
 *                             type: number
 *                           size:
 *                             type: string
 *                           variant:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           createdBy:
 *                             type: string
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No order found
 *       500:
 *         description: Server error
 */
router.get('/fresh-orders', protect, freshOrderController.getFreshOrder);

router.post('/fresh-orders', protect, freshOrderController.createFreshOrder);

module.exports = router;
