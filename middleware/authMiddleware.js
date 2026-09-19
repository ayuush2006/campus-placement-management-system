// ==============================================================================
// middleware/authMiddleware.js - Authentication & Role Authorization Middleware
// Verifies JWT tokens and enforces student/admin permissions
// ==============================================================================

const { verifyToken } = require('../utils/tokenHelper');

/**
 * Middleware to verify that the request has a valid JWT token
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];

    // 1. Check if Authorization header exists
    if (!authHeader) {
        return res.status(401).json({
            success: false,
            message: 'Access denied: No authentication token provided in Authorization header'
        });
    }

    // 2. Format should be: "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({
            success: false,
            message: 'Access denied: Token format must be "Bearer <token>"'
        });
    }

    const token = parts[1];

    // 3. Verify the token
    try {
        const decoded = verifyToken(token);
        // Attach decoded user information (userId, email, role) to the request object
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid, malformed, or expired token',
            error: error.message
        });
    }
}

/**
 * Middleware factory to enforce specific roles (Role-Based Access Control)
 * @param  {...string} allowedRoles - e.g., 'admin', 'student'
 */
function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        // Ensure user is authenticated first
        if (!req.user || !req.user.role) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required before checking permissions'
            });
        }

        // Check if user role matches one of the allowed roles
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied: Role "${req.user.role}" does not have permission to access this resource. Allowed: [${allowedRoles.join(', ')}]`
            });
        }

        next();
    };
}

// Convenient shorthand helpers
const requireAdmin = authorizeRoles('admin');
const requireStudent = authorizeRoles('student');

module.exports = {
    authenticateToken,
    authorizeRoles,
    requireAdmin,
    requireStudent
};
