// ==============================================================================
// controllers/jobController.js - Job Management Controller
// Handles job listings, retrieval, posting, updating, and deleting
// ==============================================================================

const { pool } = require('../config/db');

// @desc    Get all available jobs (with company details)
// @route   GET /api/jobs
// @access  Public
const getAllJobs = async (req, res) => {
    try {
        const query = `
            SELECT j.job_id, j.company_id, j.title, j.description, j.package_lpa,
                   j.location, j.minimum_cgpa, j.allowed_branch, j.maximum_backlogs,
                   j.deadline, j.created_at, j.updated_at,
                   c.name AS company_name, c.website AS company_website, c.location AS company_location
            FROM jobs j
            JOIN companies c ON j.company_id = c.company_id
            ORDER BY j.created_at DESC;
        `;
        const [jobs] = await pool.query(query);

        res.status(200).json({
            success: true,
            count: jobs.length,
            jobs
        });
    } catch (error) {
        console.error('Error fetching jobs:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching jobs',
            error: error.message
        });
    }
};

// @desc    Get a single job by ID
// @route   GET /api/jobs/:id
// @access  Public
const getJobById = async (req, res) => {
    try {
        const jobId = parseInt(req.params.id, 10);

        if (isNaN(jobId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid job ID parameter'
            });
        }

        const query = `
            SELECT j.job_id, j.company_id, j.title, j.description, j.package_lpa,
                   j.location, j.minimum_cgpa, j.allowed_branch, j.maximum_backlogs,
                   j.deadline, j.created_at, j.updated_at,
                   c.name AS company_name, c.website AS company_website, c.location AS company_location
            FROM jobs j
            JOIN companies c ON j.company_id = c.company_id
            WHERE j.job_id = ?;
        `;
        const [rows] = await pool.query(query, [jobId]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Job not found with ID ${jobId}`
            });
        }

        res.status(200).json({
            success: true,
            job: rows[0]
        });
    } catch (error) {
        console.error('Error fetching job by ID:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching job details',
            error: error.message
        });
    }
};

// @desc    Create a job opening
// @route   POST /api/jobs
// @access  Public
const createJob = async (req, res) => {
    try {
        const {
            company_id,
            title,
            description,
            package_lpa,
            location,
            minimum_cgpa,
            allowed_branch,
            maximum_backlogs,
            deadline
        } = req.body;

        // 1. Validation: Required fields
        if (!company_id || !title || package_lpa === undefined || minimum_cgpa === undefined || !allowed_branch || !deadline) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields: company_id, title, package_lpa, minimum_cgpa, allowed_branch, deadline'
            });
        }

        // 2. Verify that the company exists
        const [company] = await pool.query('SELECT company_id, name FROM companies WHERE company_id = ?', [company_id]);
        if (company.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Company not found with ID ${company_id}`
            });
        }

        // 3. Insert job record
        const [result] = await pool.query(
            `INSERT INTO jobs (company_id, title, description, package_lpa, location, minimum_cgpa, allowed_branch, maximum_backlogs, deadline)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                company_id,
                title.trim(),
                description || null,
                parseFloat(package_lpa),
                location || null,
                parseFloat(minimum_cgpa),
                allowed_branch.trim().toUpperCase(),
                maximum_backlogs !== undefined ? parseInt(maximum_backlogs, 10) : 0,
                deadline
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Job opening posted successfully',
            job: {
                job_id: result.insertId,
                company_id,
                company_name: company[0].name,
                title: title.trim(),
                description,
                package_lpa: parseFloat(package_lpa),
                location,
                minimum_cgpa: parseFloat(minimum_cgpa),
                allowed_branch: allowed_branch.trim().toUpperCase(),
                maximum_backlogs: maximum_backlogs !== undefined ? parseInt(maximum_backlogs, 10) : 0,
                deadline
            }
        });
    } catch (error) {
        console.error('Error creating job:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error while creating job',
            error: error.message
        });
    }
};

// @desc    Update a job opening
// @route   PUT /api/jobs/:id
// @access  Public
const updateJob = async (req, res) => {
    try {
        const jobId = parseInt(req.params.id, 10);

        if (isNaN(jobId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid job ID parameter'
            });
        }

        // Check if job exists
        const [existing] = await pool.query('SELECT job_id FROM jobs WHERE job_id = ?', [jobId]);
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Job not found with ID ${jobId}`
            });
        }

        const {
            title,
            description,
            package_lpa,
            location,
            minimum_cgpa,
            allowed_branch,
            maximum_backlogs,
            deadline
        } = req.body;

        const updates = [];
        const params = [];

        if (title !== undefined) {
            updates.push('title = ?');
            params.push(title.trim());
        }
        if (description !== undefined) {
            updates.push('description = ?');
            params.push(description);
        }
        if (package_lpa !== undefined) {
            updates.push('package_lpa = ?');
            params.push(parseFloat(package_lpa));
        }
        if (location !== undefined) {
            updates.push('location = ?');
            params.push(location);
        }
        if (minimum_cgpa !== undefined) {
            updates.push('minimum_cgpa = ?');
            params.push(parseFloat(minimum_cgpa));
        }
        if (allowed_branch !== undefined) {
            updates.push('allowed_branch = ?');
            params.push(allowed_branch.trim().toUpperCase());
        }
        if (maximum_backlogs !== undefined) {
            updates.push('maximum_backlogs = ?');
            params.push(parseInt(maximum_backlogs, 10));
        }
        if (deadline !== undefined) {
            updates.push('deadline = ?');
            params.push(deadline);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide at least one field to update'
            });
        }

        params.push(jobId);
        await pool.query(`UPDATE jobs SET ${updates.join(', ')} WHERE job_id = ?`, params);

        const [updatedRows] = await pool.query('SELECT * FROM jobs WHERE job_id = ?', [jobId]);
        const updatedJob = updatedRows[0] ? {
            ...updatedRows[0],
            package_lpa: parseFloat(updatedRows[0].package_lpa),
            minimum_cgpa: parseFloat(updatedRows[0].minimum_cgpa)
        } : null;

        res.status(200).json({
            success: true,
            message: 'Job updated successfully',
            job: updatedJob
        });
    } catch (error) {
        console.error('Error updating job:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error while updating job',
            error: error.message
        });
    }
};

// @desc    Delete a job opening
// @route   DELETE /api/jobs/:id
// @access  Public
const deleteJob = async (req, res) => {
    try {
        const jobId = parseInt(req.params.id, 10);

        if (isNaN(jobId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid job ID parameter'
            });
        }

        // Check if job exists
        const [existing] = await pool.query('SELECT job_id, title FROM jobs WHERE job_id = ?', [jobId]);
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Job not found with ID ${jobId}`
            });
        }

        // Check if there are existing applications for this job
        const [appCountResult] = await pool.query(
            'SELECT COUNT(*) AS totalApps FROM applications WHERE job_id = ?',
            [jobId]
        );

        const totalApps = appCountResult[0].totalApps || 0;
        if (totalApps > 0 && req.query.force !== 'true') {
            return res.status(400).json({
                success: false,
                message: `Cannot delete job "${existing[0].title}" because ${totalApps} student(s) have already applied. Please review or resolve applications first, or provide ?force=true to force delete.`,
                dependentApplicationsCount: totalApps
            });
        }

        // Delete job (ON DELETE CASCADE removes associated applications)
        await pool.query('DELETE FROM jobs WHERE job_id = ?', [jobId]);

        res.status(200).json({
            success: true,
            message: `Job "${existing[0].title}" (ID: ${jobId}) deleted successfully`
        });
    } catch (error) {
        console.error('Error deleting job:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting job',
            error: error.message
        });
    }
};

module.exports = {
    getAllJobs,
    getJobById,
    createJob,
    updateJob,
    deleteJob
};
