// ==============================================================================
// routes/applicationRoutes.js - Application API Routes
// Base Path: /api/applications
// ==============================================================================

const express = require('express');
const router = express.Router();
const {
    createApplication,
    checkJobEligibility,
    getMyApplications,
    getApplicationsByStudent,
    getApplicationsByJob
} = require('../controllers/applicationController');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

// Middleware to conditionally parse token if present, but allow non-blocking passthrough
function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (authHeader) {
        return authenticateToken(req, res, next);
    }
    next();
}

// POST /api/applications - Submit an application for a job (Checks Eligibility & Prevents Duplicates)
router.post('/', optionalAuth, createApplication);

// GET /api/applications/check-eligibility/:jobId - Check eligibility for a specific job without applying
router.get('/check-eligibility/:jobId', optionalAuth, checkJobEligibility);

// GET /api/applications/my-applications - Get current authenticated student's application history
router.get('/my-applications', authenticateToken, getMyApplications);

// GET /api/applications/student/:studentId - Get applications submitted by student ID
router.get('/student/:studentId', optionalAuth, getApplicationsByStudent);

// GET /api/applications/job/:jobId - Get all applicants for a job (Admin Only)
router.get('/job/:jobId', authenticateToken, requireAdmin, getApplicationsByJob);

module.exports = router;
