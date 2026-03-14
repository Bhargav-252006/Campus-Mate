/**
 * WEBHOOK ROUTES - Inbound n8n / external triggers
 * S6 fix: Added webhook secret verification
 */
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const toolService = require('../services/toolService');
const logger = require('../utils/logger');

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || null;

/**
 * Verify webhook signature (HMAC-SHA256)
 * Header: X-Webhook-Signature: sha256=<hex digest>
 */
function verifyWebhookSignature(req, res, next) {
    // If no secret configured, reject all webhooks in production
    if (!WEBHOOK_SECRET) {
        if (process.env.NODE_ENV === 'production') {
            logger.error('Webhook rejected: WEBHOOK_SECRET not configured');
            return res.status(503).json({error: 'Webhooks not configured'});
        }
        // Dev mode: allow without signature but log a warning
        logger.warn('Webhook accepted without signature verification (dev mode)');
        return next();
    }

    const signature = req.headers['x-webhook-signature'];
    if (!signature) {
        logger.warn('Webhook rejected: missing X-Webhook-Signature header');
        return res.status(401).json({error: 'Missing webhook signature'});
    }

    const body = JSON.stringify(req.body);
    const expected = 'sha256=' + crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        logger.warn('Webhook rejected: invalid signature');
        return res.status(401).json({error: 'Invalid webhook signature'});
    }

    next();
}

/**
 * POST /api/webhooks/n8n
 * Body: { type: "execute_tool", tool: "addDeadline", args: {...}, userId: "..." }
 */
router.post('/n8n', verifyWebhookSignature, async (req, res) => {
    try {
        const {type, tool, args, userId} = req.body;

        if (type === 'execute_tool' && tool && userId) {
            const result = await toolService.executeTool({name: tool, args: args || {}, userId});
            return res.json(result);
        }

        res.status(400).json({error: 'Unknown webhook type'});
    } catch (error) {
        logger.error('Webhook error', error);
        res.status(500).json({error: 'Webhook processing failed'});
    }
});

module.exports = router;
