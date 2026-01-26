const emotionalSupportAgent = require('./emotionalSupportAgent');
const academicAgent = require('./academicAgent');
const cognitiveLoadAgent = require('./cognitiveLoadAgent');
const personaSwitchAgent = require('./personaSwitchAgent');
const failurePatternAgent = require('./failurePatternAgent');
const conceptGapAgent = require('./conceptGapAgent');
const memoryManager = require('../utils/memoryManagerV3');  // V3: Debounced saves, importance scoring, tiered memory
const promptAssembler = require('../utils/promptAssembler');
const toolExecutor = require('../utils/toolExecutor');  // 🔧 NEW: Tool Executor
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
//                    🔧 TOOL KEYWORDS (Direct Tool Triggers)
// ═══════════════════════════════════════════════════════════════

const TOOL_KEYWORDS = {
    // Pomodoro
    startPomodoro: ['start pomodoro', 'start a pomodoro', 'pomodoro', 'focus session', 'start focus', 'study session', 'start studying for'],
    endPomodoro: ['end pomodoro', 'stop pomodoro', 'done studying', 'finished studying', 'end focus', 'stop focus'],
    getPomodoroStats: ['pomodoro stats', 'focus stats', 'how much studied', 'study time', 'focus time'],

    // Mood
    logMood: ["i'm feeling", "i feel", "feeling", "my mood", "log mood", "i am feeling"],
    getMoodHistory: ['mood history', 'how have i been feeling', 'my moods', 'past moods'],
    getMoodTrends: ['mood trends', 'mood patterns', 'mood insights', 'mood analysis'],

    // Deadlines
    addDeadline: ['due on', 'due by', 'deadline', 'assignment due', 'exam on', 'project due', 'submit by'],
    getDeadlines: ['my deadlines', 'show deadlines', 'list deadlines', 'all deadlines'],
    getUpcomingDeadlines: ["what's due", 'upcoming deadlines', 'due soon', 'due this week', 'coming up'],

    // Quiz
    generateQuiz: ['quiz me', 'test me', 'create quiz', 'generate quiz', 'practice questions', 'give me a quiz'],

    // Search
    webSearch: ['search for', 'look up', 'find information', 'search the web', 'google'],
    youtubeSearch: ['youtube', 'find videos', 'video tutorial', 'watch videos', 'educational video'],

    // Reminders
    setReminder: ['remind me', 'set reminder', 'set a reminder', 'reminder to', 'remember to'],
    getReminders: ['my reminders', 'show reminders', 'list reminders'],

    // Notes
    saveNote: ['save note', 'note this', 'remember this', 'save this'],
    getNotes: ['my notes', 'show notes', 'list notes'],

    // Study Plans
    createStudyPlan: ['create study plan', 'study schedule', 'study plan for', 'help me plan'],
    getTodaysTasks: ["what's today", 'today tasks', "what should i do today", 'today schedule']
};

// ═══════════════════════════════════════════════════════════════
//                    🔧 AGENT → TOOL MAPPING
// ═══════════════════════════════════════════════════════════════

const AGENT_TOOLS = {
    COGNITIVE: ['startPomodoro', 'endPomodoro', 'getPomodoroStats', 'addDeadline', 'getDeadlines',
        'getUpcomingDeadlines', 'markDeadlineComplete', 'setReminder', 'getReminders',
        'createStudyPlan', 'getStudyPlan', 'getTodaysTasks', 'markTaskComplete'],
    EMOTIONAL: ['logMood', 'getMoodHistory', 'getMoodTrends'],
    ACADEMIC: ['generateQuiz', 'getQuizzes', 'saveQuizResult', 'webSearch', 'wikipediaSummary',
        'youtubeSearch', 'saveNote', 'getNotes', 'searchNotes'],
    GENERAL: ['setReminder', 'getReminders', 'getTodaysTasks', 'getUpcomingDeadlines']
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

        // Step 1: Store message in memory (auto-extracts useful info)
        memoryManager.addMessage(userId, {sender: 'user', text: message});

        // Step 2: Get ALL memory components separately
        const profile = memoryManager.getProfile(userId);
        const preferences = memoryManager.getPreferences(userId);
        const summary = memoryManager.getSummary(userId);
        const recentMessages = memoryManager.getRecentMessages(userId, 5);
        const patterns = memoryManager.getPatterns(userId);

        // Legacy context for backward compatibility
        const context = memoryManager.getContext(userId);

        // 🔧 Step 2.5: CHECK FOR DIRECT TOOL TRIGGERS
        const toolTrigger = this.detectToolTrigger(message);
        if (toolTrigger) {
            logger.info(`🔧 Direct tool trigger detected: ${toolTrigger.tool}`);
            const toolResponse = await this.handleToolRequest(toolTrigger, message, userId, profile);
            if (toolResponse) {
                memoryManager.addMessage(userId, {sender: 'bot', text: toolResponse.text});
                return toolResponse;
            }
        }

        // Step 3: 🔒 CHECK ACTIVE SESSION & SMART CLASSIFICATION
        const classification = await this.smartClassifyWithContext(message, userId);
        logger.info(`Final Classification: ${classification.agent} (confidence: ${classification.confidence.toFixed(2)}, source: ${classification.source})`);

        // Step 4: ROUTE to appropriate sub-agent (with new memory structure)
        const response = await this.routeToSubAgent(
            classification,
            message,
            {context, profile, preferences, summary, recentMessages, patterns},
            patterns,  // Legacy param
            profile,   // Legacy param
            userId
        );

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
    //                    🔧 TOOL DETECTION & EXECUTION
    // ═══════════════════════════════════════════════════════════════

    /**
     * Words that indicate the user is asking about the bot/memory itself (NOT a Wikipedia topic)
     */
    static SELF_REFERENCE_PATTERNS = [
        /\b(your|you|my)\s+(memory|memories|data|knowledge|mind|brain)/i,
        /\b(remember|recall|know about me|stored|saved)\b/i,
        /\babout me\b/i,
        /\bdo you (remember|know|have)\b/i,
        /\bin (your|the) (memory|system)\b/i
    ];

    /**
     * Detect if message triggers a tool directly
     */
    detectToolTrigger(message) {
        const lowerMsg = message.toLowerCase();

        for (const [toolName, keywords] of Object.entries(TOOL_KEYWORDS)) {
            for (const keyword of keywords) {
                if (lowerMsg.includes(keyword)) {
                    // 🛡️ SPECIAL CASE: Prevent Wikipedia trigger for self-referential questions
                    if (toolName === 'wikipediaSummary') {
                        // Check if user is asking about bot's memory/knowledge, not a Wikipedia topic
                        const isSelfReference = CentralizedAgent.SELF_REFERENCE_PATTERNS.some(
                            pattern => pattern.test(message)
                        );
                        if (isSelfReference) {
                            logger.debug(`Skipping wikipediaSummary - user asking about bot memory, not a topic`);
                            continue;
                        }

                        // Extract what comes after "what is" - if too short or generic, skip
                        const afterKeyword = lowerMsg.replace(/^.*?(what is|who is|define|tell me about)\s*/i, '').trim();
                        if (afterKeyword.length < 3 || /^(it|this|that|there|here)$/i.test(afterKeyword)) {
                            logger.debug(`Skipping wikipediaSummary - topic "${afterKeyword}" too short/generic`);
                            continue;
                        }
                    }

                    logger.debug(`Tool trigger detected: ${toolName} (keyword: "${keyword}")`);
                    return {tool: toolName, keyword, message};
                }
            }
        }

        return null;
    }

    /**
     * Handle a direct tool request
     */
    async handleToolRequest(toolTrigger, message, userId, profile) {
        const {tool} = toolTrigger;
        const lowerMsg = message.toLowerCase();

        try {
            let result;
            let responseText;

            switch (tool) {
                // ═══════════════════════════════════════════════════
                // 🍅 POMODORO TOOLS
                // ═══════════════════════════════════════════════════
                case 'startPomodoro': {
                    // Extract subject from message
                    const subject = this.extractSubject(message) || 'study session';
                    const duration = this.extractNumber(message, 'minutes') || 25;

                    result = await toolExecutor.execute('startPomodoro', {
                        subject,
                        duration,
                        breakTime: 5
                    }, userId);

                    if (result.success) {
                        const r = result.result;
                        responseText = `🍅 **Pomodoro Started!**\n\nFocus on **${subject}** for **${duration} minutes**.\n\n**Tips:**\n${r.tips.map(t => `- ${t}`).join('\n')}\n\nI'll be here when you're done! Say "end pomodoro" when finished. 💪`;
                    }
                    break;
                }

                case 'endPomodoro': {
                    result = await toolExecutor.execute('endPomodoro', {
                        completed: true,
                        notes: ''
                    }, userId);

                    if (result.success) {
                        const r = result.result;
                        responseText = `${r.message}\n\n🔥 **Current Streak:** ${r.streak} sessions\n⏱️ **Total Focus Time:** ${r.totalFocusTime} minutes\n\n${r.suggestion}`;
                    } else {
                        responseText = "You don't have an active pomodoro session! Say \"start pomodoro for [subject]\" to begin one. 🍅";
                    }
                    break;
                }

                case 'getPomodoroStats': {
                    const period = lowerMsg.includes('today') ? 'today' :
                        lowerMsg.includes('month') ? 'month' : 'week';

                    result = await toolExecutor.execute('getPomodoroStats', {period}, userId);

                    if (result.success) {
                        const r = result.result;
                        responseText = `📊 **Pomodoro Stats (${r.period})**\n\n🍅 Sessions: **${r.totalSessions}**\n⏱️ Focus Time: **${r.totalFocusHours} hours**\n🔥 Current Streak: **${r.currentStreak}**\n📈 Avg Session: **${r.averageSessionLength} min**`;

                        if (Object.keys(r.bySubject).length > 0) {
                            responseText += `\n\n**Time by Subject:**\n${Object.entries(r.bySubject).map(([s, m]) => `- ${s}: ${m} min`).join('\n')}`;
                        }
                    }
                    break;
                }

                // ═══════════════════════════════════════════════════
                // 🧠 MOOD TOOLS
                // ═══════════════════════════════════════════════════
                case 'logMood': {
                    const mood = this.extractMood(message);
                    const energy = this.extractNumber(message, 'energy') || 5;

                    result = await toolExecutor.execute('logMood', {
                        mood,
                        energy,
                        notes: message,
                        triggers: []
                    }, userId);

                    if (result.success) {
                        const r = result.result;
                        responseText = `${r.message}\n\n💡 **Suggestion:** ${r.suggestion}\n\n💙 ${r.affirmation}`;
                    }
                    break;
                }

                case 'getMoodHistory': {
                    result = await toolExecutor.execute('getMoodHistory', {days: 7}, userId);

                    if (result.success) {
                        const r = result.result;
                        if (r.count === 0) {
                            responseText = "You haven't logged any moods yet! Tell me how you're feeling and I'll track it for you. 🧠";
                        } else {
                            responseText = `📊 **Mood History (${r.period})**\n\n${r.entries.slice(0, 5).map(e =>
                                `- ${new Date(e.timestamp).toLocaleDateString()}: ${e.mood} (Energy: ${e.energy}/10)`
                            ).join('\n')}`;
                        }
                    }
                    break;
                }

                case 'getMoodTrends': {
                    result = await toolExecutor.execute('getMoodTrends', {days: 30}, userId);

                    if (result.success) {
                        const r = result.result;
                        if (r.entriesNeeded) {
                            responseText = `I need a few more mood entries to show you trends. Log ${r.entriesNeeded} more moods! 📊`;
                        } else {
                            responseText = `🧠 **Mood Insights (Last 30 Days)**\n\n📝 Total Entries: ${r.totalEntries}\n${r.mostCommonMood ? `😊 Most Common: ${r.mostCommonMood.mood}` : ''}\n\n**💡 Insights:**\n${r.insights.map(i => `- ${i}`).join('\n')}\n\n${r.recommendation}`;
                        }
                    }
                    break;
                }

                // ═══════════════════════════════════════════════════
                // 📅 DEADLINE TOOLS
                // ═══════════════════════════════════════════════════
                case 'addDeadline': {
                    const title = this.extractTaskTitle(message);
                    const dueDate = this.extractDate(message);
                    const subject = this.extractSubject(message) || 'General';

                    if (!dueDate) {
                        responseText = "I need a due date! Try: \"My essay is due on January 15th\" 📅";
                        break;
                    }

                    result = await toolExecutor.execute('addDeadline', {
                        title,
                        dueDate,
                        subject,
                        priority: 'medium',
                        type: 'assignment'
                    }, userId);

                    if (result.success) {
                        const r = result.result;
                        responseText = `${r.message}\n\n💡 ${r.tip}`;
                    }
                    break;
                }

                case 'getDeadlines':
                case 'getUpcomingDeadlines': {
                    result = await toolExecutor.execute('getUpcomingDeadlines', {days: 7}, userId);

                    if (result.success) {
                        const r = result.result;
                        if (r.total === 0) {
                            responseText = "You have no upcoming deadlines! 🎉 That's either great planning or time to add some!";
                        } else {
                            responseText = `📅 **Upcoming Deadlines**\n\n${r.message}\n\n`;

                            if (r.overdue.count > 0) {
                                responseText += `🚨 **OVERDUE:**\n${r.overdue.items.map(d => `- ${d.title} (${d.subject})`).join('\n')}\n\n`;
                            }
                            if (r.urgent.count > 0) {
                                responseText += `⚠️ **DUE IN 2 DAYS:**\n${r.urgent.items.map(d => `- ${d.title} - ${new Date(d.dueDate).toLocaleDateString()}`).join('\n')}\n\n`;
                            }
                            if (r.thisWeek.count > 0) {
                                responseText += `📌 **THIS WEEK:**\n${r.thisWeek.items.map(d => `- ${d.title} - ${new Date(d.dueDate).toLocaleDateString()}`).join('\n')}`;
                            }
                        }
                    }
                    break;
                }

                // ═══════════════════════════════════════════════════
                // 📝 QUIZ TOOLS
                // ═══════════════════════════════════════════════════
                case 'generateQuiz': {
                    const topic = this.extractSubject(message) || this.extractAfterKeyword(message, ['on', 'about', 'for']);
                    const numQuestions = this.extractNumber(message, 'questions') || 5;
                    const difficulty = lowerMsg.includes('hard') ? 'hard' :
                        lowerMsg.includes('easy') ? 'easy' : 'medium';

                    if (!topic) {
                        responseText = "What topic should I quiz you on? Try: \"Quiz me on photosynthesis\" 📝";
                        break;
                    }

                    result = await toolExecutor.execute('generateQuiz', {
                        topic,
                        difficulty,
                        numQuestions,
                        type: 'mixed'
                    }, userId);

                    if (result.success) {
                        responseText = `📝 **Quiz: ${topic}** (${difficulty}, ${numQuestions} questions)\n\nI've created a quiz for you! Here's what we'll cover:\n\n🎯 Topic: **${topic}**\n📊 Difficulty: **${difficulty}**\n❓ Questions: **${numQuestions}**\n\nLet me ask you the questions one by one. Ready?\n\n**Question 1:** What is the main concept of ${topic}? 🤔`;
                    }
                    break;
                }

                // ═══════════════════════════════════════════════════
                // 🔍 SEARCH TOOLS
                // ═══════════════════════════════════════════════════
                case 'webSearch': {
                    const query = this.extractAfterKeyword(message, ['search for', 'look up', 'find', 'search']);

                    if (!query) {
                        responseText = "What would you like me to search for? 🔍";
                        break;
                    }

                    result = await toolExecutor.execute('webSearch', {query, maxResults: 5}, userId);

                    if (result.success && result.result.results?.length > 0) {
                        const r = result.result;
                        responseText = `🔍 **Search Results: "${query}"**\n\n`;
                        r.results.slice(0, 3).forEach((res, i) => {
                            responseText += `**${i + 1}. ${res.title}**\n${res.snippet}\n${res.url ? `🔗 ${res.url}\n` : ''}\n`;
                        });
                    } else {
                        responseText = `I couldn't find instant results for "${query}". Try searching directly: https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
                    }
                    break;
                }

                case 'wikipediaSummary': {
                    // Extract topic - remove common prefixes
                    let topic = message.replace(/^(what is|who is|tell me about|define|wikipedia:?)\s*/i, '').trim();
                    topic = topic.replace(/[?.!]$/, ''); // Remove trailing punctuation

                    if (!topic) {
                        responseText = "What topic would you like to learn about? 📚";
                        break;
                    }

                    result = await toolExecutor.execute('wikipediaSummary', {topic, sentences: 4}, userId);

                    if (result.success && result.result.summary) {
                        const r = result.result;
                        responseText = `📚 **${r.title}**\n\n${r.summary}\n\n🔗 [Read more on Wikipedia](${r.url})`;
                    } else if (result.result?.type === 'search') {
                        const r = result.result;
                        responseText = `📚 I found some related Wikipedia articles for "${topic}":\n\n${r.results.slice(0, 3).map((res, i) => `${i + 1}. **${res.title}**\n   ${res.snippet.substring(0, 100)}...`).join('\n\n')}`;
                    } else {
                        responseText = `I couldn't find a Wikipedia article for "${topic}". Try a different search term! 📚`;
                    }
                    break;
                }

                case 'youtubeSearch': {
                    const query = this.extractAfterKeyword(message, ['youtube', 'videos about', 'video tutorial', 'find videos', 'watch']);

                    if (!query) {
                        responseText = "What topic would you like video tutorials on? 🎥";
                        break;
                    }

                    result = await toolExecutor.execute('youtubeSearch', {query, type: 'educational'}, userId);

                    if (result.success) {
                        const r = result.result;
                        responseText = `🎥 **YouTube: "${query}"**\n\n🔗 [Search on YouTube](${r.directSearch.url})\n\n**📺 Recommended Channels:**\n${r.recommendedChannels.map(ch => `- [${ch.name}](${ch.url}) - ${ch.topic}`).join('\n')}\n\n**💡 Search Tips:**\n${r.searchTips.slice(0, 2).map(t => `- ${t}`).join('\n')}`;
                    }
                    break;
                }

                // ═══════════════════════════════════════════════════
                // ⏰ REMINDER TOOLS
                // ═══════════════════════════════════════════════════
                case 'setReminder': {
                    const title = this.extractTaskTitle(message);
                    const datetime = this.extractDateTime(message);

                    if (!datetime) {
                        responseText = "When should I remind you? Try: \"Remind me to submit homework at 5pm\" ⏰";
                        break;
                    }

                    result = await toolExecutor.execute('setReminder', {
                        title,
                        datetime,
                        description: ''
                    }, userId);

                    if (result.success) {
                        responseText = result.result.message;
                    }
                    break;
                }

                case 'getReminders': {
                    result = await toolExecutor.execute('getReminders', {includeCompleted: false}, userId);

                    if (result.success) {
                        const r = result.result;
                        if (r.count === 0) {
                            responseText = "You have no pending reminders! 🎉";
                        } else {
                            responseText = `⏰ **Your Reminders (${r.count})**\n\n${r.reminders.map(rem =>
                                `- **${rem.title}** - ${new Date(rem.datetime).toLocaleString()}`
                            ).join('\n')}`;
                        }
                    }
                    break;
                }

                // ═══════════════════════════════════════════════════
                // 📝 NOTE TOOLS
                // ═══════════════════════════════════════════════════
                case 'saveNote': {
                    const content = this.extractAfterKeyword(message, ['save note', 'note this', 'remember this', 'note:']);

                    if (!content) {
                        responseText = "What would you like me to save? Try: \"Save note: [your note here]\" 📝";
                        break;
                    }

                    result = await toolExecutor.execute('saveNote', {
                        title: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
                        content,
                        tags: []
                    }, userId);

                    if (result.success) {
                        responseText = result.result.message + " I'll remember this for you! 🧠";
                    }
                    break;
                }

                case 'getNotes': {
                    result = await toolExecutor.execute('getNotes', {}, userId);

                    if (result.success) {
                        const r = result.result;
                        if (r.count === 0) {
                            responseText = "You don't have any saved notes yet! Say \"save note: [your note]\" to save one. 📝";
                        } else {
                            responseText = `📝 **Your Notes (${r.count})**\n\n${r.notes.slice(0, 5).map(n =>
                                `- **${n.title}**\n  ${n.content.substring(0, 100)}${n.content.length > 100 ? '...' : ''}`
                            ).join('\n\n')}`;
                        }
                    }
                    break;
                }

                // ═══════════════════════════════════════════════════
                // 📚 STUDY PLAN TOOLS
                // ═══════════════════════════════════════════════════
                case 'createStudyPlan': {
                    const subject = this.extractSubject(message) || 'General';

                    result = await toolExecutor.execute('createStudyPlan', {
                        subject,
                        duration: '1 hour',
                        frequency: 'daily',
                        startDate: new Date().toISOString(),
                        goals: []
                    }, userId);

                    if (result.success) {
                        responseText = `📚 ${result.result.message}\n\nI've scheduled daily study sessions for **${subject}**. Check your tasks with "what should I do today?" 💪`;
                    }
                    break;
                }

                case 'getTodaysTasks': {
                    result = await toolExecutor.execute('getTodaysTasks', {}, userId);

                    if (result.success) {
                        const r = result.result;
                        if (r.totalTasks === 0) {
                            responseText = "You have no scheduled tasks for today! 🎉 Enjoy or create a study plan!";
                        } else {
                            responseText = `📋 **Today's Tasks (${r.date})**\n\n`;

                            if (r.studyTasks.length > 0) {
                                responseText += `📚 **Study Sessions:**\n${r.studyTasks.map(t => `- ${t.subject} (${t.duration})`).join('\n')}\n\n`;
                            }
                            if (r.reminders.length > 0) {
                                responseText += `⏰ **Reminders:**\n${r.reminders.map(r => `- ${r.title} at ${new Date(r.datetime).toLocaleTimeString()}`).join('\n')}`;
                            }
                        }
                    }
                    break;
                }

                default:
                    return null; // No tool handled this
            }

            if (responseText) {
                return {
                    agent: 'Campus Mate',
                    text: responseText,
                    tool: tool,
                    toolResult: result
                };
            }

        } catch (error) {
            logger.error(`Tool execution error: ${tool}`, error);
        }

        return null;
    }

    // ═══════════════════════════════════════════════════════════════
    //                    🔧 TOOL HELPER METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Extract subject from message
     */
    extractSubject(message) {
        const patterns = [
            /(?:for|on|about|studying|study)\s+(.+?)(?:\s+for|\s+at|\s+on|$)/i,
            /pomodoro\s+(?:for\s+)?(.+?)(?:\s+for|\s*$)/i,
            /quiz\s+(?:me\s+)?(?:on\s+)?(.+?)(?:\s+with|\s*$)/i
        ];

        for (const pattern of patterns) {
            const match = message.match(pattern);
            if (match && match[1]) {
                return match[1].trim().replace(/[?.!]$/, '');
            }
        }

        // Fallback: find capitalized words that might be subjects
        const subjects = ['math', 'physics', 'chemistry', 'biology', 'history', 'english',
            'programming', 'calculus', 'algebra', 'science', 'geography'];
        const lowerMsg = message.toLowerCase();
        for (const subject of subjects) {
            if (lowerMsg.includes(subject)) {
                return subject.charAt(0).toUpperCase() + subject.slice(1);
            }
        }

        return null;
    }

    /**
     * Extract number from message
     */
    extractNumber(message, context = '') {
        const patterns = [
            new RegExp(`(\\d+)\\s*(?:${context}|min|minutes|hour|hours)`, 'i'),
            /(\d+)\s*(?:min|minutes|hour|hours)/i,
            /for\s+(\d+)/i
        ];

        for (const pattern of patterns) {
            const match = message.match(pattern);
            if (match) {
                return parseInt(match[1]);
            }
        }

        return null;
    }

    /**
     * Extract mood from message
     */
    extractMood(message) {
        const moods = {
            'stressed': ['stressed', 'stress', 'overwhelmed'],
            'anxious': ['anxious', 'anxiety', 'worried', 'nervous'],
            'happy': ['happy', 'good', 'great', 'amazing', 'wonderful', 'excited'],
            'sad': ['sad', 'down', 'depressed', 'unhappy', 'low'],
            'tired': ['tired', 'exhausted', 'sleepy', 'drained', 'fatigued'],
            'calm': ['calm', 'peaceful', 'relaxed', 'chill'],
            'frustrated': ['frustrated', 'annoyed', 'irritated', 'angry'],
            'motivated': ['motivated', 'pumped', 'energized', 'ready']
        };

        const lowerMsg = message.toLowerCase();

        for (const [mood, keywords] of Object.entries(moods)) {
            for (const keyword of keywords) {
                if (lowerMsg.includes(keyword)) {
                    return mood;
                }
            }
        }

        return 'neutral';
    }

    /**
     * Extract task title from message
     */
    extractTaskTitle(message) {
        // Remove common prefixes
        let title = message
            .replace(/^(remind me to|set reminder|reminder to|remember to|my|the)\s*/i, '')
            .replace(/\s*(at|on|by|due|tomorrow|today|tonight).*$/i, '')
            .trim();

        return title || 'Task';
    }

    /**
     * Extract date from message
     */
    extractDate(message) {
        const lowerMsg = message.toLowerCase();
        const today = new Date();

        // Check for relative dates
        if (lowerMsg.includes('tomorrow')) {
            const date = new Date(today);
            date.setDate(date.getDate() + 1);
            return date.toISOString();
        }

        if (lowerMsg.includes('next week')) {
            const date = new Date(today);
            date.setDate(date.getDate() + 7);
            return date.toISOString();
        }

        // Try to parse explicit dates
        const datePatterns = [
            /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/,  // MM/DD or MM/DD/YYYY
            /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i,  // January 15, 2024
            /(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(\w+)(?:,?\s*(\d{4}))?/i  // 15th January
        ];

        for (const pattern of datePatterns) {
            const match = message.match(pattern);
            if (match) {
                const parsed = new Date(match[0]);
                if (!isNaN(parsed.getTime())) {
                    return parsed.toISOString();
                }
            }
        }

        // Try native Date parsing
        const months = ['january', 'february', 'march', 'april', 'may', 'june',
            'july', 'august', 'september', 'october', 'november', 'december'];

        for (const month of months) {
            if (lowerMsg.includes(month)) {
                const regex = new RegExp(`${month}\\s+(\\d{1,2})`, 'i');
                const match = message.match(regex);
                if (match) {
                    const monthIndex = months.indexOf(month);
                    const day = parseInt(match[1]);
                    const year = today.getFullYear();
                    const date = new Date(year, monthIndex, day);

                    // If date is in the past, assume next year
                    if (date < today) {
                        date.setFullYear(year + 1);
                    }

                    return date.toISOString();
                }
            }
        }

        return null;
    }

    /**
     * Extract datetime from message
     */
    extractDateTime(message) {
        const date = this.extractDate(message) || new Date().toISOString();
        const lowerMsg = message.toLowerCase();

        // Extract time
        const timePatterns = [
            /(\d{1,2}):(\d{2})\s*(am|pm)?/i,
            /(\d{1,2})\s*(am|pm)/i,
            /at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i
        ];

        for (const pattern of timePatterns) {
            const match = message.match(pattern);
            if (match) {
                let hours = parseInt(match[1]);
                const minutes = match[2] ? parseInt(match[2]) : 0;
                const period = match[3]?.toLowerCase();

                if (period === 'pm' && hours < 12) hours += 12;
                if (period === 'am' && hours === 12) hours = 0;

                const dateObj = new Date(date);
                dateObj.setHours(hours, minutes, 0, 0);
                return dateObj.toISOString();
            }
        }

        return date;
    }

    /**
     * Extract text after a keyword
     */
    extractAfterKeyword(message, keywords) {
        const lowerMsg = message.toLowerCase();

        for (const keyword of keywords) {
            const index = lowerMsg.indexOf(keyword);
            if (index !== -1) {
                return message.substring(index + keyword.length).trim().replace(/[?.!]$/, '');
            }
        }

        return message.trim().replace(/[?.!]$/, '');
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
                    maxTokens: 300,  // Higher limit for reasoning models (Trinity Mini uses ~200 tokens)
                    temperature: 0.1,
                    taskType: 'classification'  // Use Trinity Mini for fast routing
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
    async routeToSubAgent(classification, message, memoryData, userPatterns, profile, userId) {
        const {agent, confidence, source} = classification;

        // Extract memory components
        const {context, preferences, summary, recentMessages, patterns} = memoryData;

        // Handle CLARIFY case
        if (agent === 'CLARIFY') {
            return {
                agent: 'Campus Mate',
                text: this.getClarifyingQuestion(message, classification.suggestedAgent),
                needsClarification: true
            };
        }

        // Handle GENERAL case with LLM
        if (agent === 'GENERAL') {
            const generalResponse = await this.handleGeneralWithLLM(message, memoryData, userId);
            return {
                agent: 'Campus Mate',
                text: generalResponse
            };
        }

        // Get the sub-agent
        const subAgent = this.subAgents[agent];
        if (!subAgent) {
            const generalResponse = await this.handleGeneralWithLLM(message, memoryData, userId);
            return {
                agent: 'Campus Mate',
                text: generalResponse
            };
        }

        try {
            // Pass both legacy and new format to agent
            const agentResponse = await subAgent.agent.handle(message, context, patterns || userPatterns, profile);

            // 🔄 CHECK FOR AGENT HANDOFF REQUEST
            // Agents can return {text, handoff} to request routing to another agent
            if (typeof agentResponse === 'object' && agentResponse.handoff) {
                logger.info(`Agent ${agent} requested handoff to ${agentResponse.handoff}`);
                return await this.handleAgentHandoff(agentResponse, message, memoryData, userId);
            }

            const responseText = typeof agentResponse === 'string' ? agentResponse : agentResponse.text;

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
     * 🔄 Handle agent handoff request
     * When an agent detects the conversation should be handled by another agent
     */
    async handleAgentHandoff(handoffRequest, message, memoryData, userId) {
        const {handoff, reason, text} = handoffRequest;

        logger.info(`Processing handoff to ${handoff}: ${reason}`);

        // Update the active session to the new agent
        this.updateActiveSession(userId, handoff);

        // Get the new agent
        const newAgent = this.subAgents[handoff];
        if (!newAgent) {
            // If handoff target doesn't exist, return the original response
            return {
                agent: 'Campus Mate',
                text: text || handoffRequest
            };
        }

        // If the original agent provided a transition message, include it
        const transitionMsg = text ? text + '\n\n' : '';

        try {
            // Route to the new agent
            const {context, patterns, profile} = memoryData;
            const newResponse = await newAgent.agent.handle(message, context, patterns, profile);
            const newResponseText = typeof newResponse === 'string' ? newResponse : newResponse.text;

            return {
                agent: newAgent.name,
                text: transitionMsg + newResponseText,
                handoff: {from: handoffRequest.from, to: handoff, reason}
            };
        } catch (error) {
            logger.error(`Handoff failed to ${handoff}`, error);
            return {
                agent: 'Campus Mate',
                text: text || "I'm here to help. What would you like to talk about?"
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
     * Handle GENERAL messages with LLM - Using Prompt Assembler
     */
    async handleGeneralWithLLM(message, memoryData, userId) {
        const {profile, preferences, summary, recentMessages, patterns} = memoryData;

        // Build the agent-specific system prompt
        const agentPrompt = getStudentMatePersona(profile, memoryData.context, '💬 General Companion & Chat') + `
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

Be yourself - Campus Mate, their friendly AI companion! 😊
` + getAdaptiveTone(patterns) + getContinuityPrompt();

        // Assemble the complete prompt using Prompt Assembler
        const assembled = promptAssembler.assemble({
            agentSystemPrompt: agentPrompt,
            profile: profile || {},
            preferences: preferences || {},
            summary: summary || '',
            recentMessages: recentMessages || [],
            currentMessage: message,
            patterns: patterns || {}
        });

        const response = await callLLM(assembled.systemPrompt, `Student says: ${message}`, {
            maxTokens: 300,
            temperature: 0.8,
            taskType: 'conversation'  // Use main model for general conversation
        }, assembled.messages);

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
