const emotionalSupportAgent = require('./emotionalSupportAgent');
const academicAgent = require('./academicAgent');
const cognitiveLoadAgent = require('./cognitiveLoadAgent');
const personaSwitchAgent = require('./personaSwitchAgent');
const failurePatternAgent = require('./failurePatternAgent');
const conceptGapAgent = require('./conceptGapAgent');
const memoryManager = require('../utils/memoryManager');
const {callLLM} = require('../utils/llmService');
const {getStudentMatePersona, getAdaptiveTone, getContinuityPrompt} = require('./studentMatePersona');
const logger = require('../utils/logger');

/**
 * 🧠 CENTRALIZED AGENT - Smart 4-Layer Classification System
 * 
 * ARCHITECTURE:
 * Layer 0: Session Context Check (FASTEST) - Check if we have an active agent
 * Layer 1: Topic Change Detection - Detect if user wants to switch topics
 * Layer 2: Rule-Based (FAST ⚡) - Keyword matching for obvious cases
 * Layer 3: LLM-Based (SMART 🧠) - AI classification with confidence scores
 * Layer 4: Confidence Check - Ask clarifying question if unsure
 * 
 * KEY FEATURE: Active Agent Lock
 * - Once a conversation is in a specific agent context, it STAYS there
 * - Reclassification only happens when user explicitly changes topic
 * - This ensures conversational continuity and saves API costs
 */

// ═══════════════════════════════════════════════════════════════
//                    LAYER 1: RULE-BASED KEYWORDS
// ═══════════════════════════════════════════════════════════════

const KEYWORD_RULES = {
    EMOTIONAL: [
        'stressed', 'stress', 'anxious', 'anxiety', 'depressed', 'depression',
        'sad', 'lonely', 'scared', 'worried', 'upset', 'angry', 'crying',
        'hurt', 'hopeless', 'nervous', 'panic', 'fear', 'feeling down',
        'demotivated', 'unmotivated', 'cant cope', "can't cope", 'overwhelmed emotionally',
        'mental health', 'feeling low', 'feeling bad', 'not feeling well'
    ],
    ACADEMIC: [
        'explain', 'what is', 'how does', 'how do', 'define', 'teach me',
        'help me understand', 'study', 'homework', 'assignment', 'exam prep',
        'syllabus', 'concept', 'theory', 'formula', 'solve', 'calculate',
        'programming', 'code', 'algorithm', 'physics', 'chemistry', 'math',
        'biology', 'history', 'geography', 'learn about', 'subject'
    ],
    COGNITIVE: [
        'overwhelm', 'too much', 'too many', 'busy', 'deadline', 'deadlines',
        "can't focus", 'cant focus', 'distracted', 'burnout', 'burnt out',
        'exhausted', 'no time', 'behind schedule', 'procrastinating',
        'time management', 'prioritize', 'schedule', 'planning', 'workload',
        'productive', 'productivity', 'bored', 'boring', 'what to do'
    ],
    PERSONA: [
        'like a friend', 'like a teacher', 'explain like', 'talk to me like',
        'simple terms', 'eli5', 'explain simply', 'dumbed down', 'in easy words',
        'like im 5', "like i'm 5", 'casually', 'formally', 'technically'
    ],
    FAILURE: [
        'failing', 'failed', 'mistake', 'mistakes', 'low marks', 'low grades',
        'bad at', 'keep getting wrong', 'always mess up', 'never get right',
        'poor score', 'poor grades', 'struggling with', 'weak in'
    ],
    CONCEPT_GAP: [
        'confused', "don't get it", "don't understand", "dont understand",
        'missing something', 'unclear', 'lost', 'no idea', 'basics',
        'foundation', 'prerequisite', "doesn't make sense", 'not clicking'
    ],
    GENERAL: [
        'hi', 'hello', 'hey', 'good morning', 'good evening', 'good night',
        'howdy', 'sup', "what's up", 'how are you', 'thanks', 'thank you', 'bye'
    ]
};

// ═══════════════════════════════════════════════════════════════
//                    TOPIC CHANGE DETECTION KEYWORDS
// ═══════════════════════════════════════════════════════════════

const TOPIC_CHANGE_INDICATORS = [
    'actually', 'instead', 'different', 'switch', 'change topic',
    'new question', 'something else', 'can we talk about', 'i want to ask about',
    'forget that', 'never mind', 'moving on', 'by the way', 'btw',
    'also', 'another thing', 'one more thing'
];

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

// ═══════════════════════════════════════════════════════════════
//                    CENTRALIZED AGENT CLASS
// ═══════════════════════════════════════════════════════════════

class CentralizedAgent {
    constructor() {
        // Sub-agents that handle specific intents
        this.subAgents = {
            ACADEMIC: {agent: academicAgent, name: 'Academic Agent'},
            EMOTIONAL: {agent: emotionalSupportAgent, name: 'Emotional Support Agent'},
            COGNITIVE: {agent: cognitiveLoadAgent, name: 'Cognitive Load Agent'},
            PERSONA: {agent: personaSwitchAgent, name: 'Persona Switch Agent'},
            FAILURE: {agent: failurePatternAgent, name: 'Failure Pattern Agent'},
            CONCEPT_GAP: {agent: conceptGapAgent, name: 'Concept Gap Agent'}
        };

        // 🔒 ACTIVE AGENT SESSIONS - Key feature for conversation continuity
        // Tracks which agent is handling each user's conversation
        this.activeSessions = {};

        // Configuration
        this.CONFIDENCE_THRESHOLD = 0.6;
        this.SESSION_TIMEOUT_MS = 10 * 60 * 1000;  // 10 minutes of inactivity = new session
        this.MIN_MESSAGES_FOR_LOCK = 1;  // Lock agent after 1 exchange

        logger.info('Centralized Agent initialized with Active Agent Lock System');
    }

    /**
     * 🚀 MAIN ENTRY POINT - All messages come here first
     */
    async processRequest(message, userId) {
        logger.separator('PROCESSING MESSAGE');
        logger.user(userId, message);

        // Step 1: Store message in memory
        memoryManager.addMessage(userId, {sender: 'user', text: message});

        // Step 2: Get context, user patterns, and profile
        const context = memoryManager.getContext(userId);
        const userPatterns = memoryManager.detectPatterns(userId);
        const profile = memoryManager.getProfile(userId);

        // Step 3: 🔒 CHECK ACTIVE SESSION & SMART CLASSIFICATION
        const classification = await this.smartClassifyWithContext(message, userId);
        logger.info(`Final Classification: ${classification.agent} (confidence: ${classification.confidence.toFixed(2)}, source: ${classification.source})`);

        // Step 4: ROUTE to appropriate sub-agent
        const response = await this.routeToSubAgent(classification, message, context, userPatterns, profile, userId);

        // Step 5: Store response in memory
        memoryManager.addMessage(userId, {sender: 'bot', text: response.text});

        // Step 6: 🔒 UPDATE ACTIVE SESSION
        this.updateActiveSession(userId, classification.agent);

        logger.success(`Response generated`, `Agent: ${response.agent}`);
        return response;
    }

    /**
     * 🧠 SMART CLASSIFICATION WITH CONTEXT AWARENESS
     * 
     * This is the key improvement - it checks session context FIRST
     * before running classification.
     */
    async smartClassifyWithContext(message, userId) {
        const lowerMsg = message.toLowerCase();

        // ═══════════════════════════════════════════════════════════
        // LAYER 0: Session Context Check (FASTEST 🚀)
        // ═══════════════════════════════════════════════════════════
        const activeSession = this.getActiveSession(userId);

        if (activeSession) {
            logger.debug(`Layer 0: Active session found - ${activeSession.agent}`);

            // Check if this is a CONTINUATION or TOPIC CHANGE
            const isTopicChange = this.detectTopicChange(lowerMsg, activeSession.agent);

            if (!isTopicChange) {
                // 🔒 AGENT LOCK: Continue with the same agent
                logger.llm('Layer 0', 'success', `Continuing with locked agent: ${activeSession.agent}`);
                return {
                    agent: activeSession.agent,
                    confidence: 0.9,
                    source: 'SESSION_LOCK',
                    reason: `Continuation of ${activeSession.agent} conversation`
                };
            } else {
                logger.info(`Topic change detected - will reclassify`);
                // Clear the session lock and reclassify
                this.clearActiveSession(userId);
            }
        }

        // ═══════════════════════════════════════════════════════════
        // LAYER 1: Check for explicit greetings (new conversation)
        // ═══════════════════════════════════════════════════════════
        const greetings = ['hi', 'hello', 'hey', 'good morning', 'good evening'];
        if (greetings.some(g => lowerMsg === g || lowerMsg.startsWith(g + ' ') || lowerMsg.startsWith(g + '!'))) {
            if (lowerMsg.length < 20) {
                logger.llm('Layer 1', 'success', 'Greeting detected - GENERAL');
                return {
                    agent: 'GENERAL',
                    confidence: 0.95,
                    source: 'GREETING',
                    reason: 'Greeting message'
                };
            }
        }

        // ═══════════════════════════════════════════════════════════
        // LAYER 2: Rule-Based Classification (FAST ⚡)
        // ═══════════════════════════════════════════════════════════
        logger.debug('Layer 2: Checking keyword rules...');

        const ruleResult = this.ruleBasedClassify(lowerMsg);
        if (ruleResult) {
            logger.llm('Layer 2', 'success', `Rule-based match: ${ruleResult.agent} (score: ${ruleResult.score})`);

            // If strong keyword match (2+ keywords), use it directly
            if (ruleResult.score >= 2) {
                return {
                    agent: ruleResult.agent,
                    confidence: Math.min(0.7 + (ruleResult.score * 0.1), 0.95),
                    source: 'RULE_BASED',
                    reason: `Strong keyword match (${ruleResult.score} keywords)`
                };
            }

            // Even with 1 keyword match, if no LLM available, use it
            if (ruleResult.score >= 1) {
                // Try LLM first, but this is our fallback
            }
        }

        // ═══════════════════════════════════════════════════════════
        // LAYER 3: LLM-Based Classification (SMART 🧠)
        // ═══════════════════════════════════════════════════════════
        logger.debug('Layer 3: Calling LLM classifier...');

        const llmResult = await this.llmBasedClassify(message);

        if (llmResult && llmResult.agent) {
            logger.llm('Layer 3', 'success', `LLM classified: ${llmResult.agent} (confidence: ${llmResult.confidence})`);

            // ═══════════════════════════════════════════════════════
            // LAYER 4: Confidence Check (SAFE 🛡️)
            // ═══════════════════════════════════════════════════════
            if (llmResult.confidence >= this.CONFIDENCE_THRESHOLD) {
                return {
                    agent: llmResult.agent,
                    confidence: llmResult.confidence,
                    source: 'LLM',
                    reason: llmResult.reason || 'LLM classification'
                };
            } else {
                logger.warn(`Low confidence (${llmResult.confidence}) - checking rule-based fallback`);

                // If we have a rule-based result, prefer it over asking for clarification
                if (ruleResult && ruleResult.score >= 1) {
                    return {
                        agent: ruleResult.agent,
                        confidence: 0.6,
                        source: 'RULE_OVER_LOW_LLM',
                        reason: `Low LLM confidence, using keyword match: ${ruleResult.agent}`
                    };
                }

                return {
                    agent: 'CLARIFY',
                    confidence: llmResult.confidence,
                    source: 'LLM_LOW_CONFIDENCE',
                    suggestedAgent: llmResult.agent,
                    reason: 'Confidence too low, need clarification'
                };
            }
        }

        // ═══════════════════════════════════════════════════════════
        // FALLBACK: Use rule-based result or GENERAL
        // ═══════════════════════════════════════════════════════════
        if (ruleResult && ruleResult.score >= 1) {
            logger.warn('LLM failed, using rule-based fallback');
            return {
                agent: ruleResult.agent,
                confidence: 0.5 + (ruleResult.score * 0.15),
                source: 'RULE_FALLBACK',
                reason: 'LLM unavailable, used keyword matching'
            };
        }

        logger.warn('No classification matched, defaulting to GENERAL');
        return {
            agent: 'GENERAL',
            confidence: 0.3,
            source: 'DEFAULT',
            reason: 'No clear classification'
        };
    }

    // ═══════════════════════════════════════════════════════════════
    //                    SESSION MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get active session for a user (if not expired)
     */
    getActiveSession(userId) {
        const session = this.activeSessions[userId];

        if (!session) return null;

        // Check if session has expired
        const now = Date.now();
        if (now - session.lastActivity > this.SESSION_TIMEOUT_MS) {
            logger.debug(`Session expired for ${userId} (inactive for ${Math.round((now - session.lastActivity) / 1000 / 60)} minutes)`);
            delete this.activeSessions[userId];
            return null;
        }

        // Only lock if we have enough exchanges
        if (session.messageCount < this.MIN_MESSAGES_FOR_LOCK) {
            return null;
        }

        return session;
    }

    /**
     * Update or create active session
     */
    updateActiveSession(userId, agent) {
        // Don't lock GENERAL or CLARIFY agents
        if (agent === 'GENERAL' || agent === 'CLARIFY') {
            return;
        }

        if (!this.activeSessions[userId]) {
            this.activeSessions[userId] = {
                agent: agent,
                startTime: Date.now(),
                lastActivity: Date.now(),
                messageCount: 1
            };
        } else {
            this.activeSessions[userId].agent = agent;
            this.activeSessions[userId].lastActivity = Date.now();
            this.activeSessions[userId].messageCount++;
        }

        logger.debug(`Session updated for ${userId}: ${agent} (${this.activeSessions[userId].messageCount} messages)`);
    }

    /**
     * Clear active session (when topic changes)
     */
    clearActiveSession(userId) {
        delete this.activeSessions[userId];
        logger.debug(`Session cleared for ${userId}`);
    }

    /**
     * Detect if user is changing topics
     */
    detectTopicChange(message, currentAgent) {
        // Check for explicit topic change indicators
        for (const indicator of TOPIC_CHANGE_INDICATORS) {
            if (message.includes(indicator)) {
                logger.debug(`Topic change indicator found: "${indicator}"`);
                return true;
            }
        }

        // Check if message strongly matches a DIFFERENT agent
        const ruleResult = this.ruleBasedClassify(message);
        if (ruleResult && ruleResult.score >= 2 && ruleResult.agent !== currentAgent) {
            logger.debug(`Strong keyword match for different agent: ${ruleResult.agent} vs current ${currentAgent}`);
            return true;
        }

        return false;
    }

    // ═══════════════════════════════════════════════════════════════
    //                    CLASSIFICATION HELPERS
    // ═══════════════════════════════════════════════════════════════

    /**
     * LAYER 2: Rule-Based Keyword Classification
     */
    ruleBasedClassify(lowerMsg) {
        const scores = {};

        for (const [agent, keywords] of Object.entries(KEYWORD_RULES)) {
            scores[agent] = 0;
            for (const keyword of keywords) {
                if (lowerMsg.includes(keyword)) {
                    scores[agent]++;
                }
            }
        }

        let maxAgent = null;
        let maxScore = 0;

        for (const [agent, score] of Object.entries(scores)) {
            if (score > maxScore) {
                maxScore = score;
                maxAgent = agent;
            }
        }

        // EMOTIONAL takes priority if both emotional and other keywords present
        if (scores.EMOTIONAL > 0 && maxAgent !== 'EMOTIONAL') {
            if (scores.EMOTIONAL >= maxScore - 1) {
                return {agent: 'EMOTIONAL', score: scores.EMOTIONAL};
            }
        }

        if (maxScore > 0) {
            return {agent: maxAgent, score: maxScore};
        }

        return null;
    }

    /**
     * LAYER 3: LLM-Based Classification with Confidence
     */
    async llmBasedClassify(message) {
        try {
            const response = await callLLM(
                LLM_CLASSIFIER_PROMPT,
                `User message: "${message}"`,
                {
                    maxTokens: 100,
                    temperature: 0.1
                }
            );

            if (!response) {
                logger.warn('LLM returned null response');
                return null;
            }

            try {
                let jsonStr = response;
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    jsonStr = jsonMatch[0];
                }

                const parsed = JSON.parse(jsonStr);
                const validAgents = ['ACADEMIC', 'EMOTIONAL', 'COGNITIVE', 'PERSONA', 'FAILURE', 'CONCEPT_GAP', 'GENERAL'];
                const agent = parsed.agent?.toUpperCase();

                if (validAgents.includes(agent)) {
                    return {
                        agent: agent,
                        confidence: Math.min(Math.max(parsed.confidence || 0.5, 0), 1),
                        reason: parsed.reason || ''
                    };
                }
            } catch (parseError) {
                logger.debug('JSON parse failed, extracting from text...');
                const validAgents = ['ACADEMIC', 'EMOTIONAL', 'COGNITIVE', 'PERSONA', 'FAILURE', 'CONCEPT_GAP', 'GENERAL'];
                const responseUpper = response.toUpperCase();

                for (const agent of validAgents) {
                    if (responseUpper.includes(agent)) {
                        return {
                            agent: agent,
                            confidence: 0.7,
                            reason: 'Extracted from LLM text response'
                        };
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

    // ═══════════════════════════════════════════════════════════════
    //                    ROUTING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Route to the appropriate sub-agent based on classification
     */
    async routeToSubAgent(classification, message, context, userPatterns, profile, userId) {
        const {agent, confidence, source} = classification;

        // Handle CLARIFY case
        if (agent === 'CLARIFY') {
            return {
                agent: 'Student Mate',
                text: this.getClarifyingQuestion(message, classification.suggestedAgent),
                needsClarification: true
            };
        }

        // Handle GENERAL case with LLM
        if (agent === 'GENERAL') {
            const generalResponse = await this.handleGeneralWithLLM(message, context, userPatterns, profile);
            return {
                agent: 'Student Mate',
                text: generalResponse
            };
        }

        // Get the sub-agent
        const subAgent = this.subAgents[agent];
        if (!subAgent) {
            const generalResponse = await this.handleGeneralWithLLM(message, context, userPatterns, profile);
            return {
                agent: 'Student Mate',
                text: generalResponse
            };
        }

        try {
            const responseText = await subAgent.agent.handle(message, context, userPatterns, profile);
            return {
                agent: subAgent.name,
                text: responseText,
                classification: {agent, confidence, source}
            };
        } catch (error) {
            logger.error(`Error in ${subAgent.name}`, error);
            return {
                agent: subAgent.name,
                text: "I apologize, I encountered an issue. Could you please try rephrasing your question? 😊"
            };
        }
    }

    /**
     * Generate clarifying question when confidence is low
     */
    getClarifyingQuestion(message, suggestedAgent) {
        const clarifications = {
            EMOTIONAL: "I sense you might be going through something. Would you like to talk about how you're feeling, or would you prefer help with your studies? 💙",
            ACADEMIC: "I'd love to help! Are you looking for an explanation of a concept, or is there something else on your mind?",
            COGNITIVE: "It sounds like you have a lot going on. Would you like help managing your workload, or is there something specific you'd like to discuss?",
            default: `I want to make sure I help you the right way! 😊

Are you looking for:
• 📚 **Study help** - explanations, homework, concepts
• 😊 **Emotional support** - stress, feelings, motivation
• ⚡ **Productivity help** - managing workload, time management

Just let me know what you need most right now!`
        };

        return clarifications[suggestedAgent] || clarifications.default;
    }

    /**
     * Handle GENERAL messages with LLM
     */
    async handleGeneralWithLLM(message, context, userPatterns, profile) {
        const personaPrompt = getStudentMatePersona(profile, context, '💬 General Companion & Chat');
        const tonePrompt = getAdaptiveTone(userPatterns);
        const continuityPrompt = getContinuityPrompt();

        const systemPrompt = personaPrompt + `
╔═══════════════════════════════════════════════════════════╗
║              GENERAL CONVERSATION MODE                    ║
╚═══════════════════════════════════════════════════════════╝

This is a general conversation - greetings, check-ins, or casual chat.

YOUR APPROACH:
- Be friendly, warm, and conversational
- If it's a greeting, greet them back warmly and offer help
- If you know their name, use it naturally
- Show you remember previous conversations if relevant
- Gently guide them toward how you can help
- Keep it brief but genuine

WHAT YOU CAN HELP WITH:
📚 Academic questions and explanations
😊 Emotional support and stress relief
⚡ Productivity and time management
🎯 Learning from mistakes
🔍 Finding knowledge gaps

Be yourself - Student Mate, their friendly AI companion! 😊
` + tonePrompt + continuityPrompt;

        const response = await callLLM(systemPrompt, `Student says: ${message}`, {
            maxTokens: 300,
            temperature: 0.8
        });

        if (response) {
            return response;
        }

        const name = profile?.name;
        return name
            ? `Hey ${name}! 😊 What's on your mind? I'm here to help with anything - studies, stress, or just chat!`
            : `Hey there! 😊 What's on your mind? I'm here to help with anything - studies, stress, or just chat!`;
    }
}

// Export singleton instance
module.exports = new CentralizedAgent();
