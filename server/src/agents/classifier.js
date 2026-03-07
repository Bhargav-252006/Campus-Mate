/**
 * 🧠 CLASSIFIER - Smart 4-Layer Intent Classification
 *
 * Extracted from agentRouter.js for single-responsibility.
 *
 * Layers:
 *   0: Session tiebreaker (boost, not lock)
 *   1: Greeting fast-path
 *   2: Rule-based intent phrases
 *   3: LLM classification
 *   4: Confidence gate
 */

const {callLLM} = require('../utils/llmService');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════
//          INTENT PHRASES — multi-word signals for Layer 2
// ═══════════════════════════════════════════════════════════════

const INTENT_PHRASES = {
    EMOTIONAL: [
        "i'm stressed", 'i am stressed', 'feeling stressed',
        "i'm anxious", 'i am anxious', 'feeling anxious',
        "i'm depressed", 'feeling depressed', 'feeling down',
        "i'm sad", 'i feel sad', 'feeling lonely',
        "can't cope", 'cant cope', 'feeling hopeless',
        'mental health', 'feeling low', 'feeling bad',
        "i'm scared", 'i am worried', 'feeling nervous',
        'overwhelmed emotionally', 'not feeling well emotionally'
    ],
    ACADEMIC: [
        'explain to me', 'teach me', 'help me understand',
        'how does', 'how do you', 'what is the concept',
        'solve this', 'help with homework', 'help with assignment',
        'exam prep', 'learn about', 'can you explain',
        'help me study', 'i need to study', 'practice problems'
    ],
    COGNITIVE: [
        "can't focus", 'cant focus', 'too much work',
        'too many deadlines', 'behind schedule', 'time management',
        'manage my time', 'feeling overwhelmed', 'so overwhelmed',
        'burnt out', 'burning out', 'no time left',
        "i'm procrastinating", 'help me prioritize', 'manage my workload'
    ],
    PERSONA: [
        'like a friend', 'like a teacher', 'explain like',
        'talk to me like', 'simple terms', 'eli5',
        'explain simply', 'in easy words', "like i'm 5", 'like im 5'
    ],
    FAILURE: [
        'i keep failing', 'i failed my', 'low grades',
        'low marks', 'poor grades', 'poor score',
        'keep getting wrong', 'always mess up', 'never get right',
        'struggling with', 'weak in', 'bad at math',
        'bad at physics', 'bad at chemistry'
    ],
    CONCEPT_GAP: [
        "don't understand", 'dont understand', "don't get it",
        'doesnt make sense', "doesn't make sense", 'not clicking',
        'missing something', 'what are the basics',
        'need the foundation', 'what prerequisite', 'i have no idea'
    ]
};

// ═══════════════════════════════════════════════════════════════
//                    LLM CLASSIFIER PROMPT
// ═══════════════════════════════════════════════════════════════

const LLM_CLASSIFIER_PROMPT = `You are an intent classifier for a multi-agent student assistant.

Available agents:
- ACADEMIC: Study help, explanations, homework, learning concepts
- EMOTIONAL: Feelings, stress, anxiety, mental health support
- COGNITIVE: Time management, overwhelm, focus, productivity, boredom
- PERSONA: Different explanation styles (like a friend, simply, etc.)
- FAILURE: Learning from mistakes, improving weak areas
- CONCEPT_GAP: Finding missing knowledge, understanding basics
- GENERAL: Greetings, small talk, unclear requests

Task:
Classify the user message into ONE agent.
If multiple apply, choose the PRIMARY one based on what the user NEEDS most.
Priority: EMOTIONAL > COGNITIVE > others (emotional needs come first)

Return JSON only (no explanation):
{
  "agent": "<AGENT_NAME>",
  "confidence": <0.0-1.0>,
  "reason": "<brief reason>"
}`;

const VALID_AGENTS = ['ACADEMIC', 'EMOTIONAL', 'COGNITIVE', 'PERSONA', 'FAILURE', 'CONCEPT_GAP', 'GENERAL'];

// ═══════════════════════════════════════════════════════════════
//                    CLASSIFIER CLASS
// ═══════════════════════════════════════════════════════════════

class Classifier {
    constructor(confidenceThreshold = 0.6) {
        this.CONFIDENCE_THRESHOLD = confidenceThreshold;
    }

    /**
     * Full 4-layer classification pipeline.
     * @param {string} message - User's raw message
     * @param {string|null} sessionAgent - Currently active session agent (or null)
     * @returns {{ agent, confidence, source, reason, suggestedAgent? }}
     */
    async classify(message, sessionAgent = null) {
        const lowerMsg = message.toLowerCase();

        // Layer 0: Session context (tiebreaker, not lock)
        if (sessionAgent) {
            logger.debug(`Layer 0: Active session context - ${sessionAgent} (used as tiebreaker, not lock)`);
        }

        // Layer 1: Greeting fast-path
        const greetings = [
            'hi', 'hello', 'hey', 'good morning', 'good evening', 'good night',
            'howdy', 'sup', "what's up", 'whats up', 'how are you', 'how r u',
            'thanks', 'thank you', 'bye', 'goodbye'
        ];
        if (greetings.some(g => lowerMsg === g || lowerMsg.startsWith(g + ' ') || lowerMsg.startsWith(g + '!') || lowerMsg.startsWith(g + ','))) {
            if (lowerMsg.length < 30) {
                logger.llm('Layer 1', 'success', 'Greeting/social detected - GENERAL');
                return {agent: 'GENERAL', confidence: 0.95, source: 'GREETING', reason: 'Greeting/social message'};
            }
        }

        // Layer 2: Intent-phrase rules
        logger.debug('Layer 2: Checking intent phrases...');
        const ruleResult = this.ruleBasedClassify(lowerMsg);
        if (ruleResult) {
            logger.llm('Layer 2', 'success', `Phrase match: ${ruleResult.agent} (score: ${ruleResult.score})`);
            if (ruleResult.score >= 2) {
                return {
                    agent: ruleResult.agent,
                    confidence: Math.min(0.75 + (ruleResult.score * 0.1), 0.95),
                    source: 'RULE_BASED',
                    reason: `Strong intent-phrase match (${ruleResult.score} phrases)`
                };
            }
        }

        // Layer 3: LLM classification
        logger.debug('Layer 3: Calling LLM classifier...');
        const llmResult = await this.llmBasedClassify(message);

        if (llmResult && llmResult.agent) {
            // Apply session tiebreaker
            let finalAgent = llmResult.agent;
            let finalConfidence = llmResult.confidence;
            let source = 'LLM';

            if (sessionAgent) {
                if (llmResult.agent === sessionAgent) {
                    finalConfidence = Math.min(finalConfidence + 0.1, 1.0);
                    source = 'LLM_SESSION_BOOST';
                    logger.debug(`Session tiebreaker: boosted ${sessionAgent} confidence to ${finalConfidence.toFixed(2)}`);
                } else if (llmResult.confidence >= 0.7) {
                    logger.info(`Session override: ${sessionAgent} → ${llmResult.agent} (confidence: ${llmResult.confidence})`);
                    source = 'LLM_SESSION_OVERRIDE';
                } else {
                    if (llmResult.confidence < this.CONFIDENCE_THRESHOLD) {
                        finalAgent = sessionAgent;
                        finalConfidence = 0.65;
                        source = 'SESSION_TIEBREAK';
                        logger.debug(`Session tiebreaker: keeping ${sessionAgent} (LLM ${llmResult.agent} at ${llmResult.confidence} too low)`);
                    }
                }
            }

            logger.llm('Layer 3', 'success', `Classified: ${finalAgent} (confidence: ${finalConfidence.toFixed(2)}, source: ${source})`);

            // Layer 4: Confidence gate
            if (finalConfidence >= this.CONFIDENCE_THRESHOLD) {
                return {agent: finalAgent, confidence: finalConfidence, source, reason: llmResult.reason || 'LLM classification'};
            } else {
                logger.warn(`Low confidence (${finalConfidence}) - checking rule-based fallback`);
                if (ruleResult && ruleResult.score >= 1) {
                    return {agent: ruleResult.agent, confidence: 0.6, source: 'RULE_OVER_LOW_LLM', reason: `Low LLM confidence, using keyword match: ${ruleResult.agent}`};
                }
                return {agent: 'CLARIFY', confidence: finalConfidence, source: 'LLM_LOW_CONFIDENCE', suggestedAgent: finalAgent, reason: 'Confidence too low, need clarification'};
            }
        }

        // Fallback chain: session → rules → GENERAL
        if (sessionAgent) {
            logger.warn('LLM failed, falling back to session agent');
            return {agent: sessionAgent, confidence: 0.6, source: 'SESSION_FALLBACK', reason: `LLM unavailable, continuing ${sessionAgent} session`};
        }
        if (ruleResult && ruleResult.score >= 1) {
            logger.warn('LLM failed, using rule-based fallback');
            return {agent: ruleResult.agent, confidence: 0.5 + (ruleResult.score * 0.15), source: 'RULE_FALLBACK', reason: 'LLM unavailable, used keyword matching'};
        }

        logger.warn('No classification matched, defaulting to GENERAL');
        return {agent: 'GENERAL', confidence: 0.3, source: 'DEFAULT', reason: 'No clear classification'};
    }

    /**
     * Layer 2: Rule-based intent-phrase scoring
     */
    ruleBasedClassify(lowerMsg) {
        const scores = {};
        for (const [agent, phrases] of Object.entries(INTENT_PHRASES)) {
            scores[agent] = 0;
            for (const phrase of phrases) {
                if (lowerMsg.includes(phrase)) scores[agent]++;
            }
        }

        let maxAgent = null;
        let maxScore = 0;
        for (const [agent, score] of Object.entries(scores)) {
            if (score > maxScore) {maxScore = score; maxAgent = agent;}
        }

        // EMOTIONAL takes priority if close
        if (scores.EMOTIONAL > 0 && maxAgent !== 'EMOTIONAL') {
            if (scores.EMOTIONAL >= maxScore - 1) {
                return {agent: 'EMOTIONAL', score: scores.EMOTIONAL};
            }
        }

        if (maxScore > 0) return {agent: maxAgent, score: maxScore};
        return null;
    }

    /**
     * Layer 3: LLM-based classification
     */
    async llmBasedClassify(message) {
        try {
            const response = await callLLM(
                LLM_CLASSIFIER_PROMPT,
                `User message: "${message}"`,
                {maxTokens: 500, temperature: 0.1, taskType: 'classification'}
            );

            if (!response) {
                logger.warn('LLM returned null response');
                return null;
            }

            try {
                let jsonStr = response;
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                if (jsonMatch) jsonStr = jsonMatch[0];

                const parsed = JSON.parse(jsonStr);
                const agent = parsed.agent?.toUpperCase();

                if (VALID_AGENTS.includes(agent)) {
                    return {
                        agent,
                        confidence: Math.min(Math.max(parsed.confidence || 0.5, 0), 1),
                        reason: parsed.reason || ''
                    };
                }
            } catch (parseError) {
                logger.debug('JSON parse failed, extracting from text...');
                const responseUpper = response.toUpperCase();
                for (const agent of VALID_AGENTS) {
                    if (responseUpper.includes(agent)) {
                        return {agent, confidence: 0.7, reason: 'Extracted from LLM text response'};
                    }
                }
            }

            logger.warn(`Could not parse LLM response: ${response.substring(0, 100)}`);
            return null;
        } catch (error) {
            logger.error('LLM classification failed', error);
            return null;
        }
    }
}

module.exports = {Classifier, INTENT_PHRASES, VALID_AGENTS};
