require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const apiRoutes = require('./routes/api');
const logger = require('./utils/logger');
const {sanitizeMiddleware} = require('./utils/inputSanitizer');
const memoryManager = require('./utils/memoryManagerV3');
const progressLedger = require('./utils/progressLedger');

const app = express();
const PORT = process.env.PORT || 5000;

// ============ RATE LIMITING ============
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 200,                   // 200 requests per 15 min
    standardHeaders: true,
    legacyHeaders: false,
    message: {error: 'Too many requests, please try again later.'}
});

const chatLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,  // 1 minute
    max: 15,                    // 15 chat messages per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: {error: 'Too many chat messages. Please slow down.'}
});

// ============ CORS (Dynamic) ============
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

// Default origins for development
const defaultOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000'
];

const origins = [...new Set([...defaultOrigins, ...allowedOrigins])];

app.use(cors({
    origin: origins,
    credentials: true
}));
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: [
                "'self'",
                process.env.VITE_API_URL || 'http://localhost:3000'
            ],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        }
    },
    crossOriginEmbedderPolicy: false // allow cross-origin resources (e.g. fonts)
}));
app.use(express.json({limit: '10mb'}));

// ============ SECURITY & SANITIZATION ============
app.use(generalLimiter);       // Rate limit all routes
app.use(sanitizeMiddleware);   // Sanitize all inputs

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

// Routes - chat rate limiter only on POST (sending messages),
// not on GET /history which is polled frequently by the client.
app.post('/api/chat', chatLimiter);
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
            memory: '/api/memory/export',
            stats: '/api/stats/traces'
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
const server = app.listen(PORT, () => {
    logger.separator('STUDENT MATE AI BACKEND');
    logger.success(`Server started on http://localhost:${PORT}`);
    logger.info(`Mode: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`CORS origins: ${origins.join(', ')}`);
    logger.info('Logs are saved to: server/logs/');

    logger.separator();
});

// ============ GRACEFUL SHUTDOWN ============
const gracefulShutdown = (signal) => {
    logger.info(`\n${signal} received. Shutting down gracefully...`);

    // Flush all pending memory writes
    try {
        memoryManager.forceSave();
        logger.success('Memory flushed to disk successfully.');
    } catch (err) {
        logger.error('Error flushing memory on shutdown', err);
    }

    // P8 fix: Clean up intervals
    try {
        progressLedger.stopAutoCleanup();
    } catch (_) { /* ignore */}

    // Close HTTP server
    server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
    });

    // Force exit after 10s if server won't close
    setTimeout(() => {
        logger.warn('Forced shutdown after timeout.');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
