// ==============================================================================
// utils/tokenHelper.js - JSON Web Token (JWT) Helper Utilities
// Generates and verifies JWT tokens using secret from .env
// ==============================================================================

const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_placement_key_12345';
const TOKEN_EXPIRY = '24h';

/**
 * Generate a signed JWT for an authenticated user
 * @param {Object} user - User object containing user_id, email, and role
 * @returns {string} - Signed JWT string
 */
function generateToken(user) {
    const payload = {
        userId: user.user_id || user.userId,
        email: user.email,
        role: user.role
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

/**
 * Verify a given JWT token
 * @param {string} token - The raw JWT token string
 * @returns {Object} - Decoded payload
 */
function verifyToken(token) {
    return jwt.verify(token, JWT_SECRET);
}

module.exports = {
    generateToken,
    verifyToken
};
