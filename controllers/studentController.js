// ==============================================================================
// controllers/studentController.js - Student Management Controller
// Handles registration, retrieval, and updating of student data
// ==============================================================================

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

        // 4. Insert user record into `users` table
        const [userResult] = await pool.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name.trim(), email.trim().toLowerCase(), password, 'student']
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

module.exports = {
    createStudent,
    getStudentById,
    updateStudent
};
