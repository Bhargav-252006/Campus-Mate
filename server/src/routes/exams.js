/**
 * 📝 EXAMS ROUTES - CRUD for exam entries
 */
const express = require('express');
const router = express.Router();
const {examsStore} = require('../utils/dataStore');
const logger = require('../utils/logger');

router.get('/', (req, res) => {
    try {
        const userId = req.userId;
        const exams = examsStore.getAll(userId);
        res.json(exams);
    } catch (error) {
        logger.error('Error getting exams', error);
        res.status(500).json({error: "Internal Server Error"});
    }
});

router.post('/', (req, res) => {
    try {
        const userId = req.userId;
        const exam = req.body;
        if (!exam.subject || !exam.date) {
            return res.status(400).json({error: 'Subject and date are required'});
        }
        if (exam.date && isNaN(new Date(exam.date).getTime())) {
            return res.status(400).json({error: 'Invalid exam date'});
        }
        const newExam = examsStore.add(userId, exam);
        res.status(201).json(newExam);
    } catch (error) {
        logger.error('Error adding exam', error);
        res.status(500).json({error: "Internal Server Error"});
    }
});

router.put('/:id', (req, res) => {
    try {
        const {id} = req.params;
        const userId = req.userId;
        const updates = req.body;
        const updated = examsStore.update(userId, id, updates);
        if (updated) {
            res.json(updated);
        } else {
            res.status(404).json({error: "Exam not found"});
        }
    } catch (error) {
        logger.error('Error updating exam', error);
        res.status(500).json({error: "Internal Server Error"});
    }
});

router.delete('/:id', (req, res) => {
    try {
        const {id} = req.params;
        const userId = req.userId;
        const deleted = examsStore.delete(userId, id);
        if (deleted) {
            res.json({success: true});
        } else {
            res.status(404).json({error: "Exam not found"});
        }
    } catch (error) {
        logger.error('Error deleting exam', error);
        res.status(500).json({error: "Internal Server Error"});
    }
});

module.exports = router;
