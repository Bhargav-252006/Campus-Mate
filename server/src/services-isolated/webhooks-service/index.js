// Webhooks Service — External Event Triggers
// Handles incoming webhooks from external services (custom integrations, cron triggers, etc.)

require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const logger = require('../utils/logger');
const {pubSub} = require('../shared/redis');

const app = express();
const PORT = process.env.PORT || 3006;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || null;

app.use(express.json());

// ============ WEBHOOK SIGNATURE VERIFICATION ============
const verifySignature = (req, res, next) => {
    if (!WEBHOOK_SECRET) {
        if (process.env.NODE_ENV === 'production') {
            logger.error('Webhook rejected: WEBHOOK_SECRET not configured');
            return res.status(503).json({error: 'Webhooks not configured'});
        }
        logger.warn('Webhook accepted without signature verification (dev mode)');
        return next();
    }

    const signature = req.headers['x-webhook-signature'];
    if (!signature) {
        logger.warn('Webhook rejected: missing X-Webhook-Signature header');
        return res.status(401).json({error: 'Unauthorized: Missing signature'});
    }

    const bodyStr = JSON.stringify(req.body);
    const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(bodyStr)
        .digest('hex');

    if (signature.length !== expectedSignature.length) {
        logger.warn('Webhook rejected: signature length mismatch');
        return res.status(401).json({error: 'Unauthorized: Invalid signature'});
    }

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        logger.warn('Webhook rejected: invalid signature');
        return res.status(401).json({error: 'Unauthorized: Invalid signature'});
    }

    next();
};

// ============ ENDPOINTS ============

app.get('/health', (req, res) => {
    res.json({status: 'OK', service: 'Webhooks Service'});
});

// POST /external — Receive signed webhook from any external source
app.post('/external', verifySignature, async (req, res) => {
    try {
        const {userId, eventType, data} = req.body;

        logger.info(`Webhook received: ${eventType} for user ${userId}`);

        await pubSub.publish(`webhook:${eventType}`, {
            userId,
            eventType,
            data,
            timestamp: new Date()
        });

        switch (eventType) {
            case 'exam_reminder':
                logger.info(`Exam reminder: ${data?.subject}`);
                break;
            case 'deadline_alert':
                logger.info(`Deadline alert: ${data?.task}`);
                break;
            case 'mood_check_in':
                logger.info(`Mood check-in received`);
                break;
            default:
                logger.info(`Event type: ${eventType}`);
        }

        res.json({status: 'received', eventType});
    } catch (error) {
        logger.error('Webhook processing error:', error);
        res.status(500).json({error: 'Failed to process webhook'});
    }
});

// POST /custom — Receive custom webhooks (Bearer token auth)
app.post('/custom', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({error: 'Unauthorized'});
        }

        const {userId, eventType, data} = req.body;
        logger.info(`Custom webhook received: ${eventType}`);
        await pubSub.publish(`custom:${eventType}`, {userId, data});
        res.json({status: 'received'});
    } catch (error) {
        logger.error('Custom webhook error:', error);
        res.status(500).json({error: 'Failed to process webhook'});
    }
});

// GET /events/subscribe — Endpoint info
app.get('/events/subscribe', (req, res) => {
    res.json({
        message: 'Webhooks Service',
        endpoints: [
            {
                path: '/external',
                method: 'POST',
                description: 'External webhook (HMAC signed)',
                requires: 'X-Webhook-Signature: sha256=<hmac> header'
            },
            {
                path: '/custom',
                method: 'POST',
                description: 'Custom webhook endpoint',
                requires: 'Authorization: Bearer <token>'
            }
        ],
        supportedEvents: [
            'exam_reminder',
            'deadline_alert',
            'mood_check_in',
            'study_session_complete',
            'custom_events'
        ]
    });
});

// ============ START SERVER ============
app.listen(PORT, () => {
    logger.info(`Webhooks Service listening on port ${PORT}`);
});

module.exports = app;
