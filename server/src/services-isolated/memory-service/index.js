// Memory Service - 5-Tier Memory Management
// Manages working, short-term, episodic, semantic, and profile memory tiers

require('dotenv').config();
const express = require('express');
const logger = require('../utils/logger');
const {query} = require('../shared/db');
const {cache} = require('../shared/redis');

const app = express();
const PORT = process.env.PORT || 3005;

app.use(express.json());

const userId = req => req.headers['x-user-id'] || req.body.userId;

// ============ ENDPOINTS ============

app.get('/health', (req, res) => {
    res.json({status: 'OK', service: 'Memory Service'});
});

// GET /memory/:tier - Get memory by tier
app.get('/:tier', async (req, res) => {
    try {
        const uid = userId(req);
        const {tier} = req.params;

        let result = [];

        switch (tier) {
            case 'working':
                result = await query('SELECT content FROM memory_working WHERE user_id = $1', [uid]);
                break;
            case 'short-term':
                result = await query('SELECT content, summary FROM memory_short_term WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 20', [uid]);
                break;
            case 'episodic':
                result = await query('SELECT event_description, context, importance_score FROM memory_episodic WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 50', [uid]);
                break;
            case 'semantic':
                result = await query('SELECT knowledge_key, knowledge_value FROM memory_semantic WHERE user_id = $1', [uid]);
                break;
            case 'profile':
                result = await query('SELECT learning_style, study_preferences, goals, strengths, weaknesses FROM memory_profile WHERE user_id = $1', [uid]);
                break;
            default:
                return res.status(400).json({error: 'Invalid memory tier'});
        }

        res.json({tier, data: result});
    } catch (error) {
        logger.error(`Memory fetch error (${req.params.tier}):`, error);
        res.status(500).json({error: 'Failed to fetch memory'});
    }
});

// POST /memory/:tier - Store in memory tier
app.post('/:tier', async (req, res) => {
    try {
        const uid = userId(req);
        const {tier} = req.params;
        const {content, summary, event_description, importance_score, knowledge_key, knowledge_value, preferences, goals} = req.body;

        let result;

        switch (tier) {
            case 'working':
                result = await query(
                    `INSERT INTO memory_working (user_id, content, token_count) VALUES ($1, $2, 0)
           ON CONFLICT (user_id) DO UPDATE SET content = $2, last_accessed = NOW()
           RETURNING *`,
                    [uid, JSON.stringify(content || {})]
                );
                break;
            case 'short-term':
                result = await query(
                    `INSERT INTO memory_short_term (user_id, content, summary) VALUES ($1, $2, $3)
           RETURNING *`,
                    [uid, JSON.stringify(content || {}), summary]
                );
                break;
            case 'episodic':
                result = await query(
                    `INSERT INTO memory_episodic (user_id, event_description, context, importance_score) VALUES ($1, $2, $3, $4)
           RETURNING *`,
                    [uid, event_description, JSON.stringify(content || {}), importance_score || 5]
                );
                break;
            case 'semantic':
                result = await query(
                    `INSERT INTO memory_semantic (user_id, knowledge_key, knowledge_value) VALUES ($1, $2, $3)
           ON CONFLICT (user_id, knowledge_key) DO UPDATE SET knowledge_value = $3, frequency = frequency + 1
           RETURNING *`,
                    [uid, knowledge_key, JSON.stringify(knowledge_value || {})]
                );
                break;
            case 'profile':
                result = await query(
                    `INSERT INTO memory_profile (user_id, learning_style, study_preferences, goals, strengths, weaknesses) 
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (user_id) DO UPDATE SET learning_style = $2, study_preferences = $3, goals = $4, strengths = $5, weaknesses = $6
           RETURNING *`,
                    [uid, req.body.learning_style, JSON.stringify(req.body.study_preferences || {}), JSON.stringify(goals || {}),
                        JSON.stringify(req.body.strengths || {}), JSON.stringify(req.body.weaknesses || {})]
                );
                break;
            default:
                return res.status(400).json({error: 'Invalid memory tier'});
        }

        res.status(201).json({tier, data: result[0]});
    } catch (error) {
        logger.error(`Memory store error (${req.params.tier}):`, error);
        res.status(500).json({error: 'Failed to store memory'});
    }
});

// DELETE /memory/:tier - Clear memory tier
app.delete('/:tier', async (req, res) => {
    try {
        const uid = userId(req);
        const {tier} = req.params;

        let tableName;
        switch (tier) {
            case 'working': tableName = 'memory_working'; break;
            case 'short-term': tableName = 'memory_short_term'; break;
            case 'episodic': tableName = 'memory_episodic'; break;
            case 'semantic': tableName = 'memory_semantic'; break;
            case 'profile': tableName = 'memory_profile'; break;
            default: return res.status(400).json({error: 'Invalid memory tier'});
        }

        await query(`DELETE FROM ${tableName} WHERE user_id = $1`, [uid]);
        res.json({message: `${tier} memory cleared`});
    } catch (error) {
        logger.error(`Memory delete error (${req.params.tier}):`, error);
        res.status(500).json({error: 'Failed to clear memory'});
    }
});

// GET /summary - Get complete memory summary
app.get('/summary/all', async (req, res) => {
    try {
        const uid = userId(req);

        const [working, shortTerm, episodic, semantic, profile] = await Promise.all([
            query('SELECT content FROM memory_working WHERE user_id = $1', [uid]),
            query('SELECT COUNT(*) as count FROM memory_short_term WHERE user_id = $1', [uid]),
            query('SELECT COUNT(*) as count FROM memory_episodic WHERE user_id = $1', [uid]),
            query('SELECT COUNT(*) as count FROM memory_semantic WHERE user_id = $1', [uid]),
            query('SELECT * FROM memory_profile WHERE user_id = $1', [uid])
        ]);

        res.json({
            working: working.length > 0 ? working[0].content : null,
            short_term_items: shortTerm[0]?.count || 0,
            episodic_items: episodic[0]?.count || 0,
            semantic_items: semantic[0]?.count || 0,
            profile: profile[0] || null
        });
    } catch (error) {
        logger.error('Memory summary error:', error);
        res.status(500).json({error: 'Failed to get memory summary'});
    }
});

// ============ START SERVER ============
app.listen(PORT, () => {
    logger.info(`Memory Service listening on port ${PORT}`);
});

module.exports = app;
