require('dotenv').config();
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/api');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:3000',
        'https://1960de80eeab.ngrok-free.app'
    ],
    credentials: true
}));
app.use(express.json({limit: '10mb'}));

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();

    // Log response when finished
    res.on('finish', () => {
        const duration = Date.now() - start;
        const status = res.statusCode;

        if (status >= 500) {
            logger.error(`${req.method} ${req.path} - ${status} (${duration}ms)`);
        } else if (status >= 400) {
            logger.warn(`${req.method} ${req.path} - ${status} (${duration}ms)`);
        } else {
            logger.api(req.method, req.path, status);
        }
    });

    next();
});

// Routes
app.use('/api', apiRoutes);

// Health Check
app.get('/', (req, res) => {
    res.json({
        status: 'running',
        message: 'Student Mate AI Backend is Running 🚀',
        version: '1.0.0',
        endpoints: {
            chat: '/api/chat',
            timetable: '/api/timetable',
            exams: '/api/exams',
            schedule: '/api/schedule',
            profile: '/api/profile',
            memory: '/api/memory/export'
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error(`Unhandled error on ${req.method} ${req.path}`, err);
    res.status(500).json({
        error: 'Something went wrong',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    logger.warn(`404 - Route not found: ${req.method} ${req.path}`);
    res.status(404).json({error: 'Endpoint not found'});
});

// Start server
app.listen(PORT, () => {
    logger.separator('STUDENT MATE AI BACKEND');
    logger.success(`Server started on http://localhost:${PORT}`);
    logger.info(`Mode: ${process.env.NODE_ENV || 'development'}`);
    logger.info('Logs are saved to: server/logs/');
    logger.separator();
});
