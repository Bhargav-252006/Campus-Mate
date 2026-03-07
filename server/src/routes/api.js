/**
 * 🌐 API ROUTES AGGREGATOR
 *
 * Mounts auth middleware and all sub-route files.
 * Individual routes live in chat.js, profile.js, timetable.js, exams.js, schedule.js
 */
const express = require('express');
const router = express.Router();
const {generateToken, authMiddleware} = require('../utils/auth');
const logger = require('../utils/logger');

// ── Auth session (before auth middleware) ────────────────────────
router.post('/auth/session', (req, res) => {
    try {
        const {userId} = req.body;
        const session = generateToken(userId || undefined);
        logger.info(`New session created for ${session.userId}`);
        res.json({
            token: session.token,
            userId: session.userId,
            message: 'Session created. Send token in Authorization: Bearer <token> header.'
        });
    } catch (error) {
        logger.error('Auth session error', error);
        res.status(500).json({error: 'Failed to create session'});
    }
});

// ── Auth middleware applied to everything below ──────────────────
router.use(authMiddleware);

// ── Sub-route mounting ──────────────────────────────────────────
router.use('/chat', require('./chat'));
router.use('/', require('./profile'));       // /profile, /memory/*, /models/*
router.use('/timetable', require('./timetable'));
router.use('/exams', require('./exams'));
router.use('/schedule', require('./schedule')); router.use('/stats', require('./stats'));
router.use('/webhooks', require('./webhooks'));
module.exports = router;
