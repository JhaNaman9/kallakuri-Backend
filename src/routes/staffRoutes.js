const express = require('express');
const { check } = require('express-validator');
const staffController = require('../controllers/staffController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Staff Management
 *   description: API endpoints for managing staff
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Staff:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - role
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated ID
 *         name:
 *           type: string
 *           description: Staff member's full name
 *         email:
 *           type: string
 *           format: email
 *           description: Staff member's email address
 *         role:
 *           type: string
 *           enum: [Admin, Marketing Staff, Mid-Level Manager, Godown Incharge]
 *           description: Staff member's role
 *         active:
 *           type: boolean
 *           description: Whether the staff member is active
 *         lastLogin:
 *           type: string
 *           format: date-time
 *           description: Date and time of staff's last login
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Date and time when the staff was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Date and time when the staff was last updated
 */

/**
 * @swagger
 * /api/staff:
 *   get:
 *     summary: Get all staff members
 *     tags: [Staff Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Filter by staff role
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
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
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: Sort field (e.g., name,-createdAt for name ascending and createdAt descending)
 *     responses:
 *       200:
 *         description: A list of staff members
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 pagination:
 *                   type: object
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Staff'
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 */
router.get('/', protect, staffController.getAllStaff);

/**
 * @swagger
 * /api/staff/{id}:
 *   get:
 *     summary: Get a staff member by ID
 *     tags: [Staff Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Staff ID
 *     responses:
 *       200:
 *         description: Staff member data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Staff'
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Staff member not found
 */
router.get('/:id', protect, staffController.getStaffById);

/**
 * @swagger
 * /api/staff:
 *   post:
 *     summary: Create a new staff member
 *     tags: [Staff Management]
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
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *                 description: Staff member's full name
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Staff member's email address
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Staff member's password
 *               role:
 *                 type: string
 *                 enum: [Admin, Marketing Staff, Mid-Level Manager, Godown Incharge]
 *                 description: Staff member's role
 *     responses:
 *       201:
 *         description: Staff member created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Staff'
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 */
router.post(
  '/',
  [
    protect,
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password must be at least 8 characters').isLength({ min: 8 }),
    check('role', 'Valid role is required')
      .isIn(['Admin', 'Marketing Staff', 'Mid-Level Manager', 'Godown Incharge'])
  ],
  staffController.createStaff
);

/**
 * @swagger
 * /api/staff/{id}:
 *   put:
 *     summary: Update a staff member
 *     tags: [Staff Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Staff ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Staff member's full name
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Staff member's email address
 *               role:
 *                 type: string
 *                 enum: [Admin, Marketing Staff, Mid-Level Manager, Godown Incharge]
 *                 description: Staff member's role
 *               active:
 *                 type: boolean
 *                 description: Whether the staff member is active
 *     responses:
 *       200:
 *         description: Staff member updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Staff'
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Staff member not found
 */
router.put(
  '/:id',
  [
    protect,
    check('name', 'Name is required if provided').optional().not().isEmpty(),
    check('email', 'Please include a valid email if provided').optional().isEmail(),
    check('role', 'Valid role is required if provided')
      .optional()
      .isIn(['Admin', 'Marketing Staff', 'Mid-Level Manager', 'Godown Incharge']),
    check('active', 'Active status must be a boolean if provided').optional().isBoolean()
  ],
  staffController.updateStaff
);

/**
 * @swagger
 * /api/staff/{id}/reset-password:
 *   post:
 *     summary: Reset a staff member's password
 *     tags: [Staff Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Staff ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPassword
 *             properties:
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 description: New password for the staff member
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Staff member not found
 */
router.post(
  '/:id/reset-password',
  [
    protect,
    check('newPassword', 'Password must be at least 8 characters').isLength({ min: 8 })
  ],
  staffController.resetStaffPassword
);

/**
 * @swagger
 * /api/staff/{id}/toggle-status:
 *   patch:
 *     summary: Toggle a staff member's active status
 *     tags: [Staff Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Staff ID
 *     responses:
 *       200:
 *         description: Staff member status toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Staff'
 *                 message:
 *                   type: string
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Staff member not found
 */
router.patch('/:id/toggle-status', protect, staffController.toggleStaffStatus);

/**
 * @swagger
 * /api/staff/{id}:
 *   delete:
 *     summary: Delete a staff member
 *     tags: [Staff Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Staff ID
 *     responses:
 *       200:
 *         description: Staff member deleted successfully
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Staff member not found
 */
router.delete('/:id', protect, staffController.deleteStaff);

/**
 * @swagger
 * /api/staff/dashboard/stats:
 *   get:
 *     summary: Get staff dashboard statistics
 *     tags: [Staff Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Staff dashboard statistics
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
 *                     totalStaff:
 *                       type: integer
 *                     activeStaff:
 *                       type: integer
 *                     staffByRole:
 *                       type: object
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 */
router.get('/dashboard/stats', protect, staffController.getStaffStats);

/**
 * @swagger
 * /api/staff/by-role/{role}:
 *   get:
 *     summary: Get staff members by role
 *     tags: [Staff Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *           enum: [Admin, Marketing Staff, Mid-Level Manager, Godown Incharge]
 *         description: Role to filter staff by
 *     responses:
 *       200:
 *         description: List of staff members with the specified role
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
 *                       email:
 *                         type: string
 *       400:
 *         description: Invalid role specified
 *       401:
 *         description: Not authorized
 */
router.get('/by-role/:role', protect, staffController.getStaffByRole);

module.exports = router; 