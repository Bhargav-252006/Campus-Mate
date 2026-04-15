// API Gateway - Request Router & Rate Limiter
// Routes all external requests to appropriate microservices

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const httpProxy = require('express-http-proxy');
const logger = require('../utils/logger');
const {cache} = require('../shared/redis');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust reverse proxy headers from the nginx client container.
app.set('trust proxy', 1);

// ============ REQUEST TIMEOUT MIDDLEWARE ============
// Set timeout for all requests (30 seconds)
app.use((req, res, next) => {
    req.setTimeout(30000);  // 30 second timeout
    res.setTimeout(30000);
    next();
});

// ============ REQUEST ID TRACKING ============
app.use((req, res, next) => {
    req.id = req.get('x-request-id') || crypto.randomBytes(8).toString('hex');
    res.setHeader('x-request-id', req.id);
    next();
});

// ============ HTTPS ENFORCEMENT (if behind reverse proxy) ============
// Disabled for EC2 IP-based deployment (no SSL config yet)
/*
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        // If behind proxy and not HTTPS, redirect only for non-local hosts.
        const host = (req.get('host') || '').toLowerCase();
        const isLocalHost = host.startsWith('localhost') || host.startsWith('127.0.0.1');
        if (req.get('x-forwarded-proto') === 'http' && !isLocalHost) {
            return res.status(301).redirect(`https://${req.get('Host')}${req.originalUrl}`);
        }
        next();
    });
}
*/

// ============ MIDDLEWARE ============
app.use(helmet());
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb', extended: true}));

// CORS
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);
const defaultOrigins = ['http://localhost', 'http://localhost:5173', 'http://localhost:3000'];
app.use(cors({
    origin: allowedOrigins.length ? allowedOrigins : defaultOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-request-id']
}));

// Rate limiting
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: {error: 'Too many requests'}
});

const chatLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 15,
    message: {error: 'Too many chat requests'}
});

app.use(generalLimiter);

// ============ SERVICE URLS ============
const AUTH_SERVICE = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const CHAT_SERVICE = process.env.CHAT_SERVICE_URL || 'http://localhost:3002';
const DATA_SERVICE = process.env.DATA_SERVICE_URL || 'http://localhost:3003';
const ANALYTICS_SERVICE = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3004';
const MEMORY_SERVICE = process.env.MEMORY_SERVICE_URL || 'http://localhost:3005';
const WEBHOOKS_SERVICE = process.env.WEBHOOKS_SERVICE_URL || 'http://localhost:3006';

// ============ ROUTES ============

// Health check
app.get('/health', (req, res) => {
    res.json({status: 'OK', service: 'API Gateway', timestamp: new Date()});
});

// Auth routes (no auth middleware needed for session creation)
app.use('/auth', httpProxy(AUTH_SERVICE, {
    proxyReqPathResolver: (req) => req.originalUrl.replace(/^\/auth/, '') || '/',
    timeout: 30000,  // 30s timeout
    proxyErrorHandler: (err, res, next) => {
        logger.error(`Auth service error: ${err.message}`);
        res.status(503).json({error: 'Auth service unavailable'});
    }
}));

// Chat routes (with rate limiting)
app.use('/chat', chatLimiter, httpProxy(CHAT_SERVICE, {
    proxyReqPathResolver: (req) => req.originalUrl.replace(/^\/chat/, '') || '/',
    timeout: 60000,  // 60s timeout for LLM responses
    proxyErrorHandler: (err, res, next) => {
        logger.error(`Chat service error: ${err.message}`);
        res.status(503).json({error: 'Chat service unavailable'});
    }
}));

// Data routes (CRUD operations)
app.use('/timetable', httpProxy(DATA_SERVICE, {
    proxyReqPathResolver: (req) => `/timetable${req.url}`,
    timeout: 30000,
    proxyErrorHandler: (err, res, next) => {
        logger.error(`Data service error: ${err.message}`);
        res.status(503).json({error: 'Data service unavailable'});
    }
}));

app.use('/exams', httpProxy(DATA_SERVICE, {
    proxyReqPathResolver: (req) => `/exams${req.url}`,
    timeout: 30000,
    proxyErrorHandler: (err, res, next) => {
        logger.error(`Data service error: ${err.message}`);
        res.status(503).json({error: 'Data service unavailable'});
    }
}));

app.use('/schedule', httpProxy(DATA_SERVICE, {
    proxyReqPathResolver: (req) => `/schedule${req.url}`,
    timeout: 30000,
    proxyErrorHandler: (err, res, next) => {
        logger.error(`Data service error: ${err.message}`);
        res.status(503).json({error: 'Data service unavailable'});
    }
}));

app.use('/profile', httpProxy(DATA_SERVICE, {
    proxyReqPathResolver: (req) => `/profile${req.url}`,
    timeout: 30000,
    proxyErrorHandler: (err, res, next) => {
        logger.error(`Data service error: ${err.message}`);
        res.status(503).json({error: 'Data service unavailable'});
    }
}));

// Analytics routes
app.use('/stats', httpProxy(ANALYTICS_SERVICE, {
    proxyReqPathResolver: (req) => `/stats${req.url}`,
    timeout: 30000,
    proxyErrorHandler: (err, res, next) => {
        logger.error(`Analytics service error: ${err.message}`);
        res.status(503).json({error: 'Analytics service unavailable'});
    }
}));

// Memory routes
app.use('/memory', httpProxy(MEMORY_SERVICE, {
    proxyReqPathResolver: (req) => req.originalUrl.replace(/^\/memory/, '') || '/',
    timeout: 30000,
    proxyErrorHandler: (err, res, next) => {
        logger.error(`Memory service error: ${err.message}`);
        res.status(503).json({error: 'Memory service unavailable'});
    }
}));

// Webhooks routes (no auth)
app.use('/webhooks', httpProxy(WEBHOOKS_SERVICE, {
    proxyReqPathResolver: (req) => req.originalUrl.replace(/^\/webhooks/, '') || '/',
    timeout: 30000,
    proxyErrorHandler: (err, res, next) => {
        logger.error(`Webhooks service error: ${err.message}`);
        res.status(503).json({error: 'Webhooks service unavailable'});
    }
}));

// 404 handler
app.use((req, res) => {
    res.status(404).json({error: 'Route not found', path: req.originalUrl});
});

// Error handler
app.use((err, req, res, next) => {
    logger.error('Gateway error:', err);
    res.status(err.status || 500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ============ START SERVER ============
const server = app.listen(PORT, () => {
    logger.info(`API Gateway listening on port ${PORT}`);
    logger.info(`Services:
    - Auth: ${AUTH_SERVICE}
    - Chat: ${CHAT_SERVICE}
    - Data: ${DATA_SERVICE}
    - Analytics: ${ANALYTICS_SERVICE}
    - Memory: ${MEMORY_SERVICE}
    - Webhooks: ${WEBHOOKS_SERVICE}
  `);
});

// ============ GRACEFUL SHUTDOWN ============
let isShuttingDown = false;

const gracefulShutdown = (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.warn(`Received ${signal} — starting graceful shutdown...`);

    server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
        logger.error('Forced shutdown after 30s timeout');
        process.exit(1);
    }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (err) => {
    logger.error('Unhandled rejection:', err);
    process.exit(1);
});

module.exports = app;
