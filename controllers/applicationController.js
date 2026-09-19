// ==============================================================================
// controllers/applicationController.js - Application Management Controller
// Handles submitting applications, eligibility checks, and application status
// ==============================================================================

const { pool } = require('../config/db');
const { checkEligibility } = require('../utils/eligibilityHelper');

// @desc    Submit a new job application with eligibility verification
// @route   POST /api/applications
// @access  Private (Student) / Public with student_id
const createApplication = async (req, res) => {
    try {
        // Support student_id from either authenticated token (req.user) or request body
        const student_id = req.user ? req.user.userId : req.body.student_id;
        const { job_id } = req.body;

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

        // 2. Fetch student user and profile
        const [students] = await pool.query(
            `SELECT u.user_id, u.name, u.email, u.role,
                    sp.profile_id, sp.branch, sp.cgpa, sp.backlogs
             FROM users u
             LEFT JOIN student_profiles sp ON u.user_id = sp.user_id
             WHERE u.user_id = ? AND u.role = 'student'`,
            [parsedStudentId]
        );

        if (students.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Student not found with ID ${parsedStudentId}`
            });
        }

        const student = students[0];

        if (!student.profile_id) {
            return res.status(400).json({
                success: false,
                message: 'Student profile is incomplete. Please update your profile (CGPA, Branch) before applying.'
            });
        }

        // 3. Fetch job details and eligibility criteria
        const [jobs] = await pool.query(
            `SELECT j.job_id, j.title, j.minimum_cgpa, j.allowed_branch, j.maximum_backlogs, j.deadline,
                    c.name AS company_name
             FROM jobs j
             JOIN companies c ON j.company_id = c.company_id
             WHERE j.job_id = ?`,
            [parsedJobId]
        );

        if (jobs.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Job opening not found with ID ${parsedJobId}`
            });
        }

        const job = jobs[0];

        // 4. Duplicate Check: Prevent student from applying twice to the same job
        const [existingApp] = await pool.query(
            'SELECT application_id, status, applied_at FROM applications WHERE student_id = ? AND job_id = ?',
            [parsedStudentId, parsedJobId]
        );

        if (existingApp.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'You have already applied for this job opening',
                alreadyApplied: true,
                application: existingApp[0]
            });
        }

        // 5. Eligibility Check: Evaluate student criteria against job requirements
        const eligibilityResult = checkEligibility(student, job);

        if (!eligibilityResult.eligible) {
            return res.status(400).json({
                success: false,
                message: 'You do not meet the eligibility criteria for this job opening',
                eligible: false,
                reasons: eligibilityResult.reasons
            });
        }

        // 6. Insert new application (default status is 'Applied')
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
                student_name: student.name,
                job_id: parsedJobId,
                job_title: job.title,
                company_name: job.company_name,
                status: 'Applied',
                applied_at: new Date()
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

// @desc    Check student eligibility for a specific job without applying
// @route   GET /api/applications/check-eligibility/:jobId
// @access  Private (Authenticated Student) / Public with query studentId
const checkJobEligibility = async (req, res) => {
    try {
        const student_id = req.user ? req.user.userId : req.query.studentId;
        const jobId = parseInt(req.params.jobId, 10);

        if (!student_id) {
            return res.status(400).json({
                success: false,
                message: 'Student authentication or ?studentId query parameter required'
            });
        }

        if (isNaN(jobId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid job ID parameter'
            });
        }

        // Fetch student profile
        const [students] = await pool.query(
            `SELECT u.user_id, u.name, sp.branch, sp.cgpa, sp.backlogs
             FROM users u
             LEFT JOIN student_profiles sp ON u.user_id = sp.user_id
             WHERE u.user_id = ?`,
            [student_id]
        );

        if (students.length === 0 || !students[0].branch) {
            return res.status(404).json({
                success: false,
                message: 'Student profile not found or incomplete'
            });
        }

        // Fetch job
        const [jobs] = await pool.query(
            `SELECT j.job_id, j.title, j.minimum_cgpa, j.allowed_branch, j.maximum_backlogs,
                    c.name AS company_name
             FROM jobs j
             JOIN companies c ON j.company_id = c.company_id
             WHERE j.job_id = ?`,
            [jobId]
        );

        if (jobs.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Job not found with ID ${jobId}`
            });
        }

        const student = students[0];
        const job = jobs[0];

        // Check if student has already applied
        const [existing] = await pool.query(
            'SELECT application_id, status, applied_at FROM applications WHERE student_id = ? AND job_id = ?',
            [student.user_id, jobId]
        );

        const eligibility = checkEligibility(student, job);

        res.status(200).json({
            success: true,
            job_id: jobId,
            job_title: job.title,
            company_name: job.company_name,
            eligible: eligibility.eligible,
            reasons: eligibility.reasons,
            hasApplied: existing.length > 0,
            applicationStatus: existing.length > 0 ? existing[0].status : null,
            criteria: {
                minimum_cgpa: job.minimum_cgpa,
                allowed_branch: job.allowed_branch,
                maximum_backlogs: job.maximum_backlogs
            },
            studentProfile: {
                name: student.name,
                branch: student.branch,
                cgpa: student.cgpa,
                backlogs: student.backlogs
            }
        });
    } catch (error) {
        console.error('Error checking eligibility:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error while evaluating eligibility',
            error: error.message
        });
    }
};

// @desc    Get all applications submitted by the logged-in student
// @route   GET /api/applications/my-applications
// @access  Private (Authenticated Student)
const getMyApplications = async (req, res) => {
    try {
        const studentId = req.user ? req.user.userId : req.query.studentId;

        if (!studentId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
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
            count: applications.length,
            applications
        });
    } catch (error) {
        console.error('Error fetching my applications:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching applications',
            error: error.message
        });
    }
};

// @desc    Get all applications submitted by a specific student (by URL param)
// @route   GET /api/applications/student/:studentId
// @access  Private
const getApplicationsByStudent = async (req, res) => {
    try {
        const studentId = parseInt(req.params.studentId, 10);

        if (isNaN(studentId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid student ID parameter'
            });
        }

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
// @access  Private (Admin Only)
const getApplicationsByJob = async (req, res) => {
    try {
        const jobId = parseInt(req.params.jobId, 10);

        if (isNaN(jobId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid job ID parameter'
            });
        }

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
    checkJobEligibility,
    getMyApplications,
    getApplicationsByStudent,
    getApplicationsByJob
};
