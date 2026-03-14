/**
 * Authentication Middleware (JWT)
 * 
 * Device-based auth for Campus Mate:
 * - Auto-generates a session token on first visit (no login required)
 * - Validates tokens on protected routes
 * - Maps tokens to userIds for data isolation
 * - userId from token takes precedence over body/query params
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const logger = require('./logger');

// S1 fix: Require JWT_SECRET from env, generate a random one for dev only
const JWT_SECRET = (() => {
    if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
    if (process.env.NODE_ENV === 'production') {
        logger.error('FATAL: JWT_SECRET must be set in production environment');
        process.exit(1);
    }
    // Dev-only: generate a random secret per server start (sessions won't survive restarts)
    const devSecret = crypto.randomBytes(32).toString('hex');
    logger.warn('No JWT_SECRET set — using ephemeral random secret (dev mode only)');
    return devSecret;
})();

const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

/**
 * Generate a new session token for a user
 */
function generateToken(userId) {
    if (!userId) {
        userId = `user-${crypto.randomBytes(8).toString('hex')}`;
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
 * S3 fix: When a valid token exists, always use token's userId (ignore body/query).
 * When no token exists, auto-provision a session (backward compatible).
 * This prevents userId spoofing via body/query params.
 */
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        const decoded = verifyToken(token);

        if (decoded && decoded.userId) {
            // S5 fix: Token userId takes precedence — ignore any userId in body/query
            req.userId = decoded.userId;
            req.authenticated = true;
            return next();
        }

        // Token exists but is invalid/expired — reject instead of falling through
        logger.warn('Invalid or expired JWT token — rejecting request');
        return res.status(401).json({error: 'Invalid or expired token. Please re-authenticate.'});
    }

    // No token provided: auto-provision a session for backward compatibility
    // Generate a proper unique userId instead of using a shared default
    const session = generateToken();
    req.userId = session.userId;
    req.authenticated = false;
    req.newSessionToken = session.token; // Routes can return this to the client
    logger.debug(`Auto-provisioned session for ${req.userId}`);
    next();
}

// S2 fix: Do NOT export JWT_SECRET — only export the functions that use it
module.exports = {
    generateToken,
    verifyToken,
    authMiddleware,
    JWT_EXPIRY
};
