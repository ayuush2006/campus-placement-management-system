// ==============================================================================
// controllers/adminController.js - Admin Module & Analytics Controller
// Calculates real-time placement statistics and summarizes campus drive activities
// ==============================================================================

const { pool } = require('../config/db');

// @desc    Get real-time Admin Dashboard statistics & recent placement activity
// @route   GET /api/admin/dashboard
// @access  Private (Admin Only)
const getAdminDashboardStats = async (req, res) => {
    try {
        // 1. Total Registered Students
        const [studentCount] = await pool.query(
            "SELECT COUNT(*) AS total FROM users WHERE role = 'student'"
        );

        // 2. Total Partner Companies
        const [companyCount] = await pool.query(
            "SELECT COUNT(*) AS total FROM companies"
        );

        // 3. Total Job Openings
        const [jobCount] = await pool.query(
            "SELECT COUNT(*) AS total FROM jobs"
        );

        // 4. Applications Statistics (Total, Shortlisted, Rejected, Under Review)
        const [appStats] = await pool.query(
            `SELECT
                COUNT(*) AS total_applications,
                SUM(CASE WHEN status = 'Shortlisted' THEN 1 ELSE 0 END) AS total_shortlisted,
                SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) AS total_rejected,
                SUM(CASE WHEN status = 'Applied' THEN 1 ELSE 0 END) AS total_under_review
             FROM applications`
        );

        // 5. Recent 5 Applications with student & company details
        const [recentApplications] = await pool.query(
            `SELECT a.application_id, a.status, a.applied_at,
                    u.name AS student_name, u.email AS student_email,
                    sp.roll_number, sp.branch, sp.cgpa,
                    j.job_id, j.title AS job_title, j.package_lpa,
                    c.company_id, c.name AS company_name
             FROM applications a
             JOIN users u ON a.student_id = u.user_id
             LEFT JOIN student_profiles sp ON u.user_id = sp.user_id
             JOIN jobs j ON a.job_id = j.job_id
             JOIN companies c ON j.company_id = c.company_id
             ORDER BY a.applied_at DESC
             LIMIT 5`
        );

        // 6. Recent 5 Jobs with applicant counts
        const [recentJobs] = await pool.query(
            `SELECT j.job_id, j.title, j.package_lpa, j.minimum_cgpa, j.allowed_branch,
                    j.maximum_backlogs, j.deadline, j.created_at,
                    c.name AS company_name,
                    COUNT(a.application_id) AS applicant_count
             FROM jobs j
             JOIN companies c ON j.company_id = c.company_id
             LEFT JOIN applications a ON j.job_id = a.job_id
             GROUP BY j.job_id, c.name
             ORDER BY j.created_at DESC
             LIMIT 5`
        );

        res.status(200).json({
            success: true,
            dashboard: {
                stats: {
                    totalStudents: studentCount[0].total || 0,
                    totalCompanies: companyCount[0].total || 0,
                    totalJobs: jobCount[0].total || 0,
                    totalApplications: appStats[0].total_applications || 0,
                    totalShortlisted: appStats[0].total_shortlisted || 0,
                    totalRejected: appStats[0].total_rejected || 0,
                    totalUnderReview: appStats[0].total_under_review || 0
                },
                recentApplications,
                recentJobs
            }
        });
    } catch (error) {
        console.error('Error fetching admin dashboard statistics:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error while calculating admin statistics',
            error: error.message
        });
    }
};


// @desc    Get admin placement analytics (by status, branch, company)
// @route   GET /api/admin/analytics
// @access  Private (Admin Only)
//
// Uses MySQL aggregation: COUNT(), GROUP BY, JOIN
// Returns real data — nothing is hardcoded.
//
const getAdminAnalytics = async (req, res) => {
    try {
        // 1. Applications grouped by status
        const [byStatus] = await pool.query(
            `SELECT status, COUNT(*) AS count
             FROM applications
             GROUP BY status
             ORDER BY count DESC`
        );

        // 2. Applications grouped by student branch (JOIN with student_profiles)
        const [byBranch] = await pool.query(
            `SELECT sp.branch, COUNT(a.application_id) AS application_count,
                    SUM(CASE WHEN a.status = 'Shortlisted' THEN 1 ELSE 0 END) AS shortlisted_count
             FROM applications a
             JOIN student_profiles sp ON a.student_id = sp.user_id
             GROUP BY sp.branch
             ORDER BY application_count DESC`
        );

        // 3. Jobs posted per company with applicant count
        const [byCompany] = await pool.query(
            `SELECT c.company_id, c.name AS company_name, c.industry, c.location,
                    COUNT(DISTINCT j.job_id) AS jobs_posted,
                    COUNT(a.application_id) AS total_applicants,
                    SUM(CASE WHEN a.status = 'Shortlisted' THEN 1 ELSE 0 END) AS shortlisted_count
             FROM companies c
             LEFT JOIN jobs j ON c.company_id = j.company_id
             LEFT JOIN applications a ON j.job_id = a.job_id
             GROUP BY c.company_id, c.name, c.industry, c.location
             ORDER BY total_applicants DESC`
        );

        // 4. Top 5 most popular jobs (by application count)
        const [topJobs] = await pool.query(
            `SELECT j.job_id, j.title, j.package_lpa, j.allowed_branch,
                    c.name AS company_name,
                    COUNT(a.application_id) AS applicant_count,
                    SUM(CASE WHEN a.status = 'Shortlisted' THEN 1 ELSE 0 END) AS shortlisted_count
             FROM jobs j
             JOIN companies c ON j.company_id = c.company_id
             LEFT JOIN applications a ON j.job_id = a.job_id
             GROUP BY j.job_id, j.title, j.package_lpa, j.allowed_branch, c.name
             ORDER BY applicant_count DESC
             LIMIT 5`
        );

        // 5. Overall summary counts
        const [summary] = await pool.query(
            `SELECT
                (SELECT COUNT(*) FROM users WHERE role = 'student') AS total_students,
                (SELECT COUNT(*) FROM companies) AS total_companies,
                (SELECT COUNT(*) FROM jobs) AS total_jobs,
                (SELECT COUNT(*) FROM applications) AS total_applications,
                (SELECT COUNT(*) FROM applications WHERE status = 'Shortlisted') AS total_shortlisted,
                (SELECT COUNT(*) FROM applications WHERE status = 'Rejected') AS total_rejected,
                (SELECT COUNT(*) FROM applications WHERE status = 'Applied') AS total_under_review`
        );

        res.status(200).json({
            success: true,
            analytics: {
                summary: summary[0],
                applicationsByStatus: byStatus,
                applicationsByBranch: byBranch,
                companySummary: byCompany,
                topJobs
            }
        });

    } catch (error) {
        console.error('Error fetching admin analytics:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching placement analytics',
            error: error.message
        });
    }
};

module.exports = {
    getAdminDashboardStats,
    getAdminAnalytics
};
