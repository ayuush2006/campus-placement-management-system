// ==============================================================================
// controllers/authController.js - Authentication Controller
// Handles registration, student login, admin login, and token issuance
// ==============================================================================

const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { generateToken } = require('../utils/tokenHelper');

const SALT_ROUNDS = 10;

// @desc    Register a new student account
// @route   POST /api/auth/register
// @access  Public
const registerStudent = async (req, res) => {
    try {
        const { name, email, password, roll_number, branch, cgpa, backlogs, phone, resume_url } = req.body;

        // 1. Validation: Check required fields
        if (!name || !email || !password || !roll_number || !branch || cgpa === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields: name, email, password, roll_number, branch, cgpa'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const normalizedRoll = roll_number.trim().toUpperCase();

        // 2. Check for duplicate email
        const [existingEmail] = await pool.query('SELECT user_id FROM users WHERE email = ?', [normalizedEmail]);
        if (existingEmail.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'A user with this email address is already registered'
            });
        }

        // 3. Check for duplicate roll number
        const [existingRoll] = await pool.query('SELECT profile_id FROM student_profiles WHERE roll_number = ?', [normalizedRoll]);
        if (existingRoll.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'A student profile with this roll number already exists'
            });
        }

        // 4. Hash the plain-text password using bcryptjs
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // 5. Insert user record into users table
        const [userResult] = await pool.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name.trim(), normalizedEmail, hashedPassword, 'student']
        );
        const userId = userResult.insertId;

        // 6. Insert academic profile into student_profiles table
        const numBacklogs = backlogs !== undefined ? parseInt(backlogs, 10) : 0;
        const numCgpa = parseFloat(cgpa);

        const [profileResult] = await pool.query(
            `INSERT INTO student_profiles (user_id, roll_number, branch, cgpa, backlogs, phone, resume_url)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, normalizedRoll, branch.trim().toUpperCase(), numCgpa, numBacklogs, phone || null, resume_url || null]
        );

        // 7. Generate JWT token
        const token = generateToken({ user_id: userId, email: normalizedEmail, role: 'student' });

        res.status(201).json({
            success: true,
            message: 'Student registered successfully',
            token,
            user: {
                userId,
                profileId: profileResult.insertId,
                name: name.trim(),
                email: normalizedEmail,
                role: 'student',
                roll_number: normalizedRoll,
                branch: branch.trim().toUpperCase(),
                cgpa: numCgpa,
                backlogs: numBacklogs
            }
        });
    } catch (error) {
        console.error('Error during student registration:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error during student registration',
            error: error.message
        });
    }
};

// @desc    Student Login
// @route   POST /api/auth/student/login
// @access  Public
const loginStudent = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // 2. Fetch user from users table
        const [users] = await pool.query(
            `SELECT u.user_id, u.name, u.email, u.password, u.role,
                    sp.profile_id, sp.roll_number, sp.branch, sp.cgpa, sp.backlogs
             FROM users u
             LEFT JOIN student_profiles sp ON u.user_id = sp.user_id
             WHERE u.email = ?`,
            [normalizedEmail]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const user = users[0];

        // 3. Ensure the user is a student
        if (user.role !== 'student') {
            return res.status(403).json({
                success: false,
                message: 'Access denied: Account is not a student account. Use Admin Login instead.'
            });
        }

        // 4. Compare candidate password with the stored bcrypt hash
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // 5. Generate JWT token
        const token = generateToken(user);

        res.status(200).json({
            success: true,
            message: 'Student login successful',
            token,
            user: {
                userId: user.user_id,
                profileId: user.profile_id,
                name: user.name,
                email: user.email,
                role: user.role,
                roll_number: user.roll_number,
                branch: user.branch,
                cgpa: user.cgpa,
                backlogs: user.backlogs
            }
        });
    } catch (error) {
        console.error('Error during student login:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error during student login',
            error: error.message
        });
    }
};

// @desc    Admin Login
// @route   POST /api/auth/admin/login
// @access  Public
const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // 2. Fetch admin user
        const [users] = await pool.query(
            'SELECT user_id, name, email, password, role FROM users WHERE email = ?',
            [normalizedEmail]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const user = users[0];

        // 3. Verify user has admin role
        if (user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied: Account does not have administrator privileges.'
            });
        }

        // 4. Compare password with bcrypt hash
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // 5. Generate JWT token
        const token = generateToken(user);

        res.status(200).json({
            success: true,
            message: 'Admin login successful',
            token,
            user: {
                userId: user.user_id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Error during admin login:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error during admin login',
            error: error.message
        });
    }
};

// @desc    Unified Login (Student or Admin)
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const [users] = await pool.query(
            `SELECT u.user_id, u.name, u.email, u.password, u.role,
                    sp.profile_id, sp.roll_number, sp.branch, sp.cgpa, sp.backlogs
             FROM users u
             LEFT JOIN student_profiles sp ON u.user_id = sp.user_id
             WHERE u.email = ?`,
            [normalizedEmail]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const user = users[0];

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const token = generateToken(user);

        res.status(200).json({
            success: true,
            message: `${user.role === 'admin' ? 'Admin' : 'Student'} login successful`,
            token,
            user: {
                userId: user.user_id,
                profileId: user.profile_id || null,
                name: user.name,
                email: user.email,
                role: user.role,
                roll_number: user.roll_number || null,
                branch: user.branch || null,
                cgpa: user.cgpa || null,
                backlogs: user.backlogs || 0
            }
        });
    } catch (error) {
        console.error('Error during login:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error during login',
            error: error.message
        });
    }
};

// @desc    Get current authenticated user profile
// @route   GET /api/auth/me
// @access  Private (Authenticated)
const getCurrentUser = async (req, res) => {
    try {
        const [users] = await pool.query(
            `SELECT u.user_id, u.name, u.email, u.role, u.created_at,
                    sp.profile_id, sp.roll_number, sp.branch, sp.cgpa, sp.backlogs, sp.phone, sp.resume_url
             FROM users u
             LEFT JOIN student_profiles sp ON u.user_id = sp.user_id
             WHERE u.user_id = ?`,
            [req.user.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User account not found'
            });
        }

        res.status(200).json({
            success: true,
            user: users[0]
        });
    } catch (error) {
        console.error('Error getting profile:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching profile',
            error: error.message
        });
    }
};

module.exports = {
    registerStudent,
    loginStudent,
    loginAdmin,
    login,
    getCurrentUser
};
