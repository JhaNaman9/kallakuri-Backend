const express = require('express');
const { check } = require('express-validator');
const authController = require('../controllers/authController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 description: User's full name
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User's password (min 8 characters, requires uppercase, lowercase, number, and special character)
 *               role:
 *                 type: string
 *                 enum: [Admin, Sub Admin, Marketing Staff, Mid-Level Manager, Godown Incharge, App Developer]
 *                 description: User's role
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input data
 */
router.post(
  '/register',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password must be at least 8 characters').isLength({ min: 8 }),
    check('role', 'Role must be Admin, Sub Admin, Marketing Staff, Mid-Level Manager, Godown Incharge, or App Developer')
      .optional()
      .isIn(['Admin', 'Sub Admin', 'Marketing Staff', 'Mid-Level Manager', 'Godown Incharge', 'App Developer'])
  ],
  authController.register
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
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
 *                 description: User's email
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User's password
 *     responses:
 *       200:
 *         description: User logged in successfully
 *       401:
 *         description: Invalid credentials
 */
router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ],
  authController.login
);

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Refresh JWT token
 *     tags: [Authentication]
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
 * /api/auth/me:
 *   get:
 *     summary: Get current user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user data
 *       401:
 *         description: Not authenticated
 */
router.get('/me', protect, authController.getMe);

/**
 * @swagger
 * /api/auth/update-password:
 *   patch:
 *     summary: Update current user's password
 *     tags: [Authentication]
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
 *                 description: User's current password
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 description: User's new password (min 8 characters, requires uppercase, lowercase, number, and special character)
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Current password is incorrect
 */
router.patch('/update-password', protect, authController.updatePassword);

/**
 * @swagger
 * /api/auth/logout:
 *   get:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User logged out successfully
 */
router.get('/logout', authController.logout);

/**
 * Sub-admin management routes - Admin only
 */

/**
 * @swagger
 * /api/auth/create-sub-admin:
 *   post:
 *     summary: Create a new sub-admin
 *     tags: [Sub-Admin Management]
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
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 description: Sub-admin's full name
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Sub-admin's email
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Sub-admin's password
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [dashboard, staff, marketing, orders, damage, tasks, distributors, godown, sales, reports]
 *                 description: Array of permissions for the sub-admin
 *     responses:
 *       201:
 *         description: Sub-admin created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.post(
  '/create-sub-admin',
  protect,
  restrictTo('Admin'),
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password must be at least 8 characters').isLength({ min: 8 }),
    check('permissions', 'Permissions must be an array').optional().isArray()
  ],
  authController.createSubAdmin
);

/**
 * @swagger
 * /api/auth/sub-admins:
 *   get:
 *     summary: Get all sub-admins
 *     tags: [Sub-Admin Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all sub-admins
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.get(
  '/sub-admins',
  protect,
  restrictTo('Admin'),
  authController.getSubAdmins
);

/**
 * @swagger
 * /api/auth/sub-admins/{id}:
 *   get:
 *     summary: Get a specific sub-admin
 *     tags: [Sub-Admin Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sub-admin ID
 *     responses:
 *       200:
 *         description: Sub-admin details
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Sub-admin not found
 */
router.get(
  '/sub-admins/:id',
  protect,
  restrictTo('Admin'),
  authController.getSubAdmin
);

/**
 * @swagger
 * /api/auth/sub-admins/{id}:
 *   put:
 *     summary: Update a sub-admin
 *     tags: [Sub-Admin Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sub-admin ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Sub-admin's full name
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Sub-admin's email
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [dashboard, staff, marketing, orders, damage, tasks, distributors, godown, sales, reports]
 *                 description: Array of permissions for the sub-admin
 *     responses:
 *       200:
 *         description: Sub-admin updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Sub-admin not found
 */
router.put(
  '/sub-admins/:id',
  protect,
  restrictTo('Admin'),
  [
    check('name', 'Name must be a string').optional().isString(),
    check('email', 'Please include a valid email').optional().isEmail(),
    check('permissions', 'Permissions must be an array').optional().isArray()
  ],
  authController.updateSubAdmin
);

/**
 * @swagger
 * /api/auth/sub-admins/{id}:
 *   delete:
 *     summary: Delete a sub-admin
 *     tags: [Sub-Admin Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sub-admin ID
 *     responses:
 *       200:
 *         description: Sub-admin deleted successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Sub-admin not found
 */
router.delete(
  '/sub-admins/:id',
  protect,
  restrictTo('Admin'),
  authController.deleteSubAdmin
);

/**
 * @swagger
 * /api/auth/all-users:
 *   get:
 *     summary: Get all users for task assignment
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users with their IDs and names
 *       401:
 *         description: Not authenticated
 */
router.get('/all-users', protect, authController.getAllUsers);

/**
 * @swagger
 * /api/auth/users-by-role/{role}:
 *   get:
 *     summary: Get users by role
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *         description: Role to filter users by
 *     responses:
 *       200:
 *         description: List of users with the specified role
 *       401:
 *         description: Not authenticated
 */
router.get('/users-by-role/:role', protect, authController.getUsersByRole);

/**
 * Debug routes - should be disabled in production
 */
router.get('/debug/users', protect, authController.debugUsers);

module.exports = router;