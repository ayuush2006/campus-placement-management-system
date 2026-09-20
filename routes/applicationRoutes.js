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
    getApplicationsByJob,
    getAllApplications,
    updateApplicationStatus
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

// GET /api/applications - Get all applications across all jobs/companies (Admin Only, supports ?job_id=&company_id=&status=)
router.get('/', authenticateToken, requireAdmin, getAllApplications);

// POST /api/applications - Submit an application for a job
// SECURITY: JWT authentication is REQUIRED. student_id is extracted from the verified JWT token only.
// A student cannot bypass eligibility checks by passing a student_id in the request body.
router.post('/', authenticateToken, createApplication);

// GET /api/applications/check-eligibility/:jobId - Check eligibility for a specific job without applying
router.get('/check-eligibility/:jobId', optionalAuth, checkJobEligibility);

// GET /api/applications/my-applications - Get current authenticated student's application history
router.get('/my-applications', authenticateToken, getMyApplications);

// GET /api/applications/student/:studentId - Get applications submitted by student ID
router.get('/student/:studentId', optionalAuth, getApplicationsByStudent);

// GET /api/applications/job/:jobId - Get all applicants for a job (Admin Only)
router.get('/job/:jobId', authenticateToken, requireAdmin, getApplicationsByJob);

// PUT /api/applications/:id/status - Update application status (Admin Only: Applied, Shortlisted, Rejected)
router.put('/:id/status', authenticateToken, requireAdmin, updateApplicationStatus);

// PUT /api/applications/:id - Update application status alternative route (Admin Only)
router.put('/:id', authenticateToken, requireAdmin, updateApplicationStatus);

module.exports = router;
