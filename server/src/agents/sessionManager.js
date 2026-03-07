/**
 * 🔒 SESSION MANAGER - Agent conversation continuity
 *
 * Extracted from agentRouter.js for single-responsibility.
 *
 * Tracks which agent is handling each user's conversation.
 * Sessions expire after inactivity. Topic-change detection
 * uses both keyword indicators and phrase-rule scoring.
 */

const {INTENT_PHRASES} = require('./classifier');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════
//                    TOPIC CHANGE INDICATORS
// ═══════════════════════════════════════════════════════════════

const TOPIC_CHANGE_INDICATORS = [
    'actually', 'instead', 'different', 'switch', 'change topic',
    'new question', 'something else', 'can we talk about', 'i want to ask about',
    'forget that', 'never mind', 'moving on', 'by the way', 'btw',
    'also', 'another thing', 'one more thing'
];

class SessionManager {
    constructor(options = {}) {
        this.activeSessions = {};
        this.SESSION_TIMEOUT_MS = options.timeoutMs || 10 * 60 * 1000;
        this.MIN_MESSAGES_FOR_LOCK = options.minMessages || 1;
    }

    /**
     * Get active session for a user (if not expired)
     */
    getActiveSession(userId) {
        const session = this.activeSessions[userId];
        if (!session) return null;

        const now = Date.now();
        if (now - session.lastActivity > this.SESSION_TIMEOUT_MS) {
            logger.debug(`Session expired for ${userId} (inactive for ${Math.round((now - session.lastActivity) / 1000 / 60)} minutes)`);
            delete this.activeSessions[userId];
            return null;
        }

        if (session.messageCount < this.MIN_MESSAGES_FOR_LOCK) return null;
        return session;
    }

    /**
     * Get the agent name from the active session (or null)
     */
    getSessionAgent(userId) {
        const session = this.getActiveSession(userId);
        return session ? session.agent : null;
    }

    /**
     * Update or create active session
     */
    updateActiveSession(userId, agent) {
        if (agent === 'GENERAL' || agent === 'CLARIFY') return;

        if (!this.activeSessions[userId]) {
            this.activeSessions[userId] = {
                agent, startTime: Date.now(), lastActivity: Date.now(), messageCount: 1
            };
        } else {
            this.activeSessions[userId].agent = agent;
            this.activeSessions[userId].lastActivity = Date.now();
            this.activeSessions[userId].messageCount++;
        }

        logger.debug(`Session updated for ${userId}: ${agent} (${this.activeSessions[userId].messageCount} messages)`);
    }

    /**
     * Clear active session (on topic change or override)
     */
    clearActiveSession(userId) {
        delete this.activeSessions[userId];
        logger.debug(`Session cleared for ${userId}`);
    }

    /**
     * Detect if user is changing topics (used for session override)
     */
    detectTopicChange(message, currentAgent) {
        const lowerMsg = message.toLowerCase();

        for (const indicator of TOPIC_CHANGE_INDICATORS) {
            if (lowerMsg.includes(indicator)) {
                logger.debug(`Topic change indicator found: "${indicator}"`);
                return true;
            }
        }

        // Check if message strongly matches a DIFFERENT agent (≥2 phrases)
        const scores = {};
        for (const [agent, phrases] of Object.entries(INTENT_PHRASES)) {
            scores[agent] = 0;
            for (const phrase of phrases) {
                if (lowerMsg.includes(phrase)) scores[agent]++;
            }
        }

        let maxAgent = null, maxScore = 0;
        for (const [agent, score] of Object.entries(scores)) {
            if (score > maxScore) {maxScore = score; maxAgent = agent;}
        }

        if (maxScore >= 2 && maxAgent !== currentAgent) {
            logger.debug(`Strong phrase match for different agent: ${maxAgent} vs current ${currentAgent}`);
            return true;
        }

        return false;
    }
}

module.exports = {SessionManager, TOPIC_CHANGE_INDICATORS};
