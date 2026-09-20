// ==============================================================================
// controllers/studentController.js - Student Management Controller
// Handles registration, retrieval, and updating of student data
// ==============================================================================

const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

// @desc    Register a new student and create profile
// @route   POST /api/students
// @access  Public
const createStudent = async (req, res) => {
    try {
        const { name, email, password, roll_number, branch, cgpa, backlogs, phone, resume_url } = req.body;

        // 1. Validation: Ensure required fields are provided
        if (!name || !email || !password || !roll_number || !branch || cgpa === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields: name, email, password, roll_number, branch, cgpa'
            });
        }

        // 2. Check if email already exists
        const [existingEmail] = await pool.query('SELECT user_id FROM users WHERE email = ?', [email]);
        if (existingEmail.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'A user with this email already exists'
            });
        }

        // 3. Check if roll number already exists
        const [existingRoll] = await pool.query('SELECT profile_id FROM student_profiles WHERE roll_number = ?', [roll_number]);
        if (existingRoll.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'A student profile with this roll number already exists'
            });
        }

        // 4. Hash the password with bcryptjs before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        // 5. Insert user record into `users` table
        const [userResult] = await pool.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name.trim(), email.trim().toLowerCase(), hashedPassword, 'student']
        );
        const userId = userResult.insertId;

        // 5. Insert profile record into `student_profiles` table
        const numBacklogs = backlogs !== undefined ? parseInt(backlogs, 10) : 0;
        const numCgpa = parseFloat(cgpa);

        const [profileResult] = await pool.query(
            'INSERT INTO student_profiles (user_id, roll_number, branch, cgpa, backlogs, phone, resume_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, roll_number.trim().toUpperCase(), branch.trim().toUpperCase(), numCgpa, numBacklogs, phone || null, resume_url || null]
        );

        // 6. Return response
        res.status(201).json({
            success: true,
            message: 'Student registered successfully',
            student: {
                userId,
                profileId: profileResult.insertId,
                name,
                email,
                role: 'student',
                roll_number: roll_number.toUpperCase(),
                branch: branch.toUpperCase(),
                cgpa: numCgpa,
                backlogs: numBacklogs,
                phone: phone || null,
                resume_url: resume_url || null
            }
        });
    } catch (error) {
        console.error('Error creating student:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error while creating student',
            error: error.message
        });
    }
};

// @desc    Get student by ID (user_id)
// @route   GET /api/students/:id
// @access  Public
const getStudentById = async (req, res) => {
    try {
        const studentId = parseInt(req.params.id, 10);

        if (isNaN(studentId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid student ID parameter'
            });
        }

        // Join users with student_profiles
        const [rows] = await pool.query(
            `SELECT u.user_id, u.name, u.email, u.role, u.created_at,
                    sp.profile_id, sp.roll_number, sp.branch, sp.cgpa, sp.backlogs, sp.phone, sp.resume_url, sp.updated_at
             FROM users u
             JOIN student_profiles sp ON u.user_id = sp.user_id
             WHERE u.user_id = ? AND u.role = 'student'`,
            [studentId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Student not found with ID ${studentId}`
            });
        }

        res.status(200).json({
            success: true,
            student: rows[0]
        });
    } catch (error) {
        console.error('Error getting student by ID:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching student details',
            error: error.message
        });
    }
};

// @desc    Update student information
// @route   PUT /api/students/:id
// @access  Public
const updateStudent = async (req, res) => {
    try {
        const studentId = parseInt(req.params.id, 10);

        if (isNaN(studentId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid student ID parameter'
            });
        }

        // Check if student exists
        const [existing] = await pool.query(
            'SELECT u.user_id, sp.profile_id FROM users u LEFT JOIN student_profiles sp ON u.user_id = sp.user_id WHERE u.user_id = ?',
            [studentId]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Student not found with ID ${studentId}`
            });
        }

        const { name, branch, cgpa, backlogs, phone, resume_url } = req.body;

        // 1. Update users table if name is provided
        if (name) {
            await pool.query('UPDATE users SET name = ? WHERE user_id = ?', [name.trim(), studentId]);
        }

        // 2. Update student_profiles table
        const profileUpdates = [];
        const profileParams = [];

        if (branch !== undefined) {
            profileUpdates.push('branch = ?');
            profileParams.push(branch.trim().toUpperCase());
        }
        if (cgpa !== undefined) {
            profileUpdates.push('cgpa = ?');
            profileParams.push(parseFloat(cgpa));
        }
        if (backlogs !== undefined) {
            profileUpdates.push('backlogs = ?');
            profileParams.push(parseInt(backlogs, 10));
        }
        if (phone !== undefined) {
            profileUpdates.push('phone = ?');
            profileParams.push(phone);
        }
        if (resume_url !== undefined) {
            profileUpdates.push('resume_url = ?');
            profileParams.push(resume_url);
        }

        if (profileUpdates.length > 0) {
            profileParams.push(studentId);
            await pool.query(
                `UPDATE student_profiles SET ${profileUpdates.join(', ')} WHERE user_id = ?`,
                profileParams
            );
        }

        // Fetch updated data to return
        const [updated] = await pool.query(
            `SELECT u.user_id, u.name, u.email, sp.profile_id, sp.roll_number, sp.branch, sp.cgpa, sp.backlogs, sp.phone, sp.resume_url
             FROM users u
             JOIN student_profiles sp ON u.user_id = sp.user_id
             WHERE u.user_id = ?`,
            [studentId]
        );

        res.status(200).json({
            success: true,
            message: 'Student information updated successfully',
            student: updated[0]
        });
    } catch (error) {
        console.error('Error updating student:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error while updating student',
            error: error.message
        });
    }
};

// @desc    Get current authenticated student's profile
// @route   GET /api/students/profile
// @access  Private (Student)
const getStudentProfile = async (req, res) => {
    try {
        const studentId = req.user ? req.user.userId : req.query.studentId;

        if (!studentId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const [rows] = await pool.query(
            `SELECT u.user_id, u.name, u.email, u.role, u.created_at,
                    sp.profile_id, sp.roll_number, sp.branch, sp.cgpa, sp.backlogs, sp.phone, sp.resume_url, sp.updated_at
             FROM users u
             JOIN student_profiles sp ON u.user_id = sp.user_id
             WHERE u.user_id = ?`,
            [studentId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Student profile not found'
            });
        }

        res.status(200).json({
            success: true,
            student: rows[0]
        });
    } catch (error) {
        console.error('Error getting student profile:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching student profile',
            error: error.message
        });
    }
};

// @desc    Update current authenticated student's profile
// @route   PUT /api/students/profile
// @access  Private (Student)
const updateStudentProfile = async (req, res) => {
    try {
        const studentId = req.user ? req.user.userId : req.body.student_id;

        if (!studentId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        req.params.id = studentId;
        return updateStudent(req, res);
    } catch (error) {
        console.error('Error updating student profile:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error while updating student profile',
            error: error.message
        });
    }
};

// @desc    Get student placement dashboard (Profile + Applications Summary + Jobs Feed)
// @route   GET /api/students/dashboard
// @access  Private (Student)
const getStudentDashboard = async (req, res) => {
    try {
        const studentId = req.user ? req.user.userId : req.query.studentId;

        if (!studentId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // 1. Fetch student profile
        const [studentRows] = await pool.query(
            `SELECT u.user_id, u.name, u.email, sp.profile_id, sp.roll_number, sp.branch, sp.cgpa, sp.backlogs, sp.phone, sp.resume_url
             FROM users u
             JOIN student_profiles sp ON u.user_id = sp.user_id
             WHERE u.user_id = ?`,
            [studentId]
        );

        if (studentRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Student profile not found'
            });
        }

        const student = studentRows[0];

        // 2. Fetch applications summary for student
        const [appStats] = await pool.query(
            `SELECT
                COUNT(*) AS total_applications,
                SUM(CASE WHEN status = 'Applied' THEN 1 ELSE 0 END) AS applied_count,
                SUM(CASE WHEN status = 'Shortlisted' THEN 1 ELSE 0 END) AS shortlisted_count,
                SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) AS rejected_count
             FROM applications
             WHERE student_id = ?`,
            [studentId]
        );

        // 3. Fetch student's recent applications with job and company info
        const [applications] = await pool.query(
            `SELECT a.application_id, a.job_id, a.status, a.applied_at,
                    j.title AS job_title, j.package_lpa, j.location AS job_location,
                    c.name AS company_name
             FROM applications a
             JOIN jobs j ON a.job_id = j.job_id
             JOIN companies c ON j.company_id = c.company_id
             WHERE a.student_id = ?
             ORDER BY a.applied_at DESC`,
            [studentId]
        );

        // 4. Fetch available jobs and annotate with eligibility and applied status
        const [allJobs] = await pool.query(
            `SELECT j.job_id, j.title, j.description, j.package_lpa, j.location,
                    j.minimum_cgpa, j.allowed_branch, j.maximum_backlogs, j.deadline,
                    c.name AS company_name, c.website AS company_website
             FROM jobs j
             JOIN companies c ON j.company_id = c.company_id
             ORDER BY j.created_at DESC`
        );

        const appliedJobIds = new Set(applications.map(a => a.job_id));
        const { checkEligibility } = require('../utils/eligibilityHelper');

        const annotatedJobs = allJobs.map(job => {
            const eligibility = checkEligibility(student, job);
            return {
                ...job,
                hasApplied: appliedJobIds.has(job.job_id),
                isEligible: eligibility.eligible,
                eligibilityReasons: eligibility.reasons
            };
        });

        res.status(200).json({
            success: true,
            dashboard: {
                student,
                stats: {
                    totalApplications: appStats[0].total_applications || 0,
                    appliedCount: appStats[0].applied_count || 0,
                    shortlistedCount: appStats[0].shortlisted_count || 0,
                    rejectedCount: appStats[0].rejected_count || 0,
                    totalAvailableJobs: allJobs.length
                },
                recentApplications: applications,
                jobs: annotatedJobs
            }
        });
    } catch (error) {
        console.error('Error fetching student dashboard:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching student dashboard',
            error: error.message
        });
    }
};


// @desc    Calculate Placement Readiness Score for authenticated student
// @route   GET /api/students/readiness-score
// @access  Private (Student)
//
// RULE-BASED SCORE (Not AI / Not ML):
// The score is calculated using a fixed formula based on profile completeness and academic performance.
// Each criterion contributes a deterministic number of points — fully transparent and explainable.
//
// Scoring Table:
//   CGPA (30 pts)        = (cgpa / 10) × 30  — normalized score based on CGPA out of 10
//   Backlogs (20 pts)    = 20 if 0 backlogs, 10 if 1, 0 if 2+  — rewards clean academic record
//   Phone (10 pts)       = 10 if phone number filled, 0 if missing
//   Resume URL (20 pts)  = 20 if resume link uploaded, 0 if missing
//   Applied (10 pts)     = 10 if applied to at least 1 job, 0 if no applications yet
//   Shortlisted (10 pts) = 10 if shortlisted for at least 1 job, 0 otherwise
//   TOTAL                = up to 100 points
//
const getReadinessScore = async (req, res) => {
    try {
        const studentId = req.user ? req.user.userId : req.query.studentId;

        if (!studentId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required to view readiness score'
            });
        }

        // 1. Fetch student profile data
        const [rows] = await pool.query(
            `SELECT u.user_id, u.name, sp.cgpa, sp.backlogs, sp.phone, sp.resume_url, sp.branch
             FROM users u
             JOIN student_profiles sp ON u.user_id = sp.user_id
             WHERE u.user_id = ? AND u.role = 'student'`,
            [studentId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Student profile not found. Please complete your profile first.'
            });
        }

        const student = rows[0];

        // 2. Fetch application statistics for this student
        const [appStats] = await pool.query(
            `SELECT
                COUNT(*) AS total_applications,
                SUM(CASE WHEN status = 'Shortlisted' THEN 1 ELSE 0 END) AS shortlisted_count
             FROM applications
             WHERE student_id = ?`,
            [studentId]
        );

        const totalApplications = parseInt(appStats[0].total_applications, 10) || 0;
        const shortlistedCount = parseInt(appStats[0].shortlisted_count, 10) || 0;

        // =========================================================
        // RULE-BASED SCORING ALGORITHM
        // Each criterion is evaluated independently using a fixed rule.
        // No randomness. No external model. Fully deterministic.
        // =========================================================

        // Criterion 1: CGPA Score (30 points)
        // Formula: (cgpa / 10) × 30, rounded to 1 decimal
        // Example: CGPA 8.5 → (8.5 / 10) × 30 = 25.5 → floored to 25
        const cgpaValue = parseFloat(student.cgpa) || 0;
        const cgpaScore = Math.floor((Math.min(cgpaValue, 10) / 10) * 30);

        // Criterion 2: Backlogs Score (20 points)
        // Rule: 0 backlogs = full marks, 1 backlog = half, 2+ = 0
        const backlogs = parseInt(student.backlogs, 10) || 0;
        let backlogScore = 0;
        if (backlogs === 0) backlogScore = 20;
        else if (backlogs === 1) backlogScore = 10;
        else backlogScore = 0;

        // Criterion 3: Phone Number Filled (10 points)
        // Rule: Profile must have a phone number
        const phoneScore = student.phone && student.phone.trim() !== '' ? 10 : 0;

        // Criterion 4: Resume URL Uploaded (20 points)
        // Rule: Profile must have a resume/portfolio link
        const resumeScore = student.resume_url && student.resume_url.trim() !== '' ? 20 : 0;

        // Criterion 5: Applied to Jobs (10 points)
        // Rule: At least 1 job application submitted
        const appliedScore = totalApplications > 0 ? 10 : 0;

        // Criterion 6: Shortlisted (10 points)
        // Rule: At least 1 shortlisting achieved
        const shortlistScore = shortlistedCount > 0 ? 10 : 0;

        // Final Total Score (max 100)
        const totalScore = cgpaScore + backlogScore + phoneScore + resumeScore + appliedScore + shortlistScore;

        // Build explanatory messages for each criterion
        const breakdown = {
            cgpa: {
                points: cgpaScore,
                maxPoints: 30,
                value: cgpaValue.toFixed(2),
                message: `CGPA ${cgpaValue.toFixed(2)}/10 → ${cgpaScore}/30 points`
            },
            backlogs: {
                points: backlogScore,
                maxPoints: 20,
                value: backlogs,
                message: backlogs === 0
                    ? 'No active backlogs → 20/20 points (Clean academic record!)'
                    : backlogs === 1
                        ? '1 active backlog → 10/20 points (Clear it for full marks)'
                        : `${backlogs} backlogs → 0/20 points (Clear backlogs to improve score)`
            },
            phone: {
                points: phoneScore,
                maxPoints: 10,
                value: student.phone ? 'Provided' : 'Missing',
                message: phoneScore > 0 ? 'Phone number provided → 10/10 points' : 'Phone number missing → 0/10 points (Add phone to profile)'
            },
            resume: {
                points: resumeScore,
                maxPoints: 20,
                value: student.resume_url ? 'Uploaded' : 'Missing',
                message: resumeScore > 0 ? 'Resume URL uploaded → 20/20 points' : 'Resume URL missing → 0/20 points (Upload your resume link to profile)'
            },
            applied: {
                points: appliedScore,
                maxPoints: 10,
                value: totalApplications,
                message: appliedScore > 0 ? `Applied to ${totalApplications} job(s) → 10/10 points` : 'No applications yet → 0/10 points (Apply to a job to earn these points)'
            },
            shortlisted: {
                points: shortlistScore,
                maxPoints: 10,
                value: shortlistedCount,
                message: shortlistScore > 0 ? `Shortlisted in ${shortlistedCount} job(s) → 10/10 points 🎉` : 'Not yet shortlisted → 0/10 points (Keep applying!)'
            }
        };

        // Grade classification
        let grade = '';
        let gradeColor = '';
        if (totalScore >= 85) { grade = 'Excellent 🚀'; gradeColor = '#198754'; }
        else if (totalScore >= 70) { grade = 'Good 👍'; gradeColor = '#0d6efd'; }
        else if (totalScore >= 50) { grade = 'Average 📈'; gradeColor = '#ffc107'; }
        else { grade = 'Needs Improvement ⚠️'; gradeColor = '#dc3545'; }

        res.status(200).json({
            success: true,
            studentName: student.name,
            score: totalScore,
            maxScore: 100,
            grade,
            gradeColor,
            breakdown,
            tips: totalScore < 100 ? [
                !student.phone ? '📱 Add your phone number to your profile (+10 pts)' : null,
                !student.resume_url ? '📄 Upload your resume/portfolio link (+20 pts)' : null,
                backlogs > 0 ? `📚 Clear your ${backlogs} active backlog(s) (+${backlogs === 1 ? 10 : 20} pts)` : null,
                totalApplications === 0 ? '🚀 Apply to at least one job opening (+10 pts)' : null,
                shortlistedCount === 0 ? '🎯 Get shortlisted to earn bonus points (+10 pts)' : null
            ].filter(Boolean) : ['🎉 Perfect Score! Keep it up!']
        });

    } catch (error) {
        console.error('Error calculating readiness score:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error while calculating placement readiness score',
            error: error.message
        });
    }
};

// @desc    Get recommended jobs sorted by match score for authenticated student
// @route   GET /api/students/recommended-jobs
// @access  Private (Student)
//
// RULE-BASED RECOMMENDATION SYSTEM (Not AI / Not ML):
// For each available job, a match % is computed using a weighted formula.
// Weights are fixed and transparent — no hidden model, no training, no randomness.
//
// Match Score Formula:
//   Branch Match (40%)  = 100 if student branch is in job's allowed_branch, else 0
//   CGPA Score   (35%)  = min(student_cgpa / job_min_cgpa, 1.0) × 100 (capped at 100)
//   Backlog Score(25%)  = 100 if student.backlogs <= job.max_backlogs, else 0
//
// Final Match % = (0.40 × branchScore) + (0.35 × cgpaScore) + (0.25 × backlogScore)
// Jobs are sorted descending by match %.
//
const getRecommendedJobs = async (req, res) => {
    try {
        const studentId = req.user ? req.user.userId : req.query.studentId;

        if (!studentId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required to view recommended jobs'
            });
        }

        // 1. Fetch student profile
        const [studentRows] = await pool.query(
            `SELECT u.user_id, u.name, sp.cgpa, sp.backlogs, sp.branch
             FROM users u
             JOIN student_profiles sp ON u.user_id = sp.user_id
             WHERE u.user_id = ? AND u.role = 'student'`,
            [studentId]
        );

        if (studentRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Student profile not found'
            });
        }

        const student = studentRows[0];

        // 2. Fetch all available jobs with company info
        const [allJobs] = await pool.query(
            `SELECT j.job_id, j.title, j.description, j.package_lpa, j.location,
                    j.minimum_cgpa, j.allowed_branch, j.maximum_backlogs, j.deadline,
                    c.company_id, c.name AS company_name, c.website AS company_website
             FROM jobs j
             JOIN companies c ON j.company_id = c.company_id
             ORDER BY j.created_at DESC`
        );

        // 3. Fetch the student's applied job IDs to mark them
        const [appliedRows] = await pool.query(
            'SELECT job_id, status FROM applications WHERE student_id = ?',
            [studentId]
        );
        const appliedMap = {};
        appliedRows.forEach(a => { appliedMap[a.job_id] = a.status; });

        // 4. Check eligibility + compute match score for each job
        const { checkEligibility } = require('../utils/eligibilityHelper');

        const studentCgpa = parseFloat(student.cgpa) || 0;
        const studentBacklogs = parseInt(student.backlogs, 10) || 0;
        const studentBranch = (student.branch || '').trim().toUpperCase();

        const recommendedJobs = allJobs.map(job => {
            const minCgpa = parseFloat(job.minimum_cgpa) || 0;
            const maxBacklogs = parseInt(job.maximum_backlogs, 10) || 0;
            const rawAllowed = (job.allowed_branch || '').trim().toUpperCase();

            // --- Branch Match Score (40% weight) ---
            // 100 if student branch is allowed, 0 if not
            let branchScore = 0;
            if (rawAllowed === 'ALL') {
                branchScore = 100;
            } else {
                const allowedBranches = rawAllowed.split(',').map(b => b.trim());
                branchScore = allowedBranches.includes(studentBranch) ? 100 : 0;
            }

            // --- CGPA Score (35% weight) ---
            // Ratio of student CGPA to required CGPA, capped at 100
            // If job has no CGPA requirement (0), full score
            let cgpaMatchScore = 0;
            if (minCgpa === 0) {
                cgpaMatchScore = 100;
            } else {
                cgpaMatchScore = Math.min((studentCgpa / minCgpa) * 100, 100);
            }

            // --- Backlog Score (25% weight) ---
            // Full marks if student has <= max allowed backlogs
            const backlogMatchScore = studentBacklogs <= maxBacklogs ? 100 : 0;

            // --- Weighted Final Match % ---
            const matchPercent = Math.round(
                (0.40 * branchScore) + (0.35 * cgpaMatchScore) + (0.25 * backlogMatchScore)
            );

            // Check full eligibility using the existing eligibility engine
            const eligibility = checkEligibility(student, job);

            // Determine match label
            let matchLabel = '';
            if (matchPercent >= 80) matchLabel = 'High Match 🔥';
            else if (matchPercent >= 50) matchLabel = 'Medium Match 👍';
            else matchLabel = 'Low Match';

            return {
                ...job,
                matchPercent,
                matchLabel,
                branchScore: Math.round(branchScore),
                cgpaMatchScore: Math.round(cgpaMatchScore),
                backlogMatchScore: Math.round(backlogMatchScore),
                isEligible: eligibility.eligible,
                eligibilityReasons: eligibility.reasons,
                hasApplied: !!appliedMap[job.job_id],
                applicationStatus: appliedMap[job.job_id] || null
            };
        });

        // 5. Sort by match % descending (highest match first)
        recommendedJobs.sort((a, b) => b.matchPercent - a.matchPercent);

        res.status(200).json({
            success: true,
            studentName: student.name,
            studentProfile: {
                branch: student.branch,
                cgpa: studentCgpa,
                backlogs: studentBacklogs
            },
            count: recommendedJobs.length,
            jobs: recommendedJobs,
            algorithmNote: 'Match % is calculated using a deterministic weighted formula: Branch(40%) + CGPA(35%) + Backlogs(25%). This is rule-based, not AI.'
        });

    } catch (error) {
        console.error('Error fetching recommended jobs:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching recommended jobs',
            error: error.message
        });
    }
};

module.exports = {
    createStudent,
    getStudentById,
    updateStudent,
    getStudentProfile,
    updateStudentProfile,
    getStudentDashboard,
    getReadinessScore,
    getRecommendedJobs
};

