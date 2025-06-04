const express = require('express');
const { check, param } = require('express-validator');
const brandController = require('../controllers/brandController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply protect middleware to all routes
router.use(protect);

/**
 * @swagger
 * /api/brands:
 *   get:
 *     summary: Get all brands
 *     tags: [Brands]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of brands
 *       401:
 *         description: Not authenticated
 */
router.get('/', brandController.getBrands);

/**
 * @swagger
 * /api/brands/{id}:
 *   get:
 *     summary: Get a brand by ID
 *     tags: [Brands]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Brand ID
 *     responses:
 *       200:
 *         description: Brand data
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Brand not found
 */
router.get('/:id', brandController.getBrand);

/**
 * @swagger
 * /api/brands:
 *   post:
 *     summary: Create a new brand
 *     tags: [Brands]
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
 *             properties:
 *               name:
 *                 type: string
 *                 description: Brand name
 *               description:
 *                 type: string
 *                 description: Brand description
 *     responses:
 *       201:
 *         description: Brand created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.post(
  '/',
  restrictTo('Admin'),
  [
    check('name', 'Name is required').not().isEmpty(),
  ],
  brandController.createBrand
);

/**
 * @swagger
 * /api/brands/{id}:
 *   put:
 *     summary: Update a brand
 *     tags: [Brands]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Brand ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Brand name
 *               description:
 *                 type: string
 *                 description: Brand description
 *               isActive:
 *                 type: boolean
 *                 description: Whether the brand is active
 *     responses:
 *       200:
 *         description: Brand updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Brand not found
 */
router.put(
  '/:id',
  restrictTo('Admin'),
  [
    param('id', 'Brand ID must be a valid MongoDB ID').isMongoId(),
    check('name', 'Name is required').optional().not().isEmpty(),
  ],
  brandController.updateBrand
);

/**
 * @swagger
 * /api/brands/{id}:
 *   delete:
 *     summary: Delete a brand (soft delete)
 *     tags: [Brands]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Brand ID
 *     responses:
 *       200:
 *         description: Brand deleted successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Brand not found
 */
router.delete(
  '/:id',
  restrictTo('Admin'),
  [
    param('id', 'Brand ID must be a valid MongoDB ID').isMongoId()
  ],
  brandController.deleteBrand
);

module.exports = router; 