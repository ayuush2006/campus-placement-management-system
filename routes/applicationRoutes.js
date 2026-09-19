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

// POST /api/applications - Submit an application for a job
router.post('/', createApplication);

// GET /api/applications/student/:studentId - Get all applications submitted by a student
router.get('/student/:studentId', getApplicationsByStudent);

// GET /api/applications/job/:jobId - Get all applications submitted for a job
router.get('/job/:jobId', getApplicationsByJob);

module.exports = router;
