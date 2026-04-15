/**
 * Authentication Middleware (JWT)
 * 
 * Device-based auth for Campus Mate:
 * - Creates session token via /auth/session
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
const SESSION_REFRESH_THRESHOLD_MS = 48 * 60 * 60 * 1000;

function parseDurationToMs(duration) {
    if (typeof duration === 'number' && Number.isFinite(duration)) {
        return duration;
    }

    const match = String(duration).trim().match(/^(\d+)([smhd])$/i);
    if (!match) {
        return 7 * 24 * 60 * 60 * 1000;
    }

    const value = Number(match[1]);
    const unit = match[2].toLowerCase();
    const unitToMs = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000
    };

    return value * (unitToMs[unit] || unitToMs.d);
}

const JWT_EXPIRY_MS = parseDurationToMs(JWT_EXPIRY);

function setSessionCookie(res, token) {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('campusMate_token', token, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: JWT_EXPIRY_MS,
        path: '/'
    });
}

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

function getCookieValue(cookieHeader, key) {
    if (!cookieHeader) return null;
    const pairs = cookieHeader.split(';');
    for (const pair of pairs) {
        const [rawName, ...rawValue] = pair.trim().split('=');
        if (rawName === key) {
            return decodeURIComponent(rawValue.join('='));
        }
    }
    return null;
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
    const cookieToken = getCookieValue(req.headers.cookie, 'campusMate_token');

    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7);
    } else if (cookieToken) {
        token = cookieToken;
    }

    if (!token) {
        return res.status(401).json({error: 'Authentication required. Create a session first via /api/auth/session.'});
    }

    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
        logger.warn('Invalid or expired JWT token — rejecting request');
        return res.status(401).json({error: 'Invalid or expired token. Please re-authenticate.'});
    }

    // Token userId always takes precedence over any userId in request payload.
    req.userId = decoded.userId;
    req.authenticated = true;

    const expiresAtMs = decoded.exp ? decoded.exp * 1000 : 0;
    const timeRemainingMs = expiresAtMs ? expiresAtMs - Date.now() : 0;
    if (timeRemainingMs > 0 && timeRemainingMs <= SESSION_REFRESH_THRESHOLD_MS) {
        const refreshed = generateToken(decoded.userId);
        req.sessionToken = refreshed.token;
        setSessionCookie(res, refreshed.token);
        res.setHeader('x-campusmate-session-refreshed', 'true');
    }

    next();
}

// S2 fix: Do NOT export JWT_SECRET — only export the functions that use it
module.exports = {
    generateToken,
    verifyToken,
    authMiddleware,
    JWT_EXPIRY,
    JWT_EXPIRY_MS
};
