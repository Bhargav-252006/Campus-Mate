// Data Service - CRUD Operations for Student Data
// Handles timetable, exams, schedule, profile management

require('dotenv').config();
const express = require('express');
const logger = require('../utils/logger');
const {query, transaction} = require('../shared/db');
const {cache} = require('../shared/redis');

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());

// ============ ENDPOINTS ============

app.get('/health', (req, res) => {
    res.json({status: 'OK', service: 'Data Service'});
});

const userId = req => req.headers['x-user-id'];

app.use((req, res, next) => {
    const uid = userId(req);
    if (!uid) {
        return res.status(400).json({error: 'Missing x-user-id header'});
    }
    return next();
});

// ============ TIMETABLE CRUD ============

app.get('/timetable', async (req, res) => {
    try {
        const uid = userId(req);
        const cached = await cache.get(`timetable:${uid}`);
        if (cached) return res.json(cached);

        const timetable = await query(
            `SELECT * FROM timetable WHERE user_id = $1 ORDER BY day_of_week, start_time`,
            [uid]
        );

        await cache.set(`timetable:${uid}`, timetable, 3600);
        res.json(timetable);
    } catch (error) {
        logger.error('Timetable fetch error:', error);
        res.status(500).json({error: 'Failed to fetch timetable'});
    }
});

app.post('/timetable', async (req, res) => {
    try {
        const uid = userId(req);
        const {subject, code, instructor, classroom, day_of_week, start_time, end_time} = req.body;

        const result = await query(
            `INSERT INTO timetable (user_id, subject, code, instructor, classroom, day_of_week, start_time, end_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
            [uid, subject, code, instructor, classroom, day_of_week, start_time, end_time]
        );

        await cache.delete(`timetable:${uid}`);
        res.status(201).json(result[0]);
    } catch (error) {
        logger.error('Timetable creation error:', error);
        res.status(500).json({error: 'Failed to create timetable entry'});
    }
});

app.put('/timetable/:id', async (req, res) => {
    try {
        const uid = userId(req);
        const {id} = req.params;
        const {subject, code, instructor, classroom, day_of_week, start_time, end_time} = req.body;

        const result = await query(
            `UPDATE timetable SET subject = $1, code = $2, instructor = $3, classroom = $4, day_of_week = $5, start_time = $6, end_time = $7, updated_at = NOW()
       WHERE id = $8 AND user_id = $9
       RETURNING *`,
            [subject, code, instructor, classroom, day_of_week, start_time, end_time, id, uid]
        );

        await cache.delete(`timetable:${uid}`);
        res.json(result[0] || {error: 'Not found'});
    } catch (error) {
        logger.error('Timetable update error:', error);
        res.status(500).json({error: 'Failed to update timetable'});
    }
});

app.delete('/timetable/:id', async (req, res) => {
    try {
        const uid = userId(req);
        const {id} = req.params;

        await query('DELETE FROM timetable WHERE id = $1 AND user_id = $2', [id, uid]);
        await cache.delete(`timetable:${uid}`);
        res.json({message: 'Deleted successfully'});
    } catch (error) {
        logger.error('Timetable delete error:', error);
        res.status(500).json({error: 'Failed to delete timetable entry'});
    }
});

// ============ EXAMS CRUD ============

app.get('/exams', async (req, res) => {
    try {
        const uid = userId(req);
        const exams = await query(
            `SELECT * FROM exams WHERE user_id = $1 ORDER BY date ASC, time ASC`,
            [uid]
        );
        res.json(exams);
    } catch (error) {
        logger.error('Exams fetch error:', error);
        res.status(500).json({error: 'Failed to fetch exams'});
    }
});

app.post('/exams', async (req, res) => {
    try {
        const uid = userId(req);
        const {subject, date, time, duration, room_number, seat_number, exam_type, notes} = req.body;

        const result = await query(
            `INSERT INTO exams (user_id, subject, date, time, duration, room_number, seat_number, exam_type, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
            [uid, subject, date, time, duration, room_number, seat_number, exam_type, notes]
        );

        res.status(201).json(result[0]);
    } catch (error) {
        logger.error('Exam creation error:', error);
        res.status(500).json({error: 'Failed to create exam'});
    }
});

app.put('/exams/:id', async (req, res) => {
    try {
        const uid = userId(req);
        const {id} = req.params;
        const {subject, date, time, duration, room_number, seat_number, exam_type, notes} = req.body;

        const result = await query(
            `UPDATE exams SET subject = $1, date = $2, time = $3, duration = $4, room_number = $5, seat_number = $6, exam_type = $7, notes = $8, updated_at = NOW()
       WHERE id = $9 AND user_id = $10
       RETURNING *`,
            [subject, date, time, duration, room_number, seat_number, exam_type, notes, id, uid]
        );

        res.json(result[0] || {error: 'Not found'});
    } catch (error) {
        logger.error('Exam update error:', error);
        res.status(500).json({error: 'Failed to update exam'});
    }
});

app.delete('/exams/:id', async (req, res) => {
    try {
        const uid = userId(req);
        const {id} = req.params;

        await query('DELETE FROM exams WHERE id = $1 AND user_id = $2', [id, uid]);
        res.json({message: 'Exam deleted successfully'});
    } catch (error) {
        logger.error('Exam delete error:', error);
        res.status(500).json({error: 'Failed to delete exam'});
    }
});

// ============ SCHEDULE CRUD (Complete) ============

app.get('/schedule', async (req, res) => {
    try {
        const uid = userId(req);
        const schedule = await query(
            `SELECT * FROM schedule WHERE user_id = $1 ORDER BY due_date ASC, due_time ASC`,
            [uid]
        );
        res.json(schedule);
    } catch (error) {
        logger.error('Schedule fetch error:', error);
        res.status(500).json({error: 'Failed to fetch schedule'});
    }
});

app.post('/schedule', async (req, res) => {
    try {
        const uid = userId(req);
        const {task_name, subject, due_date, due_time, priority, description} = req.body;

        const result = await query(
            `INSERT INTO schedule (user_id, task_name, subject, due_date, due_time, priority, status, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
            [uid, task_name, subject, due_date, due_time, priority, 'pending', description]
        );

        res.status(201).json(result[0]);
    } catch (error) {
        logger.error('Schedule creation error:', error);
        res.status(500).json({error: 'Failed to create schedule entry'});
    }
});

app.put('/schedule/:id', async (req, res) => {
    try {
        const uid = userId(req);
        const {id} = req.params;
        const {task_name, subject, due_date, due_time, priority, status, description} = req.body;

        const result = await query(
            `UPDATE schedule SET task_name = $1, subject = $2, due_date = $3, due_time = $4, priority = $5, status = $6, description = $7, updated_at = NOW()
       WHERE id = $8 AND user_id = $9
       RETURNING *`,
            [task_name, subject, due_date, due_time, priority, status, description, id, uid]
        );

        res.json(result[0] || {error: 'Not found'});
    } catch (error) {
        logger.error('Schedule update error:', error);
        res.status(500).json({error: 'Failed to update schedule entry'});
    }
});

app.delete('/schedule/:id', async (req, res) => {
    try {
        const uid = userId(req);
        const {id} = req.params;

        await query('DELETE FROM schedule WHERE id = $1 AND user_id = $2', [id, uid]);
        res.json({message: 'Schedule deleted successfully'});
    } catch (error) {
        logger.error('Schedule delete error:', error);
        res.status(500).json({error: 'Failed to delete schedule entry'});
    }
});

// ============ PROFILE CRUD ============

app.get('/profile', async (req, res) => {
    try {
        const uid = userId(req);
        const profile = await query(
            `SELECT * FROM student_profiles WHERE user_id = $1`,
            [uid]
        );
        res.json(profile[0] || {userId: uid});
    } catch (error) {
        logger.error('Profile fetch error:', error);
        res.status(500).json({error: 'Failed to fetch profile'});
    }
});
// Get user profile by explicit userId (for service-to-service calls)
app.get('/profile/:userId', async (req, res) => {
    return res.status(403).json({error: 'Forbidden'});
});

app.post('/profile', async (req, res) => {
    try {
        const uid = userId(req);
        const {name, email, program, semester, gpa} = req.body;

        const result = await query(
            `INSERT INTO student_profiles (user_id, name, email, program, semester, gpa)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id) DO UPDATE SET name = $2, email = $3, program = $4, semester = $5, gpa = $6
       RETURNING *`,
            [uid, name, email, program, semester, gpa]
        );

        res.json(result[0]);
    } catch (error) {
        logger.error('Profile creation error:', error);
        res.status(500).json({error: 'Failed to create profile'});
    }
});

// ============ NOTES CRUD ============

app.get('/notes', async (req, res) => {
    try {
        const uid = userId(req);
        const {subject} = req.query;

        let query_str = 'SELECT * FROM notes WHERE user_id = $1';
        let params = [uid];

        if (subject) {
            query_str += ' AND subject = $2';
            params.push(subject);
        }

        query_str += ' ORDER BY created_at DESC';

        const notes_data = await query(query_str, params);
        res.json(notes_data);
    } catch (error) {
        logger.error('Notes fetch error:', error);
        res.status(500).json({error: 'Failed to fetch notes'});
    }
});

app.post('/notes', async (req, res) => {
    try {
        const uid = userId(req);
        const {subject, title, content, tags} = req.body;

        const result = await query(
            `INSERT INTO notes (user_id, subject, title, content, tags)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
            [uid, subject, title, content, JSON.stringify(tags || [])]
        );

        res.status(201).json(result[0]);
    } catch (error) {
        logger.error('Note creation error:', error);
        res.status(500).json({error: 'Failed to create note'});
    }
});

app.put('/notes/:id', async (req, res) => {
    try {
        const uid = userId(req);
        const {id} = req.params;
        const {subject, title, content, tags} = req.body;

        const result = await query(
            `UPDATE notes SET subject = $1, title = $2, content = $3, tags = $4, updated_at = NOW()
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
            [subject, title, content, JSON.stringify(tags || []), id, uid]
        );

        res.json(result[0] || {error: 'Not found'});
    } catch (error) {
        logger.error('Note update error:', error);
        res.status(500).json({error: 'Failed to update note'});
    }
});

app.delete('/notes/:id', async (req, res) => {
    try {
        const uid = userId(req);
        const {id} = req.params;

        await query('DELETE FROM notes WHERE id = $1 AND user_id = $2', [id, uid]);
        res.json({message: 'Note deleted successfully'});
    } catch (error) {
        logger.error('Note delete error:', error);
        res.status(500).json({error: 'Failed to delete note'});
    }
});

// ============ DEADLINES CRUD ============

app.get('/deadlines', async (req, res) => {
    try {
        const uid = userId(req);
        const deadlines_data = await query(
            `SELECT * FROM deadlines WHERE user_id = $1 ORDER BY due_date ASC`,
            [uid]
        );
        res.json(deadlines_data);
    } catch (error) {
        logger.error('Deadlines fetch error:', error);
        res.status(500).json({error: 'Failed to fetch deadlines'});
    }
});

app.post('/deadlines', async (req, res) => {
    try {
        const uid = userId(req);
        const {title, subject, due_date, due_time, description, priority} = req.body;

        const result = await query(
            `INSERT INTO deadlines (user_id, title, subject, due_date, due_time, description, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
            [uid, title, subject, due_date, due_time, description, priority || 'medium']
        );

        res.status(201).json(result[0]);
    } catch (error) {
        logger.error('Deadline creation error:', error);
        res.status(500).json({error: 'Failed to create deadline'});
    }
});

app.put('/deadlines/:id', async (req, res) => {
    try {
        const uid = userId(req);
        const {id} = req.params;
        const {title, subject, due_date, due_time, description, priority, completed} = req.body;

        const result = await query(
            `UPDATE deadlines SET title = $1, subject = $2, due_date = $3, due_time = $4, description = $5, priority = $6, completed = $7, updated_at = NOW()
       WHERE id = $8 AND user_id = $9
       RETURNING *`,
            [title, subject, due_date, due_time, description, priority, completed, id, uid]
        );

        res.json(result[0] || {error: 'Not found'});
    } catch (error) {
        logger.error('Deadline update error:', error);
        res.status(500).json({error: 'Failed to update deadline'});
    }
});

app.delete('/deadlines/:id', async (req, res) => {
    try {
        const uid = userId(req);
        const {id} = req.params;

        await query('DELETE FROM deadlines WHERE id = $1 AND user_id = $2', [id, uid]);
        res.json({message: 'Deadline deleted successfully'});
    } catch (error) {
        logger.error('Deadline delete error:', error);
        res.status(500).json({error: 'Failed to delete deadline'});
    }
});

// ============ PREFERENCES CRUD ============

app.get('/preferences', async (req, res) => {
    try {
        const uid = userId(req);
        const prefs = await query(
            `SELECT * FROM preferences WHERE user_id = $1`,
            [uid]
        );
        res.json(prefs[0] || {userId: uid, theme: 'light', language: 'en'});
    } catch (error) {
        logger.error('Preferences fetch error:', error);
        res.status(500).json({error: 'Failed to fetch preferences'});
    }
});

app.post('/preferences', async (req, res) => {
    try {
        const uid = userId(req);
        const {theme, language, notifications_enabled, email_reminders, study_mode, settings} = req.body;

        const result = await query(
            `INSERT INTO preferences (user_id, theme, language, notifications_enabled, email_reminders, study_mode, settings)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id) DO UPDATE SET theme = $2, language = $3, notifications_enabled = $4, email_reminders = $5, study_mode = $6, settings = $7
       RETURNING *`,
            [uid, theme, language, notifications_enabled, email_reminders, study_mode, JSON.stringify(settings || {})]
        );

        res.json(result[0]);
    } catch (error) {
        logger.error('Preferences save error:', error);
        res.status(500).json({error: 'Failed to save preferences'});
    }
});

// ============ START SERVER ============
app.listen(PORT, () => {
    logger.info(`Data Service listening on port ${PORT}`);
});

module.exports = app;
