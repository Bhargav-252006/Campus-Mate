/**
 * 📊 CONFIDENCE SCORER - Response Certainty Indicator
 * 
 * Calculates confidence level for AI responses.
 * Helps users understand when AI is uncertain.
 * Triggers clarification requests when confidence is low.
 */

const logger = require('./logger');

// ═══════════════════════════════════════════════════════════════
//                    CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const CONFIG = {
    HIGH_CONFIDENCE: 0.85,
    MEDIUM_CONFIDENCE: 0.6,
    LOW_CONFIDENCE: 0.4,
    SHOW_CONFIDENCE_THRESHOLD: 0.7,  // Show indicator below this
    ASK_CLARIFICATION_THRESHOLD: 0.5 // Ask for clarification below this
};

// Uncertainty phrases that reduce confidence
const UNCERTAINTY_PHRASES = [
    {phrase: "I think", weight: -0.1},
    {phrase: "I believe", weight: -0.1},
    {phrase: "probably", weight: -0.15},
    {phrase: "maybe", weight: -0.2},
    {phrase: "not sure", weight: -0.25},
    {phrase: "might be", weight: -0.15},
    {phrase: "could be", weight: -0.15},
    {phrase: "possibly", weight: -0.15},
    {phrase: "I'm not certain", weight: -0.3},
    {phrase: "if I understand correctly", weight: -0.2},
    {phrase: "it depends", weight: -0.1}
];

// Certainty phrases that increase confidence
const CERTAINTY_PHRASES = [
    {phrase: "definitely", weight: 0.1},
    {phrase: "certainly", weight: 0.1},
    {phrase: "absolutely", weight: 0.1},
    {phrase: "the answer is", weight: 0.15},
    {phrase: "this means", weight: 0.05},
    {phrase: "therefore", weight: 0.05},
    {phrase: "in conclusion", weight: 0.05}
];

// ═══════════════════════════════════════════════════════════════
//                    CONFIDENCE SCORER CLASS
// ═══════════════════════════════════════════════════════════════

class ConfidenceScorer {
    constructor() {
        this.scoreHistory = {};  // Track scores for analysis
    }

    /**
     * Calculate confidence score for a response
     */
    calculateConfidence(response, context = {}) {
        let baseConfidence = 0.75; // Start with moderate-high confidence

        // Factor 1: Response length (very short = less confident)
        baseConfidence += this.lengthFactor(response);

        // Factor 2: Uncertainty phrases
        baseConfidence += this.phraseFactor(response);

        // Factor 3: Context completeness
        baseConfidence += this.contextFactor(context);

        // Factor 4: Agent type (some agents are inherently more confident)
        baseConfidence += this.agentFactor(context.agentType);

        // Factor 5: Query clarity
        baseConfidence += this.queryFactor(context.userMessage);

        // Clamp between 0 and 1
        const finalConfidence = Math.max(0, Math.min(1, baseConfidence));

        return {
            score: finalConfidence,
            level: this.getConfidenceLevel(finalConfidence),
            showIndicator: finalConfidence < CONFIG.SHOW_CONFIDENCE_THRESHOLD,
            askClarification: finalConfidence < CONFIG.ASK_CLARIFICATION_THRESHOLD,
            factors: this.getFactorBreakdown(response, context)
        };
    }

    /**
     * Response length factor
     */
    lengthFactor(response) {
        const length = response.length;

        if (length < 50) return -0.2;      // Very short
        if (length < 100) return -0.1;     // Short
        if (length > 1000) return 0.05;    // Detailed
        return 0;
    }

    /**
     * Phrase-based factor
     */
    phraseFactor(response) {
        const lowerResponse = response.toLowerCase();
        let factor = 0;

        // Check uncertainty phrases
        for (const {phrase, weight} of UNCERTAINTY_PHRASES) {
            if (lowerResponse.includes(phrase.toLowerCase())) {
                factor += weight;
            }
        }

        // Check certainty phrases
        for (const {phrase, weight} of CERTAINTY_PHRASES) {
            if (lowerResponse.includes(phrase.toLowerCase())) {
                factor += weight;
            }
        }

        return factor;
    }

    /**
     * Context completeness factor
     */
    contextFactor(context) {
        let factor = 0;

        // Has user profile
        if (context.hasProfile) factor += 0.05;

        // Has conversation history
        if (context.hasHistory) factor += 0.05;

        // Has relevant facts
        if (context.hasFacts) factor += 0.05;

        return factor;
    }

    /**
     * Agent type factor
     */
    agentFactor(agentType) {
        const agentConfidence = {
            'ACADEMIC': 0.05,      // Academic answers can be verified
            'EMOTIONAL': -0.05,    // Emotional support is subjective
            'COGNITIVE_LOAD': 0,   // Planning is moderate
            'CONCEPT_GAP': 0.05,   // Concept explanations are factual
            'FAILURE_PATTERN': 0,  // Analysis is interpretive
            'PERSONA': -0.1,       // Style changes are preferences
            'GENERAL': 0
        };

        return agentConfidence[agentType] || 0;
    }

    /**
     * Query clarity factor
     */
    queryFactor(userMessage) {
        if (!userMessage) return 0;

        const length = userMessage.length;

        // Very short queries are often ambiguous
        if (length < 10) return -0.15;
        if (length < 20) return -0.05;

        // Questions are clearer than statements
        if (userMessage.includes('?')) return 0.05;

        // Specific keywords increase clarity
        const clarityKeywords = ['explain', 'what is', 'how do', 'why does', 'help me'];
        if (clarityKeywords.some(k => userMessage.toLowerCase().includes(k))) {
            return 0.05;
        }

        return 0;
    }

    /**
     * Get confidence level label
     */
    getConfidenceLevel(score) {
        if (score >= CONFIG.HIGH_CONFIDENCE) return 'high';
        if (score >= CONFIG.MEDIUM_CONFIDENCE) return 'medium';
        if (score >= CONFIG.LOW_CONFIDENCE) return 'low';
        return 'very_low';
    }

    /**
     * Get factor breakdown for transparency
     */
    getFactorBreakdown(response, context) {
        return {
            length: this.lengthFactor(response),
            phrases: this.phraseFactor(response),
            context: this.contextFactor(context),
            agent: this.agentFactor(context.agentType),
            query: this.queryFactor(context.userMessage)
        };
    }

    /**
     * Generate confidence indicator message
     */
    getConfidenceMessage(confidenceResult) {
        const {score, level} = confidenceResult;

        if (level === 'high') {
            return null; // No message needed for high confidence
        }

        if (level === 'medium') {
            return {
                indicator: '🤔',
                message: "I'm fairly confident in this answer, but let me know if you need more clarification."
            };
        }

        if (level === 'low') {
            return {
                indicator: '❓',
                message: "I'm not entirely sure about this. Could you provide more details so I can help better?"
            };
        }

        return {
            indicator: '⚠️',
            message: "I'm uncertain about your question. Could you rephrase it or give me more context?"
        };
    }

    /**
     * Append confidence indicator to response if needed
     */
    appendConfidenceIndicator(response, confidenceResult) {
        if (!confidenceResult.showIndicator) {
            return response;
        }

        const message = this.getConfidenceMessage(confidenceResult);
        if (!message) {
            return response;
        }

        return `${response}\n\n---\n${message.indicator} *${message.message}*`;
    }

    /**
     * Get statistics
     */
    getStats() {
        const scores = Object.values(this.scoreHistory).flat();
        if (scores.length === 0) {
            return {averageConfidence: 'N/A', totalScored: 0};
        }

        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        return {
            averageConfidence: (avg * 100).toFixed(1) + '%',
            totalScored: scores.length
        };
    }
}

// Export singleton
module.exports = new ConfidenceScorer();
