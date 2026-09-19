// ==============================================================================
// routes/studentRoutes.js - Student API Routes
// Maps HTTP requests to student controller functions
// Base Path: /api/students
// ==============================================================================

const express = require('express');
const router = express.Router();
const {
    createStudent,
    getStudentById,
    updateStudent,
    getStudentProfile,
    updateStudentProfile,
    getStudentDashboard
} = require('../controllers/studentController');

const { authenticateToken } = require('../middleware/authMiddleware');

// Conditional auth middleware (allows query ?studentId for quick testing or token)
function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (authHeader) {
        return authenticateToken(req, res, next);
    }
    next();
}

// POST /api/students - Register a new student (Public)
router.post('/', createStudent);

// GET /api/students/profile - Get current authenticated student's profile
router.get('/profile', optionalAuth, getStudentProfile);

// PUT /api/students/profile - Update current authenticated student's profile
router.put('/profile', optionalAuth, updateStudentProfile);

// GET /api/students/dashboard - Get complete student placement dashboard
router.get('/dashboard', optionalAuth, getStudentDashboard);

// GET /api/students/:id - Get student details by ID (Authenticated)
router.get('/:id', authenticateToken, getStudentById);

// PUT /api/students/:id - Update student details by ID (Authenticated)
router.put('/:id', authenticateToken, updateStudent);

module.exports = router;
