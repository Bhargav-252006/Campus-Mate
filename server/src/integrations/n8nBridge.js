/**
 * 🔌 N8N BRIDGE - Webhook integration skeleton
 *
 * Outbound: listens to eventBus and POSTs to n8n webhooks.
 * Inbound : handled via routes/webhooks.js → toolService.
 *
 * Enable with ENABLE_N8N_BRIDGE=true and N8N_WEBHOOK_URL in env.
 */

const eventBus = require('../core/eventBus');
const features = require('../config/features');
const logger = require('../utils/logger');

class N8nBridge {
    constructor() {
        this._outboundEvents = [
            'deadline.created', 'deadline.completed',
            'mood.recorded',
            'pomodoro.completed',
            'note.created',
        ];
    }

    /** Start listening (call once at boot) */
    start() {
        if (!features.ENABLE_N8N_BRIDGE || !features.N8N_WEBHOOK_URL) {
            logger.debug('N8nBridge: disabled (ENABLE_N8N_BRIDGE / N8N_WEBHOOK_URL not set)');
            return;
        }

        for (const eventName of this._outboundEvents) {
            eventBus.on(eventName, (payload) => this._sendOutbound(eventName, payload));
        }
        logger.info(`N8nBridge: listening for ${this._outboundEvents.length} events → ${features.N8N_WEBHOOK_URL}`);
    }

    async _sendOutbound(eventName, payload) {
        try {
            await fetch(features.N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({event: eventName, payload, timestamp: new Date().toISOString()}),
            });
        } catch (err) {
            logger.warn(`N8nBridge: outbound failed for ${eventName}: ${err.message}`);
        }
    }
}

module.exports = new N8nBridge();
