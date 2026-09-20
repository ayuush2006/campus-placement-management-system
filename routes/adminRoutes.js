// ==============================================================================
// routes/adminRoutes.js - Admin Module API Routes
// Protected routes strictly requiring JWT authentication and the 'admin' role
// Base Path: /api/admin
// ==============================================================================

const express = require('express');
const router = express.Router();
const { getAdminDashboardStats, getAdminAnalytics } = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

// Import company and job controllers to expose under /api/admin/* prefix
const {
    getAllCompanies,
    getCompanyById,
    createCompany,
    updateCompany,
    deleteCompany
} = require('../controllers/companyController');

const {
    getAllJobs,
    getJobById,
    createJob,
    updateJob,
    deleteJob
} = require('../controllers/jobController');

const {
    getAllApplications,
    updateApplicationStatus,
    getApplicationsByJob
} = require('../controllers/applicationController');

// ==============================================================================
// DASHBOARD & ANALYTICS
// ==============================================================================

// GET /api/admin/dashboard - Real-time placement metrics & overview (7 stat counters + recent activity)
router.get('/dashboard', authenticateToken, requireAdmin, getAdminDashboardStats);

// GET /api/admin/dashboard/stats - Alias for dashboard stats (spec-compliant route)
router.get('/dashboard/stats', authenticateToken, requireAdmin, getAdminDashboardStats);

// GET /api/admin/analytics - Placement analytics: by status, by branch, by company, top jobs
router.get('/analytics', authenticateToken, requireAdmin, getAdminAnalytics);

// ==============================================================================
// COMPANY MANAGEMENT (Admin-prefixed routes — all require JWT + admin role)
// ==============================================================================

// GET  /api/admin/companies         - List all companies
router.get('/companies', authenticateToken, requireAdmin, getAllCompanies);

// GET  /api/admin/companies/:id     - Get single company by ID
router.get('/companies/:id', authenticateToken, requireAdmin, getCompanyById);

// POST /api/admin/companies         - Create a new company
router.post('/companies', authenticateToken, requireAdmin, createCompany);

// PUT  /api/admin/companies/:id     - Update an existing company
router.put('/companies/:id', authenticateToken, requireAdmin, updateCompany);

// DELETE /api/admin/companies/:id   - Delete a company (with cascade protection)
router.delete('/companies/:id', authenticateToken, requireAdmin, deleteCompany);

// ==============================================================================
// JOB MANAGEMENT (Admin-prefixed routes — all require JWT + admin role)
// ==============================================================================

// GET  /api/admin/jobs              - List all job openings
router.get('/jobs', authenticateToken, requireAdmin, getAllJobs);

// GET  /api/admin/jobs/:id          - Get single job by ID
router.get('/jobs/:id', authenticateToken, requireAdmin, getJobById);

// POST /api/admin/jobs              - Create a new job opening
router.post('/jobs', authenticateToken, requireAdmin, createJob);

// PUT  /api/admin/jobs/:id          - Update an existing job opening
router.put('/jobs/:id', authenticateToken, requireAdmin, updateJob);

// DELETE /api/admin/jobs/:id        - Delete a job opening (with cascade protection)
router.delete('/jobs/:id', authenticateToken, requireAdmin, deleteJob);

// ==============================================================================
// APPLICATION MANAGEMENT (Admin-prefixed routes — all require JWT + admin role)
// ==============================================================================

// GET /api/admin/applications       - Get all applications with filters (?job_id= &company_id= &status=)
router.get('/applications', authenticateToken, requireAdmin, getAllApplications);

// GET /api/admin/applications/job/:jobId - Get all applicants for a specific job
router.get('/applications/job/:jobId', authenticateToken, requireAdmin, getApplicationsByJob);

// PUT /api/admin/applications/:id/status - Update an application status (Applied, Shortlisted, Rejected)
router.put('/applications/:id/status', authenticateToken, requireAdmin, updateApplicationStatus);

// PUT /api/admin/applications/:id   - Alias for status update
router.put('/applications/:id', authenticateToken, requireAdmin, updateApplicationStatus);

module.exports = router;
