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

// POST /api/students - Register a new student
router.post('/', createStudent);

// GET /api/students/:id - Get student details by ID
router.get('/:id', getStudentById);

// PUT /api/students/:id - Update student details by ID
router.put('/:id', updateStudent);

module.exports = router;
