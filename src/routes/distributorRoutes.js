const express = require('express');
const { check } = require('express-validator');
const distributorController = require('../controllers/distributorController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply protection middleware to all routes
router.use(protect);

// Routes accessible by all authenticated users
router.get('/', distributorController.getDistributors);
router.get('/:id', distributorController.getDistributor);

// Add retail shop to distributor - accessible by all authenticated users
router.post(
  '/:id/retail-shops',
  [
    check('shopName', 'Shop name is required').not().isEmpty(),
    check('ownerName', 'Owner name is required').not().isEmpty(),
    check('address', 'Address is required').not().isEmpty()
  ],
  distributorController.addRetailShop
);

// Add wholesale shop to distributor - accessible by all authenticated users
router.post(
  '/:id/wholesale-shops',
  [
    check('shopName', 'Shop name is required').not().isEmpty(),
    check('ownerName', 'Owner name is required').not().isEmpty(),
    check('address', 'Address is required').not().isEmpty()
  ],
  distributorController.addWholesaleShop
);

// Routes accessible only by Admin and Mid-Level Manager
router.use(restrictTo('Admin', 'Mid-Level Manager'));

/**
 * @swagger
 * /api/distributors:
 *   post:
 *     summary: Create a new distributor
 *     tags: [Distributors]
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
 *               - contact
 *               - address
 *             properties:
 *               name:
 *                 type: string
 *                 description: Distributor name
 *               contact:
 *                 type: string
 *                 description: Contact number
 *               address:
 *                 type: string
 *                 description: Address
 *     responses:
 *       201:
 *         description: Distributor created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.post(
  '/',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('contact', 'Contact is required').not().isEmpty(),
    check('address', 'Address is required').not().isEmpty()
  ],
  distributorController.createDistributor
);

/**
 * @swagger
 * /api/distributors/{id}:
 *   put:
 *     summary: Update a distributor
 *     tags: [Distributors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Distributor ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Distributor name
 *               contact:
 *                 type: string
 *                 description: Contact number
 *               address:
 *                 type: string
 *                 description: Address
 *     responses:
 *       200:
 *         description: Distributor updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Distributor not found
 */
router.put(
  '/:id',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('contact', 'Contact is required').not().isEmpty(),
    check('address', 'Address is required').not().isEmpty()
  ],
  distributorController.updateDistributor
);

// Routes accessible only by Admin
router.use(restrictTo('Admin'));

/**
 * @swagger
 * /api/distributors/{id}:
 *   delete:
 *     summary: Delete a distributor
 *     tags: [Distributors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Distributor ID
 *     responses:
 *       200:
 *         description: Distributor deleted successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Distributor not found
 */
router.delete('/:id', distributorController.deleteDistributor);

module.exports = router; 