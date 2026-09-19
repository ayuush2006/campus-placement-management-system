// ==============================================================================
// routes/jobRoutes.js - Job API Routes
// Maps HTTP requests to job controller functions
// Base Path: /api/jobs
// ==============================================================================

const express = require('express');
const router = express.Router();
const {
    getAllJobs,
    getJobById,
    createJob,
    updateJob,
    deleteJob
} = require('../controllers/jobController');

const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

// GET /api/jobs - Get all available jobs (Public)
router.get('/', getAllJobs);

// GET /api/jobs/:id - Get a specific job by ID (Public)
router.get('/:id', getJobById);

// POST /api/jobs - Create a new job opening (Admin Only)
router.post('/', authenticateToken, requireAdmin, createJob);

// PUT /api/jobs/:id - Update a job opening (Admin Only)
router.put('/:id', authenticateToken, requireAdmin, updateJob);

// DELETE /api/jobs/:id - Delete a job opening (Admin Only)
router.delete('/:id', authenticateToken, requireAdmin, deleteJob);

module.exports = router;
