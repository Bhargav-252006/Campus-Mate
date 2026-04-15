/**
 * SESSION MANAGER - Agent conversation continuity
 *
 * Extracted from agentRouter.js for single-responsibility.
 *
 * Tracks which agent is handling each user's conversation.
 * Sessions expire after inactivity.
 */

const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════
//                    SESSION MANAGER
// ═══════════════════════════════════════════════════════════════

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
}

module.exports = {SessionManager};
