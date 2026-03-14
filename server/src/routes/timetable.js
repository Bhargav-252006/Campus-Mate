/**
 * 📅 TIMETABLE ROUTES - CRUD for timetable entries
 */
const express = require('express');
const router = express.Router();
const {timetableStore} = require('../utils/dataStore');
const logger = require('../utils/logger');

router.get('/', (req, res) => {
    try {
        const userId = req.userId;
        const timetable = timetableStore.getAll(userId);
        res.json(timetable);
    } catch (error) {
        logger.error('Error getting timetable', error);
        res.status(500).json({error: "Internal Server Error"});
    }
});

router.post('/', (req, res) => {
    try {
        const userId = req.userId;
        const entry = req.body;
        if (!entry.subject || !entry.day) {
            return res.status(400).json({error: 'Subject and day are required'});
        }
        const newEntry = timetableStore.add(userId, entry);
        res.status(201).json(newEntry);
    } catch (error) {
        logger.error('Error adding timetable entry', error);
        res.status(500).json({error: "Internal Server Error"});
    }
});

router.put('/:id', (req, res) => {
    try {
        const {id} = req.params;
        const userId = req.userId;
        const updates = req.body;
        const updated = timetableStore.update(userId, id, updates);
        if (updated) {
            res.json(updated);
        } else {
            res.status(404).json({error: "Entry not found"});
        }
    } catch (error) {
        logger.error('Error updating timetable entry', error);
        res.status(500).json({error: "Internal Server Error"});
    }
});

router.delete('/:id', (req, res) => {
    try {
        const {id} = req.params;
        const userId = req.userId;
        const deleted = timetableStore.delete(userId, id);
        if (deleted) {
            res.json({success: true});
        } else {
            res.status(404).json({error: "Entry not found"});
        }
    } catch (error) {
        logger.error('Error deleting timetable entry', error);
        res.status(500).json({error: "Internal Server Error"});
    }
});

module.exports = router;
