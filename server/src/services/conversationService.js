/**
 * 💬 CONVERSATION SERVICE
 *
 * Single orchestration entry point for chat.
 *
 * Responsibilities:
 *   1. Load / manage memory
 *   2. Detect tool triggers (fast-path)
 *   3. Classify intent via Classifier
 *   4. Route to sub-agent
 *   5. Run post-processing pipeline
 *   6. Save messages
 *   7. Emit events for stats / n8n
 *
 * routes/chat.js calls ConversationService.handleChat() — nothing more.
 */

const centralizedAgent = require('../agents/agentRouter');
const memoryManager = require('../utils/memoryManagerV3');
const {chatHistoryStore} = require('../utils/dataStore');
const eventBus = require('../core/eventBus');
const {statsRepo} = require('../repositories');
const features = require('../config/features');
const logger = require('../utils/logger');

class ConversationService {
    /**
     * Handle a single chat turn.
     * @param {{ userId: string, message: string, clientRequestId?: string }} opts
     * @returns {{ response: string, agentUsed: string, timestamp: string, meta?: object }}
     */
    async handleChat({userId, message, clientRequestId}) {
        const startTime = Date.now();
        const userTimestamp = new Date().toISOString();

        chatHistoryStore.add(userId, {
            sender: 'user',
            text: message,
            timestamp: userTimestamp,
            clientRequestId
        });

        // Delegate to CentralizedAgent (the existing orchestrator)
        const agentResponse = await centralizedAgent.processRequest(message, userId);

        const latency = Date.now() - startTime;

        chatHistoryStore.add(userId, {
            sender: 'bot',
            agent: agentResponse.agent,
            text: agentResponse.text,
            timestamp: new Date().toISOString(),
            clientRequestId
        });

        // Normalize response envelope
        const envelope = {
            response: agentResponse.text,
            agentUsed: agentResponse.agent,
            timestamp: new Date().toISOString(),
            clientRequestId,
            confidence: agentResponse.confidence,
            confidenceLevel: agentResponse.confidenceLevel,
            toolsUsed: agentResponse._toolsExecuted || [],
        };

        // Emit event
        eventBus.emitEvent('chat.messageHandled', {
            userId,
            agent: agentResponse.agent,
            latencyMs: latency,
            toolsUsed: envelope.toolsUsed.length,
        });

        // Trace
        if (features.ENABLE_LLM_TRACING) {
            statsRepo.addTrace({
                type: 'chat',
                userId,
                agent: agentResponse.agent,
                confidence: agentResponse.confidence,
                toolsUsed: envelope.toolsUsed.map(t => t.tool),
                latencyMs: latency,
            }).catch(() => { });
        }

        return envelope;
    }

    /**
     * Get chat history for a user.
     */
    getHistory(userId) {
        return chatHistoryStore.getAll(userId);
    }

    /**
     * Clear chat history for a user.
     */
    clearHistory(userId) {
        chatHistoryStore.clear(userId);
    }
}

module.exports = new ConversationService();
