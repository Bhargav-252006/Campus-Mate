/**
 * 👤 PROFILE & MEMORY ROUTES - User profile, memory export/clear, models
 */
const express = require('express');
const router = express.Router();
const memoryManager = require('../utils/memoryManagerV3');
const {getFreeModels, config: llmConfig} = require('../utils/llmService');
const logger = require('../utils/logger');

// Get user profile
router.get('/profile', (req, res) => {
    try {
        const userId = req.userId;
        const profile = memoryManager.getProfile(userId);
        const isNewUser = !profile.name && profile.subjects?.length === 0;
        res.json({
            ...profile, isNewUser,
            message: isNewUser ? 'No profile yet. Start chatting!' : null
        });
    } catch (error) {
        logger.error('Get profile error', error);
        res.status(500).json({error: "Internal Server Error"});
    }
});

// Update user profile
router.put('/profile', (req, res) => {
    try {
        const userId = req.userId;
        const updates = req.body;
        memoryManager.updateProfile(userId, updates);
        logger.info(`Profile updated for ${userId}`);
        res.json({success: true, message: 'Profile updated!'});
    } catch (error) {
        logger.error('Error updating profile', error);
        res.status(500).json({error: "Internal Server Error"});
    }
});

// Export all user data
router.get('/memory/export', (req, res) => {
    try {
        const userId = req.userId;
        const data = memoryManager.exportUserData(userId);
        res.json(data);
    } catch (error) {
        logger.error('Error exporting data', error);
        res.status(500).json({error: "Internal Server Error"});
    }
});

// Clear conversation memory (keep profile)
router.delete('/memory/conversations', (req, res) => {
    try {
        const userId = req.userId;
        memoryManager.clearConversation(userId);
        logger.info(`Conversations cleared for ${userId}`);
        res.json({success: true, message: 'Conversations cleared, profile kept!'});
    } catch (error) {
        logger.error('Error clearing memory', error);
        res.status(500).json({error: "Internal Server Error"});
    }
});

// Clear ALL data including profile
router.delete('/memory/all', (req, res) => {
    try {
        const userId = req.userId;
        memoryManager.clearAll(userId);
        logger.info(`All data cleared for ${userId}`);
        res.json({success: true, message: 'All data cleared!'});
    } catch (error) {
        logger.error('Error clearing all data', error);
        res.status(500).json({error: "Internal Server Error"});
    }
});

// Get available free models
router.get('/models/free', (req, res) => {
    try {
        const models = getFreeModels();
        const providerNames = {
            gemini: 'Gemini', openrouter: 'OpenRouter', ollama: 'Ollama',
            bytez: 'Bytez', huggingface: 'HuggingFace'
        };
        const signupUrls = {
            gemini: 'https://aistudio.google.com/app/apikey',
            openrouter: 'https://openrouter.ai/keys',
            bytez: 'https://platform.bytez.com/',
            huggingface: 'https://huggingface.co/settings/tokens'
        };
        res.json({
            provider: providerNames[llmConfig.provider] || llmConfig.provider,
            freeModels: models,
            signupUrl: signupUrls[llmConfig.provider] || null
        });
    } catch (error) {
        res.status(500).json({error: "Internal Server Error"});
    }
});

module.exports = router;
