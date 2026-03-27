// Auth Service - JWT Token Management
// Handles session creation and token validation

require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const {cache} = require('../shared/redis');
const {query} = require('../shared/db');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

app.use(express.json());

// ============ ENDPOINTS ============

app.get('/health', (req, res) => {
    res.json({status: 'OK', service: 'Auth Service'});
});

// Create session / Generate token
app.post('/session', async (req, res) => {
    try {
        const {userId} = req.body;
        const id = userId || `user_${Date.now()}`;

        // Create JWT
        const token = jwt.sign(
            {userId: id, iat: Date.now()},
            JWT_SECRET,
            {expiresIn: JWT_EXPIRY}
        );

        // Store in database for revocation tracking
        await query(
            `INSERT INTO auth_tokens (user_id, token, expires_at) 
       VALUES ($1, $2, NOW() + INTERVAL '24 hours')`,
            [id, token]
        );

        // Cache token validation
        await cache.set(`token:${token}`, {userId: id}, 86400);

        logger.info(`Session created for user: ${id}`);
        res.json({
            token,
            userId: id,
            expiresIn: JWT_EXPIRY,
            message: 'Session created successfully'
        });
    } catch (error) {
        logger.error('Session creation error:', error);
        res.status(500).json({error: 'Failed to create session'});
    }
});

// Validate token
app.post('/validate', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({error: 'No token provided'});
        }

        // Check cache first
        const cached = await cache.get(`token:${token}`);
        if (cached) {
            return res.json({valid: true, userId: cached.userId});
        }

        // Verify JWT
        const decoded = jwt.verify(token, JWT_SECRET);

        // Update cache
        await cache.set(`token:${token}`, decoded, 3600);

        res.json({valid: true, userId: decoded.userId});
    } catch (error) {
        logger.warn('Token validation failed:', error.message);
        res.status(401).json({error: 'Invalid token', valid: false});
    }
});

// Revoke token
app.post('/revoke', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(400).json({error: 'No token provided'});
        }

        // Remove from database
        await query('DELETE FROM auth_tokens WHERE token = $1', [token]);

        // Remove from cache
        await cache.delete(`token:${token}`);

        res.json({message: 'Token revoked'});
    } catch (error) {
        logger.error('Token revocation error:', error);
        res.status(500).json({error: 'Failed to revoke token'});
    }
});

// Middleware helper
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({error: 'Unauthorized'});

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (error) {
        res.status(401).json({error: 'Invalid token'});
    }
};

app.listen(PORT, () => {
    logger.info(`Auth Service listening on port ${PORT}`);
});

module.exports = {app, authMiddleware};
