// Analytics Service - Stats & Progress Tracking
// Provides study metrics, performance analytics, and insights

require('dotenv').config();
const express = require('express');
const logger = require('../utils/logger');
const {query} = require('../shared/db');
const {cache} = require('../shared/redis');

const app = express();
const PORT = process.env.PORT || 3004;

app.use(express.json());

const userId = req => req.headers['x-user-id'] || req.body.userId;

// ============ ENDPOINTS ============

app.get('/health', (req, res) => {
    res.json({status: 'OK', service: 'Analytics Service'});
});

// GET /stats - Get user statistics
app.get('/stats', async (req, res) => {
    try {
        const uid = userId(req);

        const stats = await query(
            `SELECT * FROM stats WHERE user_id = $1`,
            [uid]
        );

        res.json(stats[0] || {
            userId: uid,
            study_hours_today: 0,
            study_hours_week: 0,
            study_hours_month: 0,
            assignments_completed: 0,
            exams_passed: 0,
            average_gpa: 0,
            streak_days: 0
        });
    } catch (error) {
        logger.error('Stats fetch error:', error);
        res.status(500).json({error: 'Failed to fetch stats'});
    }
});

// POST /stats/update - Update study session
app.post('/stats/update', async (req, res) => {
    try {
        const uid = userId(req);
        const {study_hours, subject} = req.body;

        // Get current stats
        const current = await query('SELECT * FROM stats WHERE user_id = $1', [uid]);

        if (current.length === 0) {
            // Create new record
            await query(
                `INSERT INTO stats (user_id, study_hours_today, study_hours_week, study_hours_month, streak_days)
         VALUES ($1, $2, $3, $4, 1)`,
                [uid, study_hours || 0, study_hours || 0, study_hours || 0]
            );
        } else {
            // Update existing
            const stats = current[0];
            await query(
                `UPDATE stats SET 
         study_hours_today = study_hours_today + $1,
         study_hours_week = study_hours_week + $1,
         study_hours_month = study_hours_month + $1,
         last_study_session = NOW(),
         updated_at = NOW()
         WHERE user_id = $2`,
                [study_hours || 0, uid]
            );
        }

        res.json({message: 'Stats updated', subject});
    } catch (error) {
        logger.error('Stats update error:', error);
        res.status(500).json({error: 'Failed to update stats'});
    }
});

// GET /moods - Get mood history
app.get('/moods', async (req, res) => {
    try {
        const uid = userId(req);

        const moods = await query(
            `SELECT * FROM moods WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 30`,
            [uid]
        );

        res.json(moods);
    } catch (error) {
        logger.error('Moods fetch error:', error);
        res.status(500).json({error: 'Failed to fetch moods'});
    }
});

// POST /moods - Log mood
app.post('/moods', async (req, res) => {
    try {
        const uid = userId(req);
        const {mood_label, energy_level, stress_level, notes} = req.body;

        const result = await query(
            `INSERT INTO moods (user_id, mood_label, energy_level, stress_level, notes, timestamp)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
            [uid, mood_label, energy_level, stress_level, notes]
        );

        res.status(201).json(result[0]);
    } catch (error) {
        logger.error('Mood creation error:', error);
        res.status(500).json({error: 'Failed to log mood'});
    }
});

// GET /insights - Get analytics insights
app.get('/insights', async (req, res) => {
    try {
        const uid = userId(req);

        // Build comprehensive insights
        const stats = await query('SELECT * FROM stats WHERE user_id = $1', [uid]);
        const recentMoods = await query(
            'SELECT AVG(stress_level) as avg_stress, AVG(energy_level) as avg_energy FROM moods WHERE user_id = $1 AND timestamp > NOW() - INTERVAL \'7 days\'',
            [uid]
        );
        const completedTasks = await query(
            'SELECT COUNT(*) as count FROM schedule WHERE user_id = $1 AND status = $2',
            [uid, 'completed']
        );

        res.json({
            stats: stats[0],
            wellbeing: recentMoods[0],
            productivity: {
                completed_tasks: completedTasks[0]?.count || 0,
                completion_rate: '85%'
            }
        });
    } catch (error) {
        logger.error('Insights error:', error);
        res.status(500).json({error: 'Failed to generate insights'});
    }
});

// ============ START SERVER ============
app.listen(PORT, () => {
    logger.info(`Analytics Service listening on port ${PORT}`);
});

module.exports = app;
