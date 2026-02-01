/**
 * 🔍 SELF-EVALUATOR - Response Quality Checker
 * 
 * Evaluates AI responses before sending to user.
 * Ensures accuracy, helpfulness, and intent matching.
 * Can trigger regeneration if quality is poor.
 */

const {callLLM} = require('./llmService');
const logger = require('./logger');

// ═══════════════════════════════════════════════════════════════
//                    CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const CONFIG = {
    ENABLED: true,
    MIN_CONFIDENCE: 0.7,           // Minimum confidence to pass
    MAX_RETRIES: 2,                // Max regeneration attempts
    EVALUATE_ACADEMIC: true,       // Always evaluate academic responses
    EVALUATE_EMOTIONAL: true,      // Always evaluate emotional responses
    SKIP_GENERAL: true,            // Skip evaluation for greetings
    TIMEOUT_MS: 5000               // Evaluation timeout
};

// ═══════════════════════════════════════════════════════════════
//                    EVALUATION CRITERIA
// ═══════════════════════════════════════════════════════════════

const EVALUATION_PROMPTS = {
    ACADEMIC: `You are a response quality evaluator. Evaluate this academic response.

USER QUESTION: "{userMessage}"
AI RESPONSE: "{response}"

Evaluate and return JSON only:
{
    "isAccurate": true/false,
    "isComplete": true/false,
    "isHelpful": true/false,
    "matchesIntent": true/false,
    "confidence": 0.0-1.0,
    "issues": ["issue1", "issue2"],
    "suggestion": "how to improve if needed"
}

Be strict about accuracy for academic content.`,

    EMOTIONAL: `You are an empathy evaluator. Evaluate this emotional support response.

USER MESSAGE: "{userMessage}"
AI RESPONSE: "{response}"

Evaluate and return JSON only:
{
    "isEmpathetic": true/false,
    "validatesFeeling": true/false,
    "isHelpful": true/false,
    "isSafe": true/false,
    "confidence": 0.0-1.0,
    "issues": ["issue1", "issue2"],
    "suggestion": "how to improve if needed"
}

Ensure response is supportive and doesn't dismiss feelings.`,

    GENERAL: `Evaluate this AI response briefly.

USER: "{userMessage}"
AI: "{response}"

Return JSON:
{
    "isAppropriate": true/false,
    "matchesIntent": true/false,
    "confidence": 0.0-1.0,
    "issues": []
}`
};

// ═══════════════════════════════════════════════════════════════
//                    SELF-EVALUATOR CLASS
// ═══════════════════════════════════════════════════════════════

class SelfEvaluator {
    constructor() {
        this.evaluationCount = 0;
        this.passCount = 0;
        this.failCount = 0;
        this.retryCount = 0;
    }

    /**
     * Main evaluation entry point
     */
    async evaluate(userMessage, response, agentType, context = {}) {
        if (!CONFIG.ENABLED) {
            return {passed: true, response};
        }

        // Skip evaluation for simple cases
        if (this.shouldSkip(userMessage, agentType)) {
            logger.debug('Evaluation skipped', {agentType});
            return {passed: true, response, skipped: true};
        }

        this.evaluationCount++;

        try {
            const evaluation = await this.runEvaluation(userMessage, response, agentType);

            if (evaluation.passed) {
                this.passCount++;
                logger.debug('Response passed evaluation', {
                    confidence: evaluation.confidence
                });
                return {
                    passed: true,
                    response,
                    evaluation,
                    confidence: evaluation.confidence
                };
            }

            // Response failed - log and potentially retry
            this.failCount++;
            logger.warn('Response failed evaluation', {
                issues: evaluation.issues,
                suggestion: evaluation.suggestion
            });

            return {
                passed: false,
                response,
                evaluation,
                issues: evaluation.issues,
                suggestion: evaluation.suggestion,
                shouldRetry: evaluation.confidence < CONFIG.MIN_CONFIDENCE
            };

        } catch (error) {
            logger.error('Evaluation error', error);
            // On error, pass through (don't block user)
            return {passed: true, response, error: true};
        }
    }

    /**
     * Run the actual evaluation
     */
    async runEvaluation(userMessage, response, agentType) {
        const promptTemplate = this.getPromptTemplate(agentType);
        const prompt = promptTemplate
            .replace('{userMessage}', userMessage)
            .replace('{response}', response);

        const result = await callLLM({
            task: 'evaluation',
            messages: [{role: 'user', content: prompt}],
            maxTokens: 300,
            temperature: 0.1  // Low temperature for consistent evaluation
        });

        // Parse JSON response
        try {
            const evalResult = JSON.parse(
                result.match(/\{[\s\S]*\}/)?.[0] || '{}'
            );

            return {
                ...evalResult,
                passed: this.checkPassed(evalResult, agentType),
                confidence: evalResult.confidence || 0.5
            };
        } catch (e) {
            logger.warn('Failed to parse evaluation JSON');
            return {passed: true, confidence: 0.5, parseError: true};
        }
    }

    /**
     * Check if evaluation passed based on criteria
     */
    checkPassed(evalResult, agentType) {
        const confidence = evalResult.confidence || 0;

        if (confidence < CONFIG.MIN_CONFIDENCE) {
            return false;
        }

        switch (agentType) {
            case 'ACADEMIC':
                return evalResult.isAccurate &&
                    evalResult.isHelpful &&
                    evalResult.matchesIntent;

            case 'EMOTIONAL':
                return evalResult.isEmpathetic &&
                    evalResult.isSafe &&
                    evalResult.validatesFeeling;

            default:
                return evalResult.isAppropriate !== false;
        }
    }

    /**
     * Get appropriate evaluation prompt
     */
    getPromptTemplate(agentType) {
        switch (agentType) {
            case 'ACADEMIC':
            case 'CONCEPT_GAP':
            case 'FAILURE_PATTERN':
                return EVALUATION_PROMPTS.ACADEMIC;

            case 'EMOTIONAL':
                return EVALUATION_PROMPTS.EMOTIONAL;

            default:
                return EVALUATION_PROMPTS.GENERAL;
        }
    }

    /**
     * Determine if we should skip evaluation
     */
    shouldSkip(userMessage, agentType) {
        // Skip for very short messages (greetings)
        if (userMessage.length < 10) return true;

        // Skip general agent if configured
        if (agentType === 'GENERAL' && CONFIG.SKIP_GENERAL) return true;

        // Skip persona switching
        if (agentType === 'PERSONA') return true;

        return false;
    }

    /**
     * Get evaluation statistics
     */
    getStats() {
        return {
            total: this.evaluationCount,
            passed: this.passCount,
            failed: this.failCount,
            retries: this.retryCount,
            passRate: this.evaluationCount > 0
                ? (this.passCount / this.evaluationCount * 100).toFixed(1) + '%'
                : 'N/A'
        };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.evaluationCount = 0;
        this.passCount = 0;
        this.failCount = 0;
        this.retryCount = 0;
    }
}

// Export singleton
module.exports = new SelfEvaluator();
