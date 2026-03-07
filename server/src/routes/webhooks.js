/**
 * 🔌 WEBHOOK ROUTES - Inbound n8n / external triggers
 */
const express = require('express');
const router = express.Router();
const toolService = require('../services/toolService');
const logger = require('../utils/logger');

/**
 * POST /api/webhooks/n8n
 * Body: { type: "execute_tool", tool: "addDeadline", args: {...}, userId: "..." }
 */
router.post('/n8n', async (req, res) => {
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
