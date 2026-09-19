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
    updateStudent
} = require('../controllers/studentController');

const { authenticateToken } = require('../middleware/authMiddleware');

// POST /api/students - Register a new student (Public)
router.post('/', createStudent);

// GET /api/students/:id - Get student details by ID (Authenticated)
router.get('/:id', authenticateToken, getStudentById);

// PUT /api/students/:id - Update student details by ID (Authenticated)
router.put('/:id', authenticateToken, updateStudent);

module.exports = router;
