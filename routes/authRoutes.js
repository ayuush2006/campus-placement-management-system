// ==============================================================================
// routes/authRoutes.js - Authentication API Routes
// Maps authentication HTTP endpoints to authController functions
// Base Path: /api/auth
// ==============================================================================

const express = require('express');
const router = express.Router();
const {
    registerStudent,
    loginStudent,
    loginAdmin,
    login,
    getCurrentUser
} = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

// POST /api/auth/register - Register a new student
router.post('/register', registerStudent);

// POST /api/auth/student/login - Student-specific login
router.post('/student/login', loginStudent);

// POST /api/auth/admin/login - Admin-specific login
router.post('/admin/login', loginAdmin);

// POST /api/auth/login - Unified login for students and admins
router.post('/login', login);

// GET /api/auth/me - Protected route to get logged-in user profile
router.get('/me', authenticateToken, getCurrentUser);

module.exports = router;
