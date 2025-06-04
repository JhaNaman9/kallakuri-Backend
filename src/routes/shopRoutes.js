const express = require('express');
const { check } = require('express-validator');
const shopController = require('../controllers/shopController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply protect middleware to all routes
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Shops
 *   description: API endpoints for managing shops
 */

/**
 * @swagger
 * /api/shops:
 *   post:
 *     summary: Create a new shop
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - ownerName
 *               - address
 *               - type
 *               - distributorId
 *             properties:
 *               name:
 *                 type: string
 *                 description: Shop name
 *               ownerName:
 *                 type: string
 *                 description: Shop owner name
 *               address:
 *                 type: string
 *                 description: Shop address
 *               type:
 *                 type: string
 *                 enum: [Retailer, Whole Seller]
 *                 description: Shop type
 *               distributorId:
 *                 type: string
 *                 description: ID of the distributor this shop is associated with
 *     responses:
 *       201:
 *         description: Shop created successfully
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
  restrictTo('Admin', 'Mid-Level Manager', 'Marketing Staff'),
  [
    check('name', 'Shop name is required').not().isEmpty(),
    check('ownerName', 'Shop owner name is required').not().isEmpty(),
    check('address', 'Shop address is required').not().isEmpty(),
    check('type', 'Shop type must be either Retailer or Whole Seller')
      .isIn(['Retailer', 'Whole Seller']),
    check('distributorId', 'Distributor ID is required').isMongoId()
  ],
  shopController.addShop
);

/**
 * @swagger
 * /api/shops/distributor/{distributorId}:
 *   get:
 *     summary: Get all shops for a specific distributor
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: distributorId
 *         schema:
 *           type: string
 *         required: true
 *         description: Distributor ID
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [Retailer, Whole Seller]
 *         description: Filter by shop type
 *     responses:
 *       200:
 *         description: List of shops for the distributor
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Distributor not found
 */
router.get(
  '/distributor/:distributorId',
  restrictTo('Admin', 'Mid-Level Manager', 'Marketing Staff'),
  shopController.getShopsByDistributor
);

/**
 * @swagger
 * /api/shops/{id}:
 *   get:
 *     summary: Get a shop by ID
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Shop ID
 *     responses:
 *       200:
 *         description: Shop details
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Shop not found
 */
router.get(
  '/:id',
  restrictTo('Admin', 'Mid-Level Manager', 'Marketing Staff'),
  shopController.getShopById
);

/**
 * @swagger
 * /api/shops/{id}:
 *   put:
 *     summary: Update a shop
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Shop ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Shop name
 *               ownerName:
 *                 type: string
 *                 description: Shop owner name
 *               address:
 *                 type: string
 *                 description: Shop address
 *               type:
 *                 type: string
 *                 enum: [Retailer, Whole Seller]
 *                 description: Shop type
 *               distributorId:
 *                 type: string
 *                 description: ID of the distributor this shop is associated with
 *     responses:
 *       200:
 *         description: Shop updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Shop not found
 */
router.put(
  '/:id',
  restrictTo('Admin', 'Mid-Level Manager', 'Marketing Staff'),
  [
    check('name', 'Shop name is required if provided').optional().not().isEmpty(),
    check('ownerName', 'Shop owner name is required if provided').optional().not().isEmpty(),
    check('address', 'Shop address is required if provided').optional().not().isEmpty(),
    check('type', 'Shop type must be either Retailer or Whole Seller if provided')
      .optional()
      .isIn(['Retailer', 'Whole Seller']),
    check('distributorId', 'Distributor ID must be valid if provided')
      .optional()
      .isMongoId()
  ],
  shopController.updateShop
);

/**
 * @swagger
 * /api/shops/{id}:
 *   delete:
 *     summary: Delete a shop (soft delete)
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Shop ID
 *     responses:
 *       200:
 *         description: Shop deleted successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Shop not found
 */
router.delete(
  '/:id',
  restrictTo('Admin', 'Mid-Level Manager'),
  shopController.deleteShop
);

// Mobile routes
const mobileRouter = express.Router();

// Apply protect middleware to all mobile routes
mobileRouter.use(protect);

/**
 * @swagger
 * /api/mobile/shops:
 *   post:
 *     summary: Add a new shop from mobile app
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
 *               - name
 *               - ownerName
 *               - address
 *               - type
 *               - distributorId
 *             properties:
 *               name:
 *                 type: string
 *                 description: Shop name
 *               ownerName:
 *                 type: string
 *                 description: Shop owner name
 *               address:
 *                 type: string
 *                 description: Shop address
 *               type:
 *                 type: string
 *                 enum: [Retailer, Whole Seller]
 *                 description: Shop type
 *               distributorId:
 *                 type: string
 *                 description: ID of the distributor this shop is associated with
 *     responses:
 *       201:
 *         description: Shop created successfully
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
 *                     name:
 *                       type: string
 *                       example: "ABC Retailer"
 *                     ownerName:
 *                       type: string
 *                       example: "John Doe"
 *                     address:
 *                       type: string
 *                       example: "123 Main St, City"
 *                     type:
 *                       type: string
 *                       example: "Retailer"
 *                     distributorId:
 *                       type: string
 *                       example: "60d21b1c67d0d8992e610c83"
 *                     createdBy:
 *                       type: string
 *                       example: "60d21b1c67d0d8992e610c83"
 *                     isActive:
 *                       type: boolean
 *                       example: true
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
 *       404:
 *         description: Distributor not found
 */
mobileRouter.post(
  '/',
  restrictTo('Marketing Staff'),
  [
    check('name', 'Shop name is required').not().isEmpty(),
    check('ownerName', 'Shop owner name is required').not().isEmpty(),
    check('address', 'Shop address is required').not().isEmpty(),
    check('type', 'Shop type must be either Retailer or Whole Seller')
      .isIn(['Retailer', 'Whole Seller']),
    check('distributorId', 'Distributor ID is required').isMongoId()
  ],
  shopController.addShop
);

/**
 * @swagger
 * /api/mobile/shops/distributor/{distributorId}:
 *   get:
 *     summary: Get all shops for a specific distributor from mobile app
 *     tags: [Mobile App]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: distributorId
 *         schema:
 *           type: string
 *         required: true
 *         description: Distributor ID
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [Retailer, Whole Seller]
 *         description: Filter by shop type
 *     responses:
 *       200:
 *         description: List of shops for the distributor
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
 *                       name:
 *                         type: string
 *                         example: "ABC Retailer"
 *                       ownerName:
 *                         type: string
 *                         example: "John Doe"
 *                       address:
 *                         type: string
 *                         example: "123 Main St, City"
 *                       type:
 *                         type: string
 *                         example: "Retailer"
 *                       distributorId:
 *                         type: string
 *                         example: "60d21b1c67d0d8992e610c83"
 *                       isActive:
 *                         type: boolean
 *                         example: true
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Distributor not found
 */
mobileRouter.get(
  '/distributor/:distributorId',
  restrictTo('Marketing Staff'),
  shopController.getShopsByDistributor
);

module.exports = {
  apiRouter: router,
  mobileRouter: mobileRouter
}; 