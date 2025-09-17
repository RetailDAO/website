/**
 * Authentication Routes
 *
 * Simple password authentication endpoints for terminal access control
 */

const express = require('express');
const { authController } = require('../controllers/authController');

const router = express.Router();

/**
 * POST /api/auth/login
 * Authenticate with password and get session token
 */
router.post('/login', authController.login);

/**
 * POST /api/auth/verify
 * Verify session token validity
 */
router.post('/verify', authController.verifySession);

/**
 * POST /api/auth/logout
 * Logout and invalidate session
 */
router.post('/logout', authController.logout);

/**
 * GET /api/auth/status
 * Get authentication system status
 */
router.get('/status', authController.getAuthStatus);

module.exports = router;