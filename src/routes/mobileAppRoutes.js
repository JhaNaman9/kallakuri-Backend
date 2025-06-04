const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const authController = require('../controllers/authController');
const taskController = require('../controllers/taskController');
const distributorController = require('../controllers/distributorController');
const supplyEstimateController = require('../controllers/supplyEstimateController');
const productController = require('../controllers/productController');
const { mobileRouter: marketingActivityMobileRouter } = require('./marketingStaffActivityRoutes');
const { check, param } = require('express-validator');
const path = require('path');
const fs = require('fs');
const DamageClaim = require('../models/DamageClaim');
const { restrictTo } = require('../middleware/authMiddleware');
const Task = require('../models/Task');
const Distributor = require('../models/Distributor');
const damageClaimController = require('../controllers/damageClaimController');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Mobile App
 *   description: API endpoints specifically for the mobile app
 */

/**
 * @swagger
 * /api/mobile/login:
 *   post:
 *     summary: Staff login for mobile app
 *     tags: [Mobile App]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Staff email
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Staff password
 *               role:
 *                 type: string
 *                 enum: [Marketing Staff, Mid-Level Manager, Godown Incharge]
 *                 description: Staff role (optional, used for role-specific login)
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 token:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /api/mobile/login/marketing:
 *   post:
 *     summary: Marketing Staff login for mobile app
 *     tags: [Mobile App]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Staff email
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Staff password
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login/marketing', (req, res, next) => {
  // Automatically set the role to Marketing Staff
  req.body.role = 'Marketing Staff';
  authController.login(req, res, next);
});

/**
 * @swagger
 * /api/mobile/login/manager:
 *   post:
 *     summary: Mid-level Manager login for mobile app
 *     tags: [Mobile App]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Staff email
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Staff password
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login/manager', (req, res, next) => {
  // Automatically set the role to Mid-Level Manager
  req.body.role = 'Mid-Level Manager';
  authController.login(req, res, next);
});

/**
 * @swagger
 * /api/mobile/login/godown:
 *   post:
 *     summary: Godown Incharge login for mobile app
 *     tags: [Mobile App]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Staff email
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Staff password
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login/godown', (req, res, next) => {
  // Automatically set the role to Godown Incharge
  req.body.role = 'Godown Incharge';
  authController.login(req, res, next);
});

/**
 * @swagger
 * /api/mobile/validate-token:
 *   get:
 *     summary: Validates if the current auth token is valid
 *     tags: [Mobile App]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Token is valid
 *       401:
 *         description: Token is invalid or expired
 */
router.get('/validate-token', protect, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Token is valid'
  });
});

/**
 * @swagger
 * /api/mobile/refresh-token:
 *   post:
 *     summary: Refresh JWT token for mobile app
 *     tags: [Mobile App]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid or expired token
 */
router.post('/refresh-token', protect, authController.refreshToken);

/**
 * @swagger
 * /api/mobile/me:
 *   get:
 *     summary: Get current staff profile
 *     tags: [Mobile App]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Staff profile data
 *       401:
 *         description: Not authenticated
 */
router.get('/me', protect, authController.getMe);

/**
 * @swagger
 * /api/mobile/tasks/assigned:
 *   get:
 *     summary: Get tasks assigned to current staff
 *     tags: [Mobile App]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, In Progress, Completed]
 *         description: Filter by task status
 *     responses:
 *       200:
 *         description: List of assigned tasks
 *       401:
 *         description: Not authenticated
 */
router.get('/tasks/assigned', protect, async (req, res, next) => {
  // Set query parameter to filter tasks assigned to current staff
  req.query.assignedTo = req.user.id;
  taskController.getTasks(req, res, next);
});

/**
 * @swagger
 * /api/mobile/tasks/my-tasks:
 *   get:
 *     summary: Get all tasks assigned to or created by the current staff member
 *     tags: [Mobile App]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, In Progress, Completed]
 *         description: Filter by task status
 *     responses:
 *       200:
 *         description: List of tasks related to the current staff member
 *       401:
 *         description: Not authenticated
 */
router.get('/tasks/my-tasks', protect, restrictTo('Marketing Staff', 'Mid-Level Manager'), async (req, res) => {
  try {
    const { status } = req.query;
    
    // Build query for tasks either assigned to or created by this user
    const query = {
      $or: [
        { assignedTo: req.user.id },
        { createdBy: req.user.id }
      ]
    };
    
    // Add status filter if provided
    if (status) {
      query.status = status;
    }
    
    // Get tasks with populated fields
    const tasks = await Task.find(query)
      .populate('assignedTo', 'name')
      .populate('createdBy', 'name')
      .populate('distributorId', 'name shopName contact address')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    console.error(`Error fetching my tasks: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching tasks'
    });
  }
});

/**
 * @swagger
 * /api/mobile/tasks/{taskId}/start:
 *   patch:
 *     summary: Start working on a task (change status from Pending to In Progress)
 *     tags: [Mobile App]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task status updated to In Progress
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (not assigned to you)
 *       404:
 *         description: Task not found
 */
router.patch('/tasks/:taskId/start', protect, async (req, res, next) => {
  // Set the status to In Progress
  req.body = { status: 'In Progress' };
  req.params.taskId = req.params.taskId;
  taskController.updateTaskStatus(req, res, next);
});

/**
 * @swagger
 * /api/mobile/tasks/{taskId}/complete:
 *   patch:
 *     summary: Complete a task (change status to Completed)
 *     tags: [Mobile App]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task status updated to Completed
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (not assigned to you)
 *       404:
 *         description: Task not found
 */
router.patch('/tasks/:taskId/complete', protect, async (req, res, next) => {
  // Set the status to Completed
  req.body = { status: 'Completed' };
  req.params.taskId = req.params.taskId;
  taskController.updateTaskStatus(req, res, next);
});

/**
 * @swagger
 * /api/mobile/tasks/create:
 *   post:
 *     summary: Create a new task
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
 *               - title
 *               - staffRole
 *             properties:
 *               title:
 *                 type: string
 *                 description: Task title
 *               description:
 *                 type: string
 *                 description: Task description
 *               assignedTo:
 *                 type: string
 *                 description: User ID to assign the task to (defaults to self)
 *               staffRole:
 *                 type: string
 *                 enum: [Marketing Staff, Godown Incharge, Mid-Level Manager]
 *                 description: Role of the staff member the task is assigned to
 *               distributorId:
 *                 type: string
 *                 description: Distributor ID (for Marketing Staff tasks)
 *               brand:
 *                 type: string
 *                 description: Brand name (for Godown Incharge tasks)
 *               variant:
 *                 type: string
 *                 description: Variant type (for Godown Incharge tasks)
 *               size:
 *                 type: string
 *                 description: Size (for Godown Incharge tasks)
 *               quantity:
 *                 type: number
 *                 description: Quantity (for Godown Incharge tasks)
 *               deadline:
 *                 type: string
 *                 format: date-time
 *                 description: Deadline for the task
 *               assignedDate:
 *                 type: string
 *                 format: date-time
 *                 description: Date the task is assigned
 *     responses:
 *       201:
 *         description: Task created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Not authenticated
 */
router.post('/tasks/create', protect, async (req, res, next) => {
  // If no assignedTo is provided, assign to self
  if (!req.body.assignedTo) {
    req.body.assignedTo = req.user.id;
  }
  
  // If no staffRole is provided, use the role of the assigned staff
  if (!req.body.staffRole) {
    req.body.staffRole = req.user.role;
  }
  
  // Validate based on staff role
  if (req.body.staffRole === 'Godown Incharge') {
    if (!req.body.brand || !req.body.variant) {
      return res.status(400).json({
        success: false,
        error: 'Brand and variant are required for Godown Incharge tasks'
      });
    }
  }
  
  taskController.createTask(req, res, next);
});

/**
 * @swagger
 * /api/mobile/distributors:
 *   get:
 *     summary: Get all distributors
 *     tags: [Mobile App]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all distributors
 *       401:
 *         description: Not authenticated
 */
router.get('/distributors', protect, distributorController.getDistributors);

/**
 * @swagger
 * /api/mobile/distributors/{id}:
 *   get:
 *     summary: Get a distributor by ID
 *     tags: [Mobile App]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Distributor ID
 *     responses:
 *       200:
 *         description: Distributor details
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Distributor not found
 */
router.get('/distributors/:id', protect, distributorController.getDistributor);

/**
 * @swagger
 * /api/mobile/distributors/{id}/details:
 *   get:
 *     summary: Get comprehensive details for a distributor (including shops)
 *     tags: [Mobile App]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Distributor ID
 *     responses:
 *       200:
 *         description: Comprehensive distributor details
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
 *                       example: "60d21b1c67d0d8992e610c83"
 *                     name:
 *                       type: string
 *                       example: "ABC Distributors"
 *                     shopName:
 *                       type: string
 *                       example: "ABC Enterprises"
 *                     contact:
 *                       type: string
 *                       example: "9876543210"
 *                     phoneNumber:
 *                       type: string
 *                       example: "9876543211"
 *                     address:
 *                       type: string
 *                       example: "123 Main St, City"
 *                     retailShopCount:
 *                       type: integer
 *                       example: 5
 *                     wholesaleShopCount:
 *                       type: integer
 *                       example: 2
 *                     orderCount:
 *                       type: integer
 *                       example: 10
 *                     shops:
 *                       type: object
 *                       properties:
 *                         retailShops:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               ownerName:
 *                                 type: string
 *                               address:
 *                                 type: string
 *                               type:
 *                                 type: string
 *                               distributorId:
 *                                 type: string
 *                               isLegacy:
 *                                 type: boolean
 *                               isActive:
 *                                 type: boolean
 *                         wholesaleShops:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               ownerName:
 *                                 type: string
 *                               address:
 *                                 type: string
 *                               type:
 *                                 type: string
 *                               distributorId:
 *                                 type: string
 *                               isLegacy:
 *                                 type: boolean
 *                               isActive:
 *                                 type: boolean
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Distributor not found
 */
router.get('/distributors/:id/details', protect, distributorController.getDistributorDetails);

/**
 * @swagger
 * /api/mobile/supply-estimates:
 *   post:
 *     summary: Submit a new supply estimate
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
 *               - distributorId
 *               - items
 *             properties:
 *               distributorId:
 *                 type: string
 *                 description: ID of the distributor
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - productName
 *                     - quantity
 *                     - units
 *                   properties:
 *                     productName:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                     units:
 *                       type: string
 *                     notes:
 *                       type: string
 *               notes:
 *                 type: string
 *                 description: Additional notes
 *     responses:
 *       201:
 *         description: Supply estimate created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Distributor not found
 */
router.post('/supply-estimates', protect, supplyEstimateController.createSupplyEstimate);

/**
 * @swagger
 * /api/mobile/supply-estimates/my-submissions:
 *   get:
 *     summary: Get all supply estimates submitted by current staff
 *     tags: [Mobile App]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, Approved, Rejected]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of supply estimates submitted by current staff
 *       401:
 *         description: Not authenticated
 */
router.get('/supply-estimates/my-submissions', protect, async (req, res, next) => {
  req.params.staffId = req.user.id;
  supplyEstimateController.getEstimatesByStaffId(req, res, next);
});

/**
 * @swagger
 * /api/mobile/change-password:
 *   patch:
 *     summary: Change current staff password
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
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 description: Current password
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 description: New password
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       401:
 *         description: Current password is incorrect
 */
router.patch('/change-password', protect, authController.updatePassword);

/**
 * @swagger
 * /api/mobile/products/brands-with-variants:
 *   get:
 *     summary: Get all brands with their variants and sizes
 *     tags: [Mobile App]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
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
 *                       brandName:
 *                         type: string
 *                       variants:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             _id:
 *                               type: string
 *                             name:
 *                               type: string
 *                             sizes:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   _id:
 *                                     type: string
 *                                   name:
 *                                     type: string
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.get('/products/brands-with-variants', productController.getBrandsWithVariants);

// Use marketing activity mobile routes
router.use('/marketing-activity', marketingActivityMobileRouter);

// Damage Claims Mobile Routes
/**
 * @swagger
 * /api/mobile/damage-claims:
 *   post:
 *     summary: Submit a new damage claim from mobile app
 *     description: Marketing Staff submits a leakage/damage claim from mobile app
 *     tags: [Mobile, Damage Claims]
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
 *               - brandName
 *               - variant
 *               - size
 *               - damagedPieces
 *               - manufacturingDate
 *               - batchDetails
 *               - reason
 *               - damageImage
 *               - damageType
 *             properties:
 *               distributorId:
 *                 type: string
 *                 description: Distributor ID
 *               distributorName:
 *                 type: string
 *                 description: Distributor name
 *               brandName:
 *                 type: string
 *                 description: Brand name
 *               variant:
 *                 type: string
 *                 description: Variant
 *               size:
 *                 type: string
 *                 description: Size
 *               damagedPieces:
 *                 type: number
 *                 description: Number of damaged pieces
 *               manufacturingDate:
 *                 type: string
 *                 format: date
 *                 description: Manufacturing date
 *               batchDetails:
 *                 type: string
 *                 description: Batch details
 *               reason:
 *                 type: string
 *                 description: Reason for damage
 *               damageImage:
 *                 type: string
 *                 description: Base64 encoded image data
 *               damageType:
 *                 type: string
 *                 description: Type of damage
 *     responses:
 *       201:
 *         description: Damage claim created successfully
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
  '/damage-claims',
  protect,
  restrictTo('Marketing Staff'),
  [
    check('distributorId', 'Distributor ID is required').not().isEmpty().isMongoId(),
    check('distributorName', 'Distributor name is required').not().isEmpty(),
    check('brandName', 'Brand name is required').not().isEmpty(),
    check('variant', 'Variant is required').not().isEmpty(),
    check('size', 'Size is required').not().isEmpty(),
    check('damagedPieces', 'Number of damaged pieces is required').isInt({ min: 1 }),
    check('manufacturingDate', 'Manufacturing date is required').isISO8601(),
    check('batchDetails', 'Batch details are required').not().isEmpty(),
    check('reason', 'Reason for damage is required').not().isEmpty(),
    check('damageImage', 'Damage image is required').not().isEmpty(),
    check('damageType', 'Damage type is required').not().isEmpty()
  ],
  async (req, res, next) => {
    try {
      // Extract image data (base64)
      const { damageImage, ...otherData } = req.body;
      
      // Convert base64 to file and save
      const imageBuffer = Buffer.from(
        damageImage.replace(/^data:image\/\w+;base64,/, ''),
        'base64'
      );
      
      const fileName = `damage_${Date.now()}.jpg`;
      const filePath = path.join(__dirname, '../../uploads', fileName);
      
      // Ensure uploads directory exists
      fs.mkdirSync(path.join(__dirname, '../../uploads'), { recursive: true });
      
      // Write file
      fs.writeFileSync(filePath, imageBuffer);
      
      // Set image URL for the database
      const imageUrl = `/uploads/${fileName}`;
      
      // Create damage claim with image URL
      const damageClaim = await DamageClaim.create({
        distributorId: otherData.distributorId,
        distributorName: otherData.distributorName,
        brand: otherData.brandName,
        variant: otherData.variant,
        size: otherData.size,
        pieces: otherData.damagedPieces,
        manufacturingDate: otherData.manufacturingDate,
        batchDetails: otherData.batchDetails,
        damageType: otherData.damageType,
        reason: otherData.reason,
        images: [imageUrl],
        status: 'Pending',
        createdBy: req.user.id
      });
      
      // Populate and return
      const populatedClaim = await DamageClaim.findById(damageClaim._id)
        .populate('distributorId', 'name contact address')
        .populate('createdBy', 'name role');
      
      res.status(201).json({
        success: true,
        data: populatedClaim
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/mobile/damage-claims/my-claims:
 *   get:
 *     summary: Get all my damage claims (Marketing Staff)
 *     description: Marketing Staff gets all their damage claims from mobile app
 *     tags: [Mobile, Damage Claims]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, Commented, Approved, Partially Approved, Rejected]
 *         description: Filter by claim status
 *     responses:
 *       200:
 *         description: List of damage claims
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.get(
  '/damage-claims/my-claims',
  protect,
  restrictTo('Marketing Staff'),
  async (req, res, next) => {
    try {
      const { status } = req.query;
      
      // Build query
      const query = { createdBy: req.user.id };
      
      if (status) {
        query.status = status;
      }
      
      // Get damage claims
      const damageClaims = await DamageClaim.find(query)
        .populate('distributorId', 'name contact address')
        .sort({ createdAt: -1 });
      
      res.status(200).json({
        success: true,
        count: damageClaims.length,
        data: damageClaims
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/mobile/damage-claims/{claimId}:
 *   get:
 *     summary: Get a single damage claim (Marketing Staff)
 *     description: Marketing Staff gets details of a single damage claim from mobile app
 *     tags: [Mobile, Damage Claims]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: claimId
 *         schema:
 *           type: string
 *         required: true
 *         description: Damage claim ID
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
  '/damage-claims/:claimId',
  protect,
  restrictTo('Marketing Staff'),
  [
    param('claimId', 'Claim ID must be a valid MongoDB ID').isMongoId()
  ],
  async (req, res, next) => {
    try {
      const damageClaim = await DamageClaim.findById(req.params.claimId)
        .populate('distributorId', 'name contact address')
        .populate('createdBy', 'name role')
        .populate('mlmId', 'name role')
        .populate('adminId', 'name role');
      
      if (!damageClaim) {
        return res.status(404).json({
          success: false,
          error: 'Damage claim not found'
        });
      }
      
      // Ensure the claim belongs to the current user
      if (damageClaim.createdBy._id.toString() !== req.user.id && req.user.role !== 'Admin' && req.user.role !== 'Administrator') {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to access this damage claim'
        });
      }
      
      res.status(200).json({
        success: true,
        data: damageClaim
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/mobile/damage-claims/godown/tracking/:trackingId:
 *   get:
 *     summary: Get damage claim by tracking ID (Godown Incharge)
 *     description: Godown Incharge looks up a claim by its tracking ID
 *     tags: [Mobile, Damage Claims]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: trackingId
 *         schema:
 *           type: string
 *         required: true
 *         description: Tracking ID of the damage claim
 *     responses:
 *       200:
 *         description: Damage claim details
 *       400:
 *         description: Invalid request or claim not approved
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Damage claim not found
 */
router.get(
  '/damage-claims/godown/tracking/:trackingId',
  protect,
  restrictTo('Godown Incharge', 'Administrator', 'Admin'),
  [
    param('trackingId', 'Tracking ID is required').not().isEmpty()
  ],
  damageClaimController.getDamageClaimByTracking
);

/**
 * @swagger
 * /api/mobile/damage-claims/mlm/all:
 *   get:
 *     summary: Get all damage claims (Mid-Level Manager and Godown Incharge)
 *     description: Mid-Level Manager and Godown Incharge get all damage claims from mobile app
 *     tags: [Mobile, Damage Claims]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, Commented, Approved, Partially Approved, Rejected]
 *         description: Filter by claim status
 *       - in: query
 *         name: trackingId
 *         schema:
 *           type: string
 *         description: Filter by tracking ID (partial or full match)
 *     responses:
 *       200:
 *         description: List of damage claims
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.get(
  '/damage-claims/mlm/all',
  protect,
  restrictTo('Mid-Level Manager', 'Administrator', 'Admin', 'Godown Incharge'),
  async (req, res, next) => {
    try {
      const { status, trackingId } = req.query;
      
      // Build query
      const query = {};
      
      if (status) {
        query.status = status;
      }

      // Add tracking ID filter if provided
      if (trackingId) {
        query.trackingId = { $regex: trackingId, $options: 'i' }; // Case-insensitive partial match
      }
      
      // Get damage claims
      const damageClaims = await DamageClaim.find(query)
        .populate('distributorId', 'name contact address')
        .populate('createdBy', 'name role')
        .sort({ createdAt: -1 });
      
      res.status(200).json({
        success: true,
        count: damageClaims.length,
        data: damageClaims
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/mobile/damage-claims/mlm/pending:
 *   get:
 *     summary: Get pending damage claims (Mid-Level Manager and Godown Incharge)
 *     description: Mid-Level Manager and Godown Incharge get pending damage claims from mobile app
 *     tags: [Mobile, Damage Claims]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending damage claims
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.get(
  '/damage-claims/mlm/pending',
  protect,
  restrictTo('Mid-Level Manager', 'Administrator', 'Admin', 'Godown Incharge'),
  async (req, res, next) => {
    try {
      // Get pending damage claims
      const damageClaims = await DamageClaim.find({ status: 'Pending' })
        .populate('distributorId', 'name contact address')
        .populate('createdBy', 'name role')
        .sort({ createdAt: -1 });
      
      res.status(200).json({
        success: true,
        count: damageClaims.length,
        data: damageClaims
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/mobile/damage-claims/godown/approved:
 *   get:
 *     summary: Get approved damage claims (Godown Incharge)
 *     description: Godown Incharge gets approved and partially approved damage claims
 *     tags: [Mobile, Damage Claims]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of approved damage claims
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.get(
  '/damage-claims/godown/approved',
  protect,
  restrictTo('Godown Incharge', 'Administrator', 'Admin'),
  damageClaimController.getGodownApprovedClaims
);

/**
 * @swagger
 * /api/mobile/damage-claims/mlm/{claimId}/comment:
 *   patch:
 *     summary: Add MLM comment to damage claim (Mid-Level Manager and Godown Incharge)
 *     description: Mid-Level Manager or Godown Incharge adds comment to damage claim from mobile app
 *     tags: [Mobile, Damage Claims]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: claimId
 *         schema:
 *           type: string
 *         required: true
 *         description: Damage claim ID
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
 *                 description: Comment from the mid-level manager or godown incharge
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
 *         description: Damage claim not found
 */
router.patch(
  '/damage-claims/mlm/:claimId/comment',
  protect,
  restrictTo('Mid-Level Manager', 'Administrator', 'Admin', 'Godown Incharge'),
  [
    param('claimId', 'Claim ID must be a valid MongoDB ID').isMongoId(),
    check('comment', 'Comment is required').not().isEmpty()
  ],
  async (req, res, next) => {
    try {
      const { comment } = req.body;
      
      // Find damage claim
      let damageClaim = await DamageClaim.findById(req.params.claimId);
      
      if (!damageClaim) {
        return res.status(404).json({
          success: false,
          error: 'Damage claim not found'
        });
      }
      
      // Check if claim is in the correct state
      if (damageClaim.status !== 'Pending' && damageClaim.status !== 'Commented' && req.user.role !== 'Admin' && req.user.role !== 'Administrator') {
        return res.status(400).json({
          success: false,
          error: `Cannot add comment to a claim with status ${damageClaim.status}`
        });
      }
      
      // Update damage claim
      damageClaim = await DamageClaim.findByIdAndUpdate(
        req.params.claimId,
        {
          mlmComment: comment,
          status: 'Commented',
          mlmId: req.user.id
        },
        { new: true, runValidators: true }
      )
        .populate('distributorId', 'name contact address')
        .populate('createdBy', 'name role')
        .populate('mlmId', 'name role');
      
      res.status(200).json({
        success: true,
        data: damageClaim
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/mobile/tasks/{taskId}/delete:
 *   delete:
 *     summary: Delete a task from mobile app
 *     tags: [Mobile App]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized to delete this task
 *       404:
 *         description: Task not found
 */
router.delete('/tasks/:taskId/delete', protect, async (req, res, next) => {
  // Forward to the task controller
  req.params.taskId = req.params.taskId;
  taskController.deleteTask(req, res, next);
});

/**
 * @swagger
 * /api/mobile/sales-inquiries:
 *   post:
 *     summary: Submit a new sales inquiry from mobile app
 *     description: Marketing Staff submits a sales inquiry for products from mobile app
 *     tags: [Mobile, Sales Inquiries]
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
 *                 description: Distributor ID
 *               distributorName:
 *                 type: string
 *                 description: Distributor name
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
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Distributor not found
 */
router.post(
  '/sales-inquiries',
  protect,
  restrictTo('Marketing Staff'),
  [
    check('distributorId', 'Distributor ID is required').not().isEmpty().isMongoId(),
    check('distributorName', 'Distributor name is required').not().isEmpty(),
    check('products', 'Products array is required').isArray({ min: 1 }),
    check('products.*.brand', 'Brand name is required for all products').not().isEmpty(),
    check('products.*.variant', 'Variant is required for all products').not().isEmpty(),
    check('products.*.size', 'Size is required for all products').not().isEmpty(),
    check('products.*.quantity', 'Quantity is required for all products').isInt({ min: 1 })
  ],
  async (req, res, next) => {
    try {
      const { distributorId, distributorName, products } = req.body;
      
      // Find distributor to verify it exists
      const distributor = await Distributor.findById(distributorId);
      if (!distributor) {
        return res.status(404).json({
          success: false,
          error: 'Distributor not found'
        });
      }
      
      // Get shop name from distributor
      const shopName = distributor.shopName || '';
      
      // Create sales inquiry
      const SalesInquiry = require('../models/SalesInquiry');
      const salesInquiry = await SalesInquiry.create({
        distributorId,
        distributorName,
        shopName,
        products,
        createdBy: req.user.id
      });
      
      // Populate references for response
      const populatedInquiry = await SalesInquiry.findById(salesInquiry._id)
        .populate('distributorId', 'name contact address shopName')
        .populate('createdBy', 'name role');
      
      // Log staff activity
      const StaffActivity = require('../models/StaffActivity');
      await StaffActivity.create({
        staffId: req.user.id,
        activityType: 'Inquiry',
        details: `Created new sales inquiry for ${distributorName} with ${products.length} product(s)`,
        status: 'Completed',
        relatedId: salesInquiry._id,
        onModel: 'SalesInquiry'
      });
      
      res.status(201).json({
        success: true,
        data: populatedInquiry
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/mobile/sales-inquiries/my-inquiries:
 *   get:
 *     summary: Get all my sales inquiries (Marketing Staff and Mid-Level Manager)
 *     description: Marketing Staff and Mid-Level Manager get all their sales inquiries from mobile app
 *     tags: [Mobile, Sales Inquiries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, Processing, Completed, Rejected]
 *         description: Filter by inquiry status
 *     responses:
 *       200:
 *         description: List of sales inquiries
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.get(
  '/sales-inquiries/my-inquiries',
  protect,
  restrictTo('Marketing Staff', 'Mid-Level Manager', 'Administrator', 'Admin', 'Godown Incharge'),
  async (req, res, next) => {
    try {
      const { status } = req.query;
      
      // Build query
      const query = {};
      
      // For Marketing Staff, only show their own inquiries
      // For Mid-Level Manager, Admin, Administrator, and Godown Incharge show all inquiries
      if (req.user.role === 'Marketing Staff') {
        query.createdBy = req.user.id;
      }
      
      // Mid-Level Managers should not see dispatched orders
      if (req.user.role === 'Mid-Level Manager') {
        query.status = { $ne: 'Dispatched' };
      }
      
      // Apply status filter if provided, but ensure Mid-Level Managers still can't see dispatched orders
      if (status) {
        if (req.user.role === 'Mid-Level Manager' && status === 'Dispatched') {
          // Don't allow MLM to explicitly request Dispatched status
          return res.status(403).json({
            success: false,
            error: 'Mid-Level Managers cannot access dispatched orders'
          });
        } else {
          // Apply the requested status filter
          query.status = status;
        }
      }
      
      // Get sales inquiries
      const SalesInquiry = require('../models/SalesInquiry');
      const salesInquiries = await SalesInquiry.find(query)
        .populate('distributorId', 'name contact address shopName')
        .populate('createdBy', 'name role')
        .populate('managerId', 'name role')
        .populate('processedBy', 'name role')
        .populate('dispatchedBy', 'name role')
        .sort({ createdAt: -1 });
      
      res.status(200).json({
        success: true,
        count: salesInquiries.length,
        data: salesInquiries
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/mobile/sales-inquiries/{inquiryId}:
 *   get:
 *     summary: Get a single sales inquiry (All staff)
 *     description: Get details of a single sales inquiry from mobile app
 *     tags: [Mobile, Sales Inquiries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: inquiryId
 *         schema:
 *           type: string
 *         required: true
 *         description: Sales inquiry ID
 *     responses:
 *       200:
 *         description: Sales inquiry details
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Sales inquiry not found
 */
router.get(
  '/sales-inquiries/:inquiryId',
  protect,
  [
    param('inquiryId', 'Inquiry ID must be a valid MongoDB ID').isMongoId()
  ],
  async (req, res, next) => {
    try {
      const SalesInquiry = require('../models/SalesInquiry');
      const salesInquiry = await SalesInquiry.findById(req.params.inquiryId)
        .populate('distributorId', 'name contact address shopName')
        .populate('createdBy', 'name role')
        .populate('managerId', 'name role')
        .populate('processedBy', 'name role');
      
      if (!salesInquiry) {
        return res.status(404).json({
          success: false,
          error: 'Sales inquiry not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: salesInquiry
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/mobile/sales-inquiries/{inquiryId}/comment:
 *   patch:
 *     summary: Add manager comment to sales inquiry (Mid-Level Manager)
 *     description: Mid-Level Manager adds comment to sales inquiry from mobile app
 *     tags: [Mobile, Sales Inquiries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: inquiryId
 *         schema:
 *           type: string
 *         required: true
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
  '/sales-inquiries/:inquiryId/comment',
  protect,
  restrictTo('Mid-Level Manager', 'Administrator', 'Admin'),
  [
    param('inquiryId', 'Inquiry ID must be a valid MongoDB ID').isMongoId(),
    check('comment', 'Comment is required').not().isEmpty()
  ],
  async (req, res, next) => {
    try {
      const { comment } = req.body;
      
      // Find sales inquiry
      const SalesInquiry = require('../models/SalesInquiry');
      let salesInquiry = await SalesInquiry.findById(req.params.inquiryId);
      
      if (!salesInquiry) {
        return res.status(404).json({
          success: false,
          error: 'Sales inquiry not found'
        });
      }
      
      // Update sales inquiry with manager comment
      salesInquiry = await SalesInquiry.findByIdAndUpdate(
        req.params.inquiryId,
        {
          managerComment: comment,
          managerId: req.user.id,
          managerCommentDate: new Date(),
          status: 'Commented'
        },
        { new: true, runValidators: true }
      )
        .populate('distributorId', 'name contact address shopName')
        .populate('createdBy', 'name role')
        .populate('managerId', 'name role')
        .populate('processedBy', 'name role');
      
      // Log staff activity
      const StaffActivity = require('../models/StaffActivity');
      await StaffActivity.create({
        staffId: req.user.id,
        activityType: 'Inquiry',
        details: `Added comment to sales inquiry for ${salesInquiry.distributorName}`,
        status: 'Completed',
        relatedId: salesInquiry._id,
        onModel: 'SalesInquiry'
      });
      
      res.status(200).json({
        success: true,
        data: salesInquiry
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/mobile/auth/profile:
 *   get:
 *     summary: Get user profile for the authenticated user
 *     description: Retrieve the full profile details for the current authenticated user
 *     tags: [Mobile App]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
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
 *                       example: "60d21b1c67d0d8992e610c84"
 *                     name:
 *                       type: string
 *                       example: "John Doe"
 *                     email:
 *                       type: string
 *                       example: "john.doe@example.com"
 *                     phone:
 *                       type: string
 *                       example: "9876543210"
 *                     role:
 *                       type: string
 *                       example: "Marketing Staff"
 *                       enum: ["Admin", "Sub-Admin", "Mid-Level Manager", "Marketing Staff", "Godown Incharge"]
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     lastLogin:
 *                       type: string
 *                       format: date-time
 *                       example: "2023-05-15T10:00:00.000Z"
 *                     assignedDistributors:
 *                       type: array
 *                       description: Distributors assigned to this user (for Marketing Staff)
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "60d21b1c67d0d8992e610c83"
 *                           name:
 *                             type: string
 *                             example: "ABC Enterprises"
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.get('/auth/profile', protect, authController.getMe);

/**
 * @swagger
 * /api/mobile/retailer-shop-activity/alternate-providers:
 *   get:
 *     summary: Get alternate providers with insights (Mobile)
 *     description: Mid-Level Manager can view alternate providers with market insights
 *     tags: [Mobile App]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: distributorId
 *         schema:
 *           type: string
 *         description: Filter by distributor ID
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from date (YYYY-MM-DD)
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to date (YYYY-MM-DD)
 *       - in: query
 *         name: brandName
 *         schema:
 *           type: string
 *         description: Filter by brand name
 *     responses:
 *       200:
 *         description: List of alternate providers with insights
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - requires Mid-Level Manager role
 */
router.get(
  '/retailer-shop-activity/alternate-providers',
  protect,
  restrictTo('Mid-Level Manager', 'Admin', 'Administrator'),
  (req, res, next) => {
    // Import controller on demand
    const retailerShopActivityController = require('../controllers/retailerShopActivityController');
    retailerShopActivityController.getAlternateProviders(req, res, next);
  }
);

/**
 * @swagger
 * /api/mobile/retailer-shop-activity/{activityId}/alternate-provider/{providerId}/comment:
 *   patch:
 *     summary: Add comment to alternate provider (Mobile)
 *     description: Mid-Level Manager adds comment to an alternate provider from mobile app
 *     tags: [Mobile App]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: activityId
 *         schema:
 *           type: string
 *         required: true
 *         description: Activity ID
 *       - in: path
 *         name: providerId
 *         schema:
 *           type: string
 *         required: true
 *         description: Alternate provider ID
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
 *                 description: MLM comment
 *     responses:
 *       200:
 *         description: Comment added successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - requires Mid-Level Manager role
 *       404:
 *         description: Activity or provider not found
 */
router.patch(
  '/retailer-shop-activity/:activityId/alternate-provider/:providerId/comment',
  protect,
  restrictTo('Mid-Level Manager', 'Admin', 'Administrator'),
  (req, res, next) => {
    // Import controller on demand
    const retailerShopActivityController = require('../controllers/retailerShopActivityController');
    retailerShopActivityController.addAlternateProviderComment(req, res, next);
  }
);

/**
 * @swagger
 * /api/mobile/sales-inquiries/{inquiryId}/dispatch:
 *   patch:
 *     summary: Dispatch order for sales inquiry (Godown Incharge)
 *     description: Godown Incharge dispatches the order with vehicle and reference details
 *     tags: [Mobile, Sales Inquiries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: inquiryId
 *         schema:
 *           type: string
 *         required: true
 *         description: Sales inquiry ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dispatchDate
 *               - vehicleId
 *             properties:
 *               dispatchDate:
 *                 type: string
 *                 format: date
 *                 description: Date of order dispatch
 *               vehicleId:
 *                 type: string
 *                 description: Vehicle ID/number used for transport
 *               referenceNumber:
 *                 type: string
 *                 description: Optional reference number for the dispatch
 *     responses:
 *       200:
 *         description: Order dispatched successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - requires Godown Incharge role
 *       404:
 *         description: Sales inquiry not found
 */
router.patch(
  '/sales-inquiries/:inquiryId/dispatch',
  protect,
  restrictTo('Godown Incharge', 'Administrator', 'Admin'),
  [
    param('inquiryId', 'Inquiry ID must be a valid MongoDB ID').isMongoId(),
    check('dispatchDate', 'Dispatch date is required').not().isEmpty(),
    check('vehicleId', 'Vehicle ID is required').not().isEmpty()
  ],
  async (req, res, next) => {
    try {
      const { dispatchDate, vehicleId, referenceNumber } = req.body;
      
      // Find sales inquiry
      const SalesInquiry = require('../models/SalesInquiry');
      let salesInquiry = await SalesInquiry.findById(req.params.inquiryId);
      
      if (!salesInquiry) {
        return res.status(404).json({
          success: false,
          error: 'Sales inquiry not found'
        });
      }
      
      // Check if inquiry is in the correct state for dispatch
      if (salesInquiry.status !== 'Processing' && salesInquiry.status !== 'Commented') {
        return res.status(400).json({
          success: false,
          error: `Cannot dispatch an order with status ${salesInquiry.status}. Order must be in Processing or Commented status.`
        });
      }
      
      // Update sales inquiry with dispatch details
      salesInquiry = await SalesInquiry.findByIdAndUpdate(
        req.params.inquiryId,
        {
          status: 'Dispatched',
          dispatchDate: dispatchDate,
          vehicleId: vehicleId,
          referenceNumber: referenceNumber || '',
          dispatchedBy: req.user.id,
          dispatchedAt: new Date()
        },
        { new: true, runValidators: true }
      )
        .populate('distributorId', 'name contact address shopName')
        .populate('createdBy', 'name role')
        .populate('managerId', 'name role')
        .populate('processedBy', 'name role')
        .populate('dispatchedBy', 'name role');
      
      // Log staff activity
      const StaffActivity = require('../models/StaffActivity');
      await StaffActivity.create({
        staffId: req.user.id,
        activityType: 'Dispatch',
        details: `Dispatched order for sales inquiry ${salesInquiry.distributorName} with vehicle ${vehicleId}`,
        status: 'Completed',
        relatedId: salesInquiry._id,
        onModel: 'SalesInquiry'
      });
      
      res.status(200).json({
        success: true,
        data: salesInquiry
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/mobile/damage-claims/godown/all:
 *   get:
 *     summary: Get all damage claims for Godown Incharge
 *     description: Retrieves all damage claims with pagination for Godown Incharge
 *     tags: [Mobile App - Godown Incharge]
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
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of damage claims with pagination
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.get(
  '/damage-claims/godown/all',
  protect,
  restrictTo('Godown Incharge', 'Administrator', 'Admin'),
  damageClaimController.getGodownAllDamageClaims
);

/**
 * @swagger
 * /api/mobile/damage-claims/godown/{id}:
 *   get:
 *     summary: Get a specific damage claim for Godown Incharge
 *     description: Retrieves a specific damage claim by ID for Godown Incharge
 *     tags: [Mobile App - Godown Incharge]
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
 *         description: Not authorized
 *       404:
 *         description: Damage claim not found
 */
router.get(
  '/damage-claims/godown/:id',
  protect,
  restrictTo('Godown Incharge', 'Administrator', 'Admin'),
  damageClaimController.getGodownDamageClaimById
);

/**
 * @swagger
 * /api/mobile/damage-claims/search/{trackingId}:
 *   get:
 *     summary: Search damage claim by tracking ID (Mobile)
 *     description: Search for a damage claim using its tracking ID from mobile app
 *     tags: [Mobile, Damage Claims]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: trackingId
 *         schema:
 *           type: string
 *         required: true
 *         description: Tracking ID of the damage claim
 *     responses:
 *       200:
 *         description: Damage claim details
 *       400:
 *         description: Invalid tracking ID
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Damage claim not found
 */
router.get(
  '/damage-claims/search/:trackingId',
  protect,
  [
    param('trackingId', 'Tracking ID is required').not().isEmpty()
  ],
  async (req, res, next) => {
    try {
      const { trackingId } = req.params;
      
      // Find damage claim by tracking ID
      const damageClaim = await DamageClaim.findOne({ trackingId })
        .populate('distributorId', 'name contact address')
        .populate('createdBy', 'name role')
        .populate('mlmId', 'name role')
        .populate('adminId', 'name role');
      
      if (!damageClaim) {
        return res.status(404).json({
          success: false,
          error: 'Damage claim not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: damageClaim
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;