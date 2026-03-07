/**
 * 📋 SCHEDULE (TASKS) ROUTES - CRUD for schedule/task entries
 */
const express = require('express');
const router = express.Router();
const {scheduleStore} = require('../utils/dataStore');
const logger = require('../utils/logger');

router.get('/', (req, res) => {
    try {
        const userId = req.query.userId || 'user-123';
        const schedule = scheduleStore.getAll(userId);
        res.json(schedule);
    } catch (error) {
        logger.error('Error getting schedule', error);
        res.status(500).json({error: "Internal Server Error"});
    }
});

router.post('/', (req, res) => {
    try {
        const {userId, ...task} = req.body;
        if (!task.task) {
            return res.status(400).json({error: 'Task description is required'});
        }
        const newTask = scheduleStore.add(userId || 'user-123', task);
        res.status(201).json(newTask);
    } catch (error) {
        logger.error('Error adding task', error);
        res.status(500).json({error: "Internal Server Error"});
    }
});

router.put('/:id', (req, res) => {
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
        logger.error('Error updating task', error);
        res.status(500).json({error: "Internal Server Error"});
    }
});

router.delete('/:id', (req, res) => {
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
        logger.error('Error deleting task', error);
        res.status(500).json({error: "Internal Server Error"});
    }
});

module.exports = router;
