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

// GET /api/jobs - Get all available jobs
router.get('/', getAllJobs);

// GET /api/jobs/:id - Get a specific job by ID
router.get('/:id', getJobById);

// POST /api/jobs - Create a new job opening
router.post('/', createJob);

// PUT /api/jobs/:id - Update a job opening
router.put('/:id', updateJob);

// DELETE /api/jobs/:id - Delete a job opening
router.delete('/:id', deleteJob);

module.exports = router;
