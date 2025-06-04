const express = require('express');
const { check, param } = require('express-validator');
const variantController = require('../controllers/variantController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply protect middleware to all routes
router.use(protect);

/**
 * @swagger
 * /api/variants:
 *   get:
 *     summary: Get all variants
 *     tags: [Variants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: Filter by brand ID
 *     responses:
 *       200:
 *         description: List of variants
 *       401:
 *         description: Not authenticated
 */
router.get('/', variantController.getVariants);

/**
 * @swagger
 * /api/variants/{id}:
 *   get:
 *     summary: Get a variant by ID
 *     tags: [Variants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Variant ID
 *     responses:
 *       200:
 *         description: Variant data
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Variant not found
 */
router.get('/:id', variantController.getVariant);

/**
 * @swagger
 * /api/variants:
 *   post:
 *     summary: Create a new variant
 *     tags: [Variants]
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
 *               - brand
 *             properties:
 *               name:
 *                 type: string
 *                 description: Variant name
 *               brand:
 *                 type: string
 *                 description: Brand ID
 *               sizes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       description: Size name
 *     responses:
 *       201:
 *         description: Variant created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Brand not found
 */
router.post(
  '/',
  restrictTo('Admin'),
  [
    check('name', 'Name is required').not().isEmpty(),
    check('brand', 'Brand ID is required').isMongoId()
  ],
  variantController.createVariant
);

/**
 * @swagger
 * /api/variants/{id}:
 *   put:
 *     summary: Update a variant
 *     tags: [Variants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Variant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Variant name
 *               brand:
 *                 type: string
 *                 description: Brand ID
 *               sizes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       description: Size name
 *               isActive:
 *                 type: boolean
 *                 description: Whether the variant is active
 *     responses:
 *       200:
 *         description: Variant updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Variant not found or Brand not found
 */
router.put(
  '/:id',
  restrictTo('Admin'),
  [
    param('id', 'Variant ID must be a valid MongoDB ID').isMongoId(),
    check('name', 'Name is required').optional().not().isEmpty(),
    check('brand', 'Brand ID must be a valid MongoDB ID').optional().isMongoId()
  ],
  variantController.updateVariant
);

/**
 * @swagger
 * /api/variants/{id}:
 *   delete:
 *     summary: Delete a variant (soft delete)
 *     tags: [Variants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Variant ID
 *     responses:
 *       200:
 *         description: Variant deleted successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Variant not found
 */
router.delete(
  '/:id',
  restrictTo('Admin'),
  [
    param('id', 'Variant ID must be a valid MongoDB ID').isMongoId()
  ],
  variantController.deleteVariant
);

/**
 * @swagger
 * /api/variants/{id}/sizes:
 *   post:
 *     summary: Add a size to a variant
 *     tags: [Variants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Variant ID
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
 *                 description: Size name
 *     responses:
 *       200:
 *         description: Size added successfully
 *       400:
 *         description: Invalid input data or Size already exists
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Variant not found
 */
router.post(
  '/:id/sizes',
  restrictTo('Admin'),
  [
    param('id', 'Variant ID must be a valid MongoDB ID').isMongoId(),
    check('name', 'Name is required').not().isEmpty()
  ],
  variantController.addSize
);

module.exports = router; 