// ==============================================================================
// routes/applicationRoutes.js - Application API Routes
// Maps HTTP requests to application controller functions
// Base Path: /api/applications
// ==============================================================================

const express = require('express');
const router = express.Router();
const {
    createApplication,
    getApplicationsByStudent,
    getApplicationsByJob
} = require('../controllers/applicationController');

const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

// POST /api/applications - Submit an application for a job (Authenticated Student)
router.post('/', authenticateToken, createApplication);

// GET /api/applications/student/:studentId - Get all applications submitted by a student (Authenticated)
router.get('/student/:studentId', authenticateToken, getApplicationsByStudent);

// GET /api/applications/job/:jobId - Get all applications submitted for a job (Admin Only)
router.get('/job/:jobId', authenticateToken, requireAdmin, getApplicationsByJob);

module.exports = router;
