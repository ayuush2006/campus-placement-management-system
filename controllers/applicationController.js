// ==============================================================================
// controllers/applicationController.js - Application Management Controller
// Handles submitting applications, student applications, and job applicants
// ==============================================================================

const { pool } = require('../config/db');

// @desc    Submit a new job application
// @route   POST /api/applications
// @access  Public
const createApplication = async (req, res) => {
    try {
        const { student_id, job_id } = req.body;

        // 1. Validation: student_id and job_id are required
        if (!student_id || !job_id) {
            return res.status(400).json({
                success: false,
                message: 'Please provide both student_id and job_id'
            });
        }

        const parsedStudentId = parseInt(student_id, 10);
        const parsedJobId = parseInt(job_id, 10);

        if (isNaN(parsedStudentId) || isNaN(parsedJobId)) {
            return res.status(400).json({
                success: false,
                message: 'student_id and job_id must be valid numbers'
            });
        }

        // 2. Check if the student exists in users table with role 'student'
        const [student] = await pool.query(
            'SELECT user_id, name, email FROM users WHERE user_id = ? AND role = ?',
            [parsedStudentId, 'student']
        );

        if (student.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Student not found with ID ${parsedStudentId}`
            });
        }

        // 3. Check if the job exists
        const [job] = await pool.query(
            'SELECT j.job_id, j.title, c.name AS company_name FROM jobs j JOIN companies c ON j.company_id = c.company_id WHERE j.job_id = ?',
            [parsedJobId]
        );

        if (job.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Job opening not found with ID ${parsedJobId}`
            });
        }

        // 4. Check if student has already applied for this job
        const [existingApp] = await pool.query(
            'SELECT application_id, status, applied_at FROM applications WHERE student_id = ? AND job_id = ?',
            [parsedStudentId, parsedJobId]
        );

        if (existingApp.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'You have already applied for this job opening',
                application: existingApp[0]
            });
        }

        // 5. Insert new application (default status is 'Applied')
        const [result] = await pool.query(
            'INSERT INTO applications (student_id, job_id, status) VALUES (?, ?, ?)',
            [parsedStudentId, parsedJobId, 'Applied']
        );

        res.status(201).json({
            success: true,
            message: 'Application submitted successfully',
            application: {
                application_id: result.insertId,
                student_id: parsedStudentId,
                student_name: student[0].name,
                job_id: parsedJobId,
                job_title: job[0].title,
                company_name: job[0].company_name,
                status: 'Applied'
            }
        });
    } catch (error) {
        console.error('Error creating application:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error while submitting application',
            error: error.message
        });
    }
};

// @desc    Get all applications submitted by a specific student
// @route   GET /api/applications/student/:studentId
// @access  Public
const getApplicationsByStudent = async (req, res) => {
    try {
        const studentId = parseInt(req.params.studentId, 10);

        if (isNaN(studentId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid student ID parameter'
            });
        }

        // Check if student exists
        const [student] = await pool.query('SELECT user_id, name FROM users WHERE user_id = ?', [studentId]);
        if (student.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Student not found with ID ${studentId}`
            });
        }

        const query = `
            SELECT a.application_id, a.status, a.applied_at, a.updated_at,
                   j.job_id, j.title AS job_title, j.package_lpa, j.location AS job_location,
                   c.company_id, c.name AS company_name, c.website AS company_website
            FROM applications a
            JOIN jobs j ON a.job_id = j.job_id
            JOIN companies c ON j.company_id = c.company_id
            WHERE a.student_id = ?
            ORDER BY a.applied_at DESC;
        `;
        const [applications] = await pool.query(query, [studentId]);

        res.status(200).json({
            success: true,
            student_id: studentId,
            student_name: student[0].name,
            count: applications.length,
            applications
        });
    } catch (error) {
        console.error('Error fetching student applications:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching student applications',
            error: error.message
        });
    }
};

// @desc    Get all applications for a specific job (applicant list)
// @route   GET /api/applications/job/:jobId
// @access  Public
const getApplicationsByJob = async (req, res) => {
    try {
        const jobId = parseInt(req.params.jobId, 10);

        if (isNaN(jobId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid job ID parameter'
            });
        }

        // Check if job exists
        const [job] = await pool.query(
            'SELECT j.job_id, j.title, c.name AS company_name FROM jobs j JOIN companies c ON j.company_id = c.company_id WHERE j.job_id = ?',
            [jobId]
        );

        if (job.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Job opening not found with ID ${jobId}`
            });
        }

        const query = `
            SELECT a.application_id, a.status, a.applied_at, a.updated_at,
                   u.user_id AS student_id, u.name AS student_name, u.email AS student_email,
                   sp.roll_number, sp.branch, sp.cgpa, sp.backlogs, sp.phone, sp.resume_url
            FROM applications a
            JOIN users u ON a.student_id = u.user_id
            LEFT JOIN student_profiles sp ON u.user_id = sp.user_id
            WHERE a.job_id = ?
            ORDER BY a.applied_at ASC;
        `;
        const [applications] = await pool.query(query, [jobId]);

        res.status(200).json({
            success: true,
            job_id: jobId,
            job_title: job[0].title,
            company_name: job[0].company_name,
            count: applications.length,
            applications
        });
    } catch (error) {
        console.error('Error fetching job applications:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching job applications',
            error: error.message
        });
    }
};

module.exports = {
    createApplication,
    getApplicationsByStudent,
    getApplicationsByJob
};
