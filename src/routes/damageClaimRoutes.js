const express = require('express');
const { check, param } = require('express-validator');
const damageClaimController = require('../controllers/damageClaimController');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const multer = require('multer');

const router = express.Router();

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Apply protect middleware to all routes
router.use(protect);

/**
 * @swagger
 * /api/damage-claims/distributors:
 *   get:
 *     summary: Get all distributors for damage claim form
 *     description: Retrieves a list of all distributors to use in damage claim form
 *     tags: [Damage Claims]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of distributors
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       contact:
 *                         type: string
 *                       address:
 *                         type: string
 *       401:
 *         description: Not authenticated
 */
router.get('/distributors', damageClaimController.getAllDistributors);

/**
 * @swagger
 * /api/damage-claims:
 *   post:
 *     summary: Create a new damage claim
 *     description: Submit a new damage claim for a distributor
 *     tags: [Damage Claims]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - distributorId
 *               - brand
 *               - variant
 *               - size
 *               - pieces
 *               - manufacturingDate
 *               - batchDetails
 *               - damageType
 *               - reason
 *             properties:
 *               distributorId:
 *                 type: string
 *                 description: ID of the distributor
 *               distributorName:
 *                 type: string
 *                 description: Name of the distributor (optional, will use name from distributorId if not provided)
 *               brand:
 *                 type: string
 *                 description: Brand name
 *               variant:
 *                 type: string
 *                 description: Variant of the product
 *               size:
 *                 type: string
 *                 description: Size of the product
 *               pieces:
 *                 type: integer
 *                 description: Number of damaged pieces
 *               manufacturingDate:
 *                 type: string
 *                 format: date
 *                 description: Manufacturing date of the product
 *               batchDetails:
 *                 type: string
 *                 description: Batch details or batch number
 *               damageType:
 *                 type: string
 *                 enum: [Box Damage, Product Damage, Seal Broken, Expiry Date Issue, Quality Issue, Other]
 *                 description: Type of damage
 *               reason:
 *                 type: string
 *                 description: Detailed reason for the damage
 *               images:
 *                 type: array
 *                 items:
 *                   type: file
 *                 description: Images of the damaged product
 *     responses:
 *       201:
 *         description: Damage claim created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Not authenticated
 */
router.post(
  '/',
  upload.array('images', 5), // Allow up to 5 images
  [
    check('distributorId', 'Distributor ID is required').notEmpty().isMongoId(),
    check('brand', 'Brand name is required').notEmpty(),
    check('variant', 'Variant is required').notEmpty(),
    check('size', 'Size is required').notEmpty(),
    check('pieces', 'Number of pieces is required').isInt({ min: 1 }),
    check('manufacturingDate', 'Manufacturing date is required and must be a valid date').isDate(),
    check('batchDetails', 'Batch details are required').notEmpty(),
    check('damageType', 'Damage type is required').isIn([
      'Box Damage', 'Product Damage', 'Seal Broken', 'Expiry Date Issue', 'Quality Issue', 'Other'
    ]),
    check('reason', 'Reason for damage is required').notEmpty()
  ],
  damageClaimController.createDamageClaim
);

/**
 * @swagger
 * /api/damage-claims:
 *   get:
 *     summary: Get all damage claims
 *     description: Retrieve all damage claims with optional filtering by status or distributor
 *     tags: [Damage Claims]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, Approved, Partially Approved, Rejected]
 *         description: Filter claims by status
 *       - in: query
 *         name: distributorId
 *         schema:
 *           type: string
 *         description: Filter claims by distributor ID
 *     responses:
 *       200:
 *         description: List of damage claims
 *       401:
 *         description: Not authenticated
 */
router.get('/', damageClaimController.getAllDamageClaims);

/**
 * @swagger
 * /api/damage-claims/user:
 *   get:
 *     summary: Get current user's damage claims
 *     description: Retrieve all damage claims created by the current user
 *     tags: [Damage Claims]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, Approved, Partially Approved, Rejected]
 *         description: Filter claims by status
 *     responses:
 *       200:
 *         description: List of user's damage claims
 *       401:
 *         description: Not authenticated
 */
router.get('/user', damageClaimController.getUserDamageClaims);

/**
 * @swagger
 * /api/damage-claims/{id}:
 *   get:
 *     summary: Get a single damage claim
 *     description: Retrieve a specific damage claim by ID
 *     tags: [Damage Claims]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Damage claim ID
 *     responses:
 *       200:
 *         description: Damage claim details
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized to view this claim
 *       404:
 *         description: Damage claim not found
 */
router.get('/:id', damageClaimController.getDamageClaim);

/**
 * @swagger
 * /api/damage-claims/{id}:
 *   patch:
 *     summary: Update damage claim status
 *     description: Update the status of a damage claim (approve, partially approve, or reject)
 *     tags: [Damage Claims]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Damage claim ID
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
 *                 enum: [Approved, Partially Approved, Rejected]
 *                 description: New status for the claim
 *               approvedPieces:
 *                 type: integer
 *                 description: Number of pieces approved (required for partial approval)
 *               comment:
 *                 type: string
 *                 description: Comment or reason for the decision
 *     responses:
 *       200:
 *         description: Damage claim status updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized to update this claim
 *       404:
 *         description: Damage claim not found
 */
router.patch(
  '/:id',
  restrictTo('Administrator', 'Admin', 'Mid-Level Manager'),
  [
    param('id', 'Invalid damage claim ID').isMongoId(),
    check('status', 'Status is required').notEmpty(),
    check('status', 'Status must be Approved, Partially Approved, or Rejected').isIn([
      'Approved', 'Partially Approved', 'Rejected'
    ]),
    check('approvedPieces', 'Approved pieces must be a positive number')
      .if(check('status').equals('Partially Approved'))
      .isInt({ min: 1 }),
    check('comment', 'Comment must be a string').optional().isString()
  ],
  damageClaimController.updateDamageClaimStatus
);

/**
 * @swagger
 * /api/damage-claims/{id}:
 *   delete:
 *     summary: Delete a damage claim
 *     description: Delete a specific damage claim by ID (Admin only)
 *     tags: [Damage Claims]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Damage claim ID
 *     responses:
 *       200:
 *         description: Damage claim deleted successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized to delete this claim
 *       404:
 *         description: Damage claim not found
 */
router.delete(
  '/:id',
  restrictTo('Administrator', 'Admin'),
  param('id', 'Invalid damage claim ID').isMongoId(),
  damageClaimController.deleteDamageClaim
);

/**
 * @swagger
 * /api/damage-claims/tracking/{trackingId}:
 *   get:
 *     summary: Get a damage claim by tracking ID
 *     description: Godown Incharge gets a damage claim by tracking ID
 *     tags: [Damage Claims]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: trackingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Tracking ID
 *     responses:
 *       200:
 *         description: Damage claim details
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Damage claim not found
 */
router.get(
  '/tracking/:trackingId',
  restrictTo('Administrator', 'Admin', 'Godown Incharge'),
  damageClaimController.getDamageClaimByTracking
);

/**
 * @swagger
 * /api/damage-claims/replacement:
 *   post:
 *     summary: Create replacement for an approved damage claim
 *     description: Process replacement for an approved or partially approved damage claim
 *     tags: [Damage Claims]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - trackingId
 *               - dispatchDate
 *               - approvedBy
 *               - channelledTo
 *               - referenceNumber
 *             properties:
 *               trackingId:
 *                 type: string
 *                 description: Tracking ID of the approved damage claim
 *               dispatchDate:
 *                 type: string
 *                 format: date
 *                 description: Date when replacement will be dispatched
 *               approvedBy:
 *                 type: string
 *                 description: Name of person who approved the replacement
 *               channelledTo:
 *                 type: string
 *                 description: Name of person to whom replacement is channelled
 *               referenceNumber:
 *                 type: string
 *                 description: Reference number for the replacement
 *     responses:
 *       200:
 *         description: Replacement processed successfully
 *       400:
 *         description: Invalid input or claim not approved
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Damage claim not found
 */
router.post(
  '/replacement',
  protect,
  restrictTo('Godown Incharge', 'Administrator', 'Admin'),
  [
    check('trackingId', 'Tracking ID is required').notEmpty(),
    check('dispatchDate', 'Dispatch date is required').isISO8601(),
    check('approvedBy', 'Approved by is required').notEmpty(),
    check('channelledTo', 'Channelled to is required').notEmpty(),
    check('referenceNumber', 'Reference number is required').notEmpty()
  ],
  damageClaimController.createReplacement
);

module.exports = router;