/**
 * 🔐 Authentication Middleware (JWT)
 * 
 * Lightweight auth system for Campus Mate:
 * - Auto-generates a session token on first visit (no login required)
 * - Validates tokens on protected routes
 * - Maps tokens to userIds for data isolation
 * 
 * This is a "device-based" auth — each browser session gets a unique userId.
 * Upgrade to full OAuth (Google login) for production.
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const logger = require('./logger');

const JWT_SECRET = process.env.JWT_SECRET || 'campus-mate-dev-secret-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

/**
 * Generate a new session token for a user
 */
function generateToken(userId) {
    if (!userId) {
        userId = `user-${crypto.randomBytes(6).toString('hex')}`;
    }
    const token = jwt.sign({userId}, JWT_SECRET, {expiresIn: JWT_EXPIRY});
    return {token, userId};
}

/**
 * Verify a JWT token
 * @returns {object|null} Decoded payload or null
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return null;
    }
}

/**
 * Express middleware — extracts userId from JWT
 * 
 * Behavior:
 * - If valid Authorization header: uses the userId from token
 * - If no token: falls back to body/query userId (backward compatible)
 * - Attaches req.userId for downstream use
 */
function authMiddleware(req, res, next) {
    // Try to extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        const decoded = verifyToken(token);

        if (decoded && decoded.userId) {
            req.userId = decoded.userId;
            req.authenticated = true;
            return next();
        }

        // Token exists but is invalid/expired
        logger.warn('Invalid or expired JWT token');
    }

    // Fallback: use userId from body or query (backward compatible)
    // This ensures existing functionality doesn't break
    req.userId = req.body?.userId || req.query?.userId || 'user-123';
    req.authenticated = false;
    next();
}

module.exports = {
    generateToken,
    verifyToken,
    authMiddleware,
    JWT_SECRET,
    JWT_EXPIRY
};
