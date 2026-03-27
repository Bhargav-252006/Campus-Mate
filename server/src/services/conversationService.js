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
 *   7. Emit events for stats
 *
 * routes/chat.js calls ConversationService.handleChat() — nothing more.
 */

const centralizedAgent = require('../agents/agentRouter');
const memoryManager = require('../utils/memoryManagerV3');
const eventBus = require('../core/eventBus');
const {statsRepo} = require('../repositories');
const features = require('../config/features');
const logger = require('../utils/logger');

class ConversationService {
    /**
     * Handle a single chat turn.
     *
     * NOTE: Message persistence is handled exclusively by memoryManagerV3
     * (inside agentRouter.processRequest). The old chatHistoryStore was
     * removed entirely (Issue #1 fix) — memoryManager is the single
     * source of truth for conversation history.
     *
     * @param {{ userId: string, message: string, clientRequestId?: string }} opts
     * @returns {{ response: string, agentUsed: string, timestamp: string, meta?: object }}
     */
    async handleChat({userId, message, clientRequestId}) {
        const startTime = Date.now();

        // Delegate to CentralizedAgent (the existing orchestrator)
        // agentRouter stores both user and bot messages in memoryManager
        const agentResponse = await centralizedAgent.processRequest(message, userId);

        const latency = Date.now() - startTime;

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
     * Uses memoryManager as the single source of truth (Issue #1 fix).
     */
    getHistory(userId) {
        return memoryManager.getRecentMessages(userId, 50);
    }

    /**
     * Clear chat history for a user.
     * Uses memoryManager as the single source of truth (Issue #1 fix).
     */
    clearHistory(userId) {
        memoryManager.clearConversation(userId);
    }
}

module.exports = new ConversationService();
