/**
 * 🔄 STALL DETECTOR & RECOVERY SYSTEM
 * 
 * Detects when agents are stuck in unhelpful loops.
 * Implements automatic recovery strategies.
 * Tracks progress across multi-turn conversations.
 */

const logger = require('./logger');

// ═══════════════════════════════════════════════════════════════
//                    CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const CONFIG = {
    MAX_STALL_COUNT: 3,            // Attempts before recovery
    STALL_WINDOW_MS: 60000,        // 1 minute window for counting stalls
    MIN_RESPONSE_LENGTH: 50,       // Responses shorter = potential stall
    SIMILARITY_THRESHOLD: 0.8,     // Similar responses = stall
    RESET_AFTER_SUCCESS: true,     // Reset count after successful response
    ENABLE_AUTO_RECOVERY: true
};

// Patterns that indicate unhelpful responses
const STALL_PATTERNS = [
    "I don't understand",
    "Could you clarify",
    "I'm not sure what you mean",
    "Can you be more specific",
    "I need more information",
    "Please provide more details",
    "What do you mean by",
    "I'm confused about",
    "Could you rephrase"
];

// ═══════════════════════════════════════════════════════════════
//                    STALL DETECTOR CLASS
// ═══════════════════════════════════════════════════════════════

class StallDetector {
    constructor() {
        // Track stalls per user
        this.stallCounts = {};      // userId -> count
        this.stallHistory = {};     // userId -> [timestamps]
        this.responseHistory = {};  // userId -> [recent responses]
        this.recoveryAttempts = {}; // userId -> count
    }

    /**
     * Check if response indicates a stall
     */
    isStalled(response, userId) {
        // Check for stall patterns
        const hasStallPattern = STALL_PATTERNS.some(pattern =>
            response.toLowerCase().includes(pattern.toLowerCase())
        );

        // Check for very short response
        const isTooShort = response.length < CONFIG.MIN_RESPONSE_LENGTH;

        // Check for repeated similar responses
        const isSimilarToPrevious = this.checkSimilarity(response, userId);

        const isStalled = hasStallPattern || isTooShort || isSimilarToPrevious;

        if (isStalled) {
            this.recordStall(userId);
            logger.debug('Stall detected', {
                userId,
                pattern: hasStallPattern,
                short: isTooShort,
                similar: isSimilarToPrevious
            });
        } else {
            this.recordSuccess(userId);
        }

        return isStalled;
    }

    /**
     * Check similarity with recent responses
     */
    checkSimilarity(response, userId) {
        const history = this.responseHistory[userId] || [];

        for (const prevResponse of history.slice(-3)) {
            const similarity = this.calculateSimilarity(response, prevResponse);
            if (similarity > CONFIG.SIMILARITY_THRESHOLD) {
                return true;
            }
        }

        // Add to history
        if (!this.responseHistory[userId]) {
            this.responseHistory[userId] = [];
        }
        this.responseHistory[userId].push(response);

        // Keep only last 5 responses
        if (this.responseHistory[userId].length > 5) {
            this.responseHistory[userId].shift();
        }

        return false;
    }

    /**
     * Simple similarity calculation (Jaccard)
     */
    calculateSimilarity(str1, str2) {
        const words1 = new Set(str1.toLowerCase().split(/\s+/));
        const words2 = new Set(str2.toLowerCase().split(/\s+/));

        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);

        return intersection.size / union.size;
    }

    /**
     * Record a stall occurrence
     */
    recordStall(userId) {
        const now = Date.now();

        if (!this.stallHistory[userId]) {
            this.stallHistory[userId] = [];
        }

        // Remove old stalls outside window
        this.stallHistory[userId] = this.stallHistory[userId]
            .filter(ts => now - ts < CONFIG.STALL_WINDOW_MS);

        // Add new stall
        this.stallHistory[userId].push(now);
        this.stallCounts[userId] = this.stallHistory[userId].length;
    }

    /**
     * Record successful response
     */
    recordSuccess(userId) {
        if (CONFIG.RESET_AFTER_SUCCESS) {
            this.stallCounts[userId] = 0;
            this.stallHistory[userId] = [];
            this.recoveryAttempts[userId] = 0;
        }
    }

    /**
     * Check if recovery is needed
     */
    needsRecovery(userId) {
        const count = this.stallCounts[userId] || 0;
        return count >= CONFIG.MAX_STALL_COUNT;
    }

    /**
     * Get recovery strategy
     */
    getRecoveryStrategy(userId, currentAgent, userMessage) {
        const recoveryCount = this.recoveryAttempts[userId] || 0;
        this.recoveryAttempts[userId] = recoveryCount + 1;

        // Strategy escalation based on recovery attempts
        if (recoveryCount === 0) {
            return {
                strategy: 'REPHRASE_PROMPT',
                action: 'Add clarifying context to prompt',
                hint: `The user seems to need help with: "${userMessage}". Try a different approach.`
            };
        } else if (recoveryCount === 1) {
            return {
                strategy: 'SWITCH_AGENT',
                action: 'Try a different specialized agent',
                suggestedAgent: this.suggestAlternativeAgent(currentAgent)
            };
        } else if (recoveryCount === 2) {
            return {
                strategy: 'ASK_CLARIFICATION',
                action: 'Ask user for clarification',
                response: this.generateClarifyingQuestion(userMessage)
            };
        } else {
            return {
                strategy: 'HUMAN_ESCALATION',
                action: 'Admit limitation and offer alternatives',
                response: this.generateEscalationMessage(userMessage)
            };
        }
    }

    /**
     * Suggest alternative agent
     */
    suggestAlternativeAgent(currentAgent) {
        const alternatives = {
            'ACADEMIC': 'CONCEPT_GAP',
            'CONCEPT_GAP': 'ACADEMIC',
            'EMOTIONAL': 'COGNITIVE_LOAD',
            'COGNITIVE_LOAD': 'EMOTIONAL',
            'FAILURE_PATTERN': 'ACADEMIC',
            'PERSONA': 'GENERAL'
        };
        return alternatives[currentAgent] || 'GENERAL';
    }

    /**
     * Generate clarifying question
     */
    generateClarifyingQuestion(userMessage) {
        const questions = [
            `I want to make sure I help you properly. Could you tell me more about what you're looking for regarding "${userMessage.slice(0, 50)}..."?`,
            `I'd like to understand better - are you looking for an explanation, help with a problem, or something else?`,
            `Let me help you better. What specific aspect would you like me to focus on?`
        ];
        return questions[Math.floor(Math.random() * questions.length)];
    }

    /**
     * Generate escalation message
     */
    generateEscalationMessage(userMessage) {
        return `I'm having trouble providing the right help for this. Let me try a different approach:\n\n` +
            `1. Could you break down your question into smaller parts?\n` +
            `2. Or tell me what you've already tried?\n` +
            `3. Or describe what a helpful answer would look like?\n\n` +
            `I'm here to help! 💪`;
    }

    /**
     * Execute recovery
     */
    async executeRecovery(userId, currentAgent, userMessage, context) {
        if (!CONFIG.ENABLE_AUTO_RECOVERY) {
            return null;
        }

        const strategy = this.getRecoveryStrategy(userId, currentAgent, userMessage);

        logger.info('Executing recovery strategy', {
            userId,
            strategy: strategy.strategy,
            recoveryAttempt: this.recoveryAttempts[userId]
        });

        return strategy;
    }

    /**
     * Get statistics
     */
    getStats() {
        const totalUsers = Object.keys(this.stallCounts).length;
        const usersInStall = Object.values(this.stallCounts)
            .filter(c => c >= CONFIG.MAX_STALL_COUNT).length;

        return {
            trackedUsers: totalUsers,
            usersCurrentlyStalled: usersInStall,
            totalRecoveryAttempts: Object.values(this.recoveryAttempts)
                .reduce((a, b) => a + b, 0)
        };
    }

    /**
     * Clear user data
     */
    clearUser(userId) {
        delete this.stallCounts[userId];
        delete this.stallHistory[userId];
        delete this.responseHistory[userId];
        delete this.recoveryAttempts[userId];
    }
}

// Export singleton
module.exports = new StallDetector();
