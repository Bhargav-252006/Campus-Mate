const express = require('express');
const router = express.Router();
const centralizedAgent = require('../agents/agentRouter');
const {timetableStore, examsStore, scheduleStore, chatHistoryStore} = require('../utils/dataStore');
const memoryManager = require('../utils/memoryManager');
const {getFreeModels} = require('../utils/llmService');
const logger = require('../utils/logger');

// ============ CHAT ENDPOINTS ============

// Main chat endpoint
router.post('/chat', async (req, res) => {
    try {
        const {message, userId} = req.body;

        if (!message) {
            logger.warn('Chat request missing message');
            return res.status(400).json({error: "Message is required"});
        }

        logger.user(userId || 'anonymous', 'Chat request', message.substring(0, 50));

        // Pass the message to the CENTRALIZED AGENT for classification & routing
        const response = await centralizedAgent.processRequest(message, userId);

        // Save to chat history
        chatHistoryStore.add(userId, {
            sender: 'user',
            text: message
        });
        chatHistoryStore.add(userId, {
            sender: 'bot',
            agent: response.agent,
            text: response.text
        });

        res.json({
            response: response.text,
            agentUsed: response.agent,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Chat endpoint error', error);
        res.status(500).json({error: "Internal Server Error"});
    }
});

// Get chat history
router.get('/chat/history', (req, res) => {
    try {
        const userId = req.query.userId || 'user-123';
        const history = chatHistoryStore.getAll(userId);
        logger.debug(`Retrieved ${history.length} messages for ${userId}`);
        res.json(history);
    } catch (error) {
        logger.error('Get chat history error', error);
        res.status(500).json({error: "Internal Server Error"});
    }
});

// Clear chat history
router.delete('/chat/history', (req, res) => {
    try {
        const userId = req.query.userId || 'user-123';
        chatHistoryStore.clear(userId);
        logger.info(`Chat history cleared for ${userId}`);
        res.json({success: true});
    } catch (error) {
        logger.error('Clear chat history error', error);
        res.status(500).json({error: "Internal Server Error"});
    }
});

// ============ MEMORY & PROFILE ENDPOINTS ============

// Get user profile (remembered info)
router.get('/profile', (req, res) => {
    try {
        const userId = req.query.userId || 'user-123';
        const profile = memoryManager.getProfile(userId);
        res.json(profile || {message: 'No profile yet. Start chatting!'});
    } catch (error) {
        logger.error('Get profile error', error);
        res.status(500).json({error: "Internal Server Error"});
    }
});

// Update user profile manually
router.put('/profile', (req, res) => {
    try {
        const {userId, ...updates} = req.body;
        memoryManager.updateUserProfile(userId || 'user-123', updates);
        res.json({success: true, message: 'Profile updated!'});
    } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({error: "Internal Server Error"});
    }
});

// Export all user data
router.get('/memory/export', (req, res) => {
    try {
        const userId = req.query.userId || 'user-123';
        const data = memoryManager.exportUserData(userId);
        res.json(data);
    } catch (error) {
        console.error("Error exporting data:", error);
        res.status(500).json({error: "Internal Server Error"});
    }
});

// Clear conversation memory (keep profile)
router.delete('/memory/conversations', (req, res) => {
    try {
        const userId = req.query.userId || 'user-123';
        memoryManager.clearMemory(userId);
        res.json({success: true, message: 'Conversations cleared, profile kept!'});
    } catch (error) {
        console.error("Error clearing memory:", error);
        res.status(500).json({error: "Internal Server Error"});
    }
});

// Clear ALL data including profile
router.delete('/memory/all', (req, res) => {
    try {
        const userId = req.query.userId || 'user-123';
        memoryManager.clearAllData(userId);
        res.json({success: true, message: 'All data cleared!'});
    } catch (error) {
        console.error("Error clearing all data:", error);
        res.status(500).json({error: "Internal Server Error"});
    }
});

// Get available free models
router.get('/models/free', (req, res) => {
    try {
        const models = getFreeModels();
        res.json({
            provider: 'OpenRouter',
            freeModels: models,
            signupUrl: 'https://openrouter.ai/keys'
        });
    } catch (error) {
        res.status(500).json({error: "Internal Server Error"});
    }
});

// ============ TIMETABLE ENDPOINTS ============

router.get('/timetable', (req, res) => {
    try {
        const userId = req.query.userId || 'user-123';
        const timetable = timetableStore.getAll(userId);
        res.json(timetable);
    } catch (error) {
        console.error("Error getting timetable:", error);
        res.status(500).json({error: "Internal Server Error"});
    }
});

router.post('/timetable', (req, res) => {
    try {
        const {userId, ...entry} = req.body;
        const newEntry = timetableStore.add(userId || 'user-123', entry);
        res.status(201).json(newEntry);
    } catch (error) {
        console.error("Error adding timetable entry:", error);
        res.status(500).json({error: "Internal Server Error"});
    }
});

router.put('/timetable/:id', (req, res) => {
    try {
        const {id} = req.params;
        const {userId, ...updates} = req.body;
        const updated = timetableStore.update(userId || 'user-123', id, updates);
        if (updated) {
            res.json(updated);
        } else {
            res.status(404).json({error: "Entry not found"});
        }
    } catch (error) {
        console.error("Error updating timetable entry:", error);
        res.status(500).json({error: "Internal Server Error"});
    }
});

router.delete('/timetable/:id', (req, res) => {
    try {
        const {id} = req.params;
        const userId = req.query.userId || 'user-123';
        const deleted = timetableStore.delete(userId, id);
        if (deleted) {
            res.json({success: true});
        } else {
            res.status(404).json({error: "Entry not found"});
        }
    } catch (error) {
        console.error("Error deleting timetable entry:", error);
        res.status(500).json({error: "Internal Server Error"});
    }
});

// ============ EXAMS ENDPOINTS ============

router.get('/exams', (req, res) => {
    try {
        const userId = req.query.userId || 'user-123';
        const exams = examsStore.getAll(userId);
        res.json(exams);
    } catch (error) {
        console.error("Error getting exams:", error);
        res.status(500).json({error: "Internal Server Error"});
    }
});

router.post('/exams', (req, res) => {
    try {
        const {userId, ...exam} = req.body;
        const newExam = examsStore.add(userId || 'user-123', exam);
        res.status(201).json(newExam);
    } catch (error) {
        console.error("Error adding exam:", error);
        res.status(500).json({error: "Internal Server Error"});
    }
});

router.put('/exams/:id', (req, res) => {
    try {
        const {id} = req.params;
        const {userId, ...updates} = req.body;
        const updated = examsStore.update(userId || 'user-123', id, updates);
        if (updated) {
            res.json(updated);
        } else {
            res.status(404).json({error: "Exam not found"});
        }
    } catch (error) {
        console.error("Error updating exam:", error);
        res.status(500).json({error: "Internal Server Error"});
    }
});

router.delete('/exams/:id', (req, res) => {
    try {
        const {id} = req.params;
        const userId = req.query.userId || 'user-123';
        const deleted = examsStore.delete(userId, id);
        if (deleted) {
            res.json({success: true});
        } else {
            res.status(404).json({error: "Exam not found"});
        }
    } catch (error) {
        console.error("Error deleting exam:", error);
        res.status(500).json({error: "Internal Server Error"});
    }
});

// ============ SCHEDULE (TASKS) ENDPOINTS ============

router.get('/schedule', (req, res) => {
    try {
        const userId = req.query.userId || 'user-123';
        const schedule = scheduleStore.getAll(userId);
        res.json(schedule);
    } catch (error) {
        console.error("Error getting schedule:", error);
        res.status(500).json({error: "Internal Server Error"});
    }
});

router.post('/schedule', (req, res) => {
    try {
        const {userId, ...task} = req.body;
        const newTask = scheduleStore.add(userId || 'user-123', task);
        res.status(201).json(newTask);
    } catch (error) {
        console.error("Error adding task:", error);
        res.status(500).json({error: "Internal Server Error"});
    }
});

router.put('/schedule/:id', (req, res) => {
    try {
        const {id} = req.params;
        const {userId, ...updates} = req.body;
        const updated = scheduleStore.update(userId || 'user-123', id, updates);
        if (updated) {
            res.json(updated);
        } else {
            res.status(404).json({error: "Task not found"});
        }
    } catch (error) {
        console.error("Error updating task:", error);
        res.status(500).json({error: "Internal Server Error"});
    }
});

router.delete('/schedule/:id', (req, res) => {
    try {
        const {id} = req.params;
        const userId = req.query.userId || 'user-123';
        const deleted = scheduleStore.delete(userId, id);
        if (deleted) {
            res.json({success: true});
        } else {
            res.status(404).json({error: "Task not found"});
        }
    } catch (error) {
        console.error("Error deleting task:", error);
        res.status(500).json({error: "Internal Server Error"});
    }
});

module.exports = router;
