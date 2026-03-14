/**
 * 💬 CHAT ROUTES - Main chat endpoint + history
 */
const express = require('express');
const router = express.Router();
const conversationService = require('../services/conversationService');
const logger = require('../utils/logger');

// Main chat endpoint
router.post('/', async (req, res) => {
    try {
        const {message, clientRequestId} = req.body;
        const userId = req.userId; // Always from auth middleware

        if (!message) {
            logger.warn('Chat request missing message');
            return res.status(400).json({error: "Message is required"});
        }

        logger.user(userId, 'Chat request', message.substring(0, 50));

        const envelope = await conversationService.handleChat({userId, message, clientRequestId});

        res.json(envelope);
    } catch (error) {
        logger.error('Chat endpoint error', error);
        res.status(500).json({error: "Internal Server Error"});
    }
});

// Get chat history
router.get('/history', (req, res) => {
    try {
        const userId = req.userId; // Always from auth middleware
        const history = conversationService.getHistory(userId);
        logger.debug(`Retrieved ${history.length} messages for ${userId}`);
        res.json(history);
    } catch (error) {
        logger.error('Get chat history error', error);
        res.status(500).json({error: "Internal Server Error"});
    }
});

// Clear chat history
router.delete('/history', (req, res) => {
    try {
        const userId = req.userId; // Always from auth middleware
        conversationService.clearHistory(userId);
        logger.info(`Chat history cleared for ${userId}`);
        res.json({success: true});
    } catch (error) {
        logger.error('Clear chat history error', error);
        res.status(500).json({error: "Internal Server Error"});
    }
});

module.exports = router;
