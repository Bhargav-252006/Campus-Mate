/**
 * 📊 STATS ROUTES - System stats, progress, traces
 */
const express = require('express');
const router = express.Router();
const {statsRepo} = require('../repositories');
const logger = require('../utils/logger');

// GET /api/stats/traces - LLM run traces
router.get('/traces', async (req, res) => {
    try {
        const userId = req.query.userId || null;
        const limit = parseInt(req.query.limit || '50', 10);
        const traces = await statsRepo.getTraces({userId, limit});
        res.json({count: traces.length, traces});
    } catch (error) {
        logger.error('Stats traces error', error);
        res.status(500).json({error: 'Internal Server Error'});
    }
});

// GET /api/stats/progress/:userId - User progress snapshot
router.get('/progress/:userId', async (req, res) => {
    try {
        const snapshot = await statsRepo.getSnapshot(req.params.userId);
        res.json(snapshot || {message: 'No stats yet'});
    } catch (error) {
        logger.error('Stats progress error', error);
        res.status(500).json({error: 'Internal Server Error'});
    }
});

// POST /api/stats/reset - Reset stats for a user
router.post('/reset', async (req, res) => {
    try {
        const {userId} = req.body;
        if (!userId) return res.status(400).json({error: 'userId required'});
        await statsRepo.saveSnapshot(userId, {});
        res.json({success: true, message: 'Stats reset'});
    } catch (error) {
        logger.error('Stats reset error', error);
        res.status(500).json({error: 'Internal Server Error'});
    }
});

module.exports = router;
