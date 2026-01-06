const emotionalSupportAgent = require('./emotionalSupportAgent');
const academicAgent = require('./academicAgent');
const cognitiveLoadAgent = require('./cognitiveLoadAgent');
const personaSwitchAgent = require('./personaSwitchAgent');
const failurePatternAgent = require('./failurePatternAgent');
const conceptGapAgent = require('./conceptGapAgent');
const memoryManager = require('../utils/memoryManager');
const {callLLM} = require('../utils/llmService');
const logger = require('../utils/logger');

/**
 * CENTRALIZED AGENT - The Single "Brain" of Student Mate
 * Now with PERSISTENT MEMORY - I remember EVERYTHING about you!
 * 
 * Flow:
 * User Message → Store in Memory → Classify Intent → Route to Sub-Agent → Response
 */

const CLASSIFIER_PROMPT = `You are an Intent Classifier for a Student AI Assistant.

Your ONLY job is to analyze the student's message and classify it into ONE of these categories:

1. ACADEMIC - Questions about subjects, concepts, study help, explanations, homework, learning
2. EMOTIONAL - Feelings, stress, anxiety, sadness, motivation, mental health, personal struggles
3. COGNITIVE - Overwhelmed, too much work, can't focus, time management, prioritization, burnout
4. PERSONA - Requests to explain differently (like a friend, teacher, simple terms, exam style)
5. FAILURE - Repeated mistakes, failing grades, patterns of errors, what they're bad at
6. CONCEPT_GAP - Confusion, missing prerequisite knowledge, don't understand basics
7. GENERAL - Greetings, small talk, unclear requests, or doesn't fit other categories

IMPORTANT RULES:
- Respond with ONLY the category name (e.g., "ACADEMIC" or "EMOTIONAL")
- Choose the MOST relevant category
- If message has both emotional AND academic content, prioritize EMOTIONAL
- If unsure, choose GENERAL

Examples:
- "explain photosynthesis" → ACADEMIC
- "I'm feeling so stressed about exams" → EMOTIONAL
- "I have too much to do" → COGNITIVE
- "explain like I'm 5" → PERSONA
- "I keep failing math tests" → FAILURE
- "I don't understand the basics of calculus" → CONCEPT_GAP
- "hello" → GENERAL`;

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

        // Keyword-based fallback classification
        this.keywordPatterns = {
            EMOTIONAL: ['sad', 'anxious', 'depressed', 'lonely', 'scared', 'worried', 'upset', 'angry', 'crying', 'hurt', 'hopeless', 'tired of', 'cant take'],
            COGNITIVE: ['overwhelm', 'too much', 'busy', 'deadline', 'cant focus', 'distract', 'burnout', 'exhausted', 'no time', 'behind'],
            PERSONA: ['like a friend', 'like a teacher', 'explain like', 'talk to me like', 'simple terms', 'eli5', 'dumbed down'],
            FAILURE: ['fail', 'failing', 'mistake', 'low mark', 'bad at', 'keep getting wrong', 'always mess up', 'never get'],
            CONCEPT_GAP: ['confused', "don't get it", "don't understand", 'missing something', 'unclear', 'lost', 'no idea', 'basics'],
            ACADEMIC: ['explain', 'what is', 'how does', 'define', 'teach me', 'help me learn', 'study', 'homework', 'assignment', 'exam prep']
        };

        logger.info('Centralized Agent initialized with 6 sub-agents');
    }

    /**
     * MAIN ENTRY POINT - All messages come here first
     */
    async processRequest(message, userId) {
        const startTime = Date.now();
        logger.separator('PROCESSING MESSAGE');
        logger.user(userId, 'Message received', message.substring(0, 80) + (message.length > 80 ? '...' : ''));

        try {
            // Step 1: Store message in PERSISTENT memory
            memoryManager.addMessage(userId, {sender: 'user', text: message});
            logger.memory('Message stored in persistent memory');

            // Step 2: Get context (includes memory), patterns, and history
            const context = memoryManager.getContext(userId);
            const userPatterns = memoryManager.detectPatterns(userId);
            const conversationHistory = memoryManager.getConversationHistory(userId, 10);
            const profile = memoryManager.getProfile(userId);

            // Step 3: CLASSIFY the message intent
            const classification = await this.classifyIntent(message);
            logger.agent('Classifier', `Intent: ${classification}`);

            // Step 4: ROUTE to appropriate sub-agent (with memory!)
            const response = await this.routeToSubAgent(
                classification,
                message,
                context,
                userPatterns,
                conversationHistory,
                profile
            );

            // Step 5: Store response in PERSISTENT memory
            memoryManager.addMessage(userId, {sender: 'bot', text: response.text});

            const duration = Date.now() - startTime;
            logger.success(`Response generated in ${duration}ms`, `Agent: ${response.agent}`);

            return response;
        } catch (error) {
            logger.error('Error processing message', error);
            return {
                agent: 'Error Handler',
                text: "I'm sorry, I encountered an error processing your message. Please try again."
            };
        }
    }

    /**
     * Classify message intent using LLM (with keyword fallback)
     */
    async classifyIntent(message) {
        logger.debug('Classifying intent...');

        const llmClassification = await callLLM(CLASSIFIER_PROMPT, message, {
            temperature: 0.1  // Low temperature for consistent classification
        });

        if (llmClassification) {
            const category = llmClassification.trim().toUpperCase();
            if (this.subAgents[category] || category === 'GENERAL') {
                logger.agent('Classifier', `LLM classified as: ${category}`);
                return category;
            }
        }

        console.log('[CENTRALIZED AGENT] Using keyword fallback');
        return this.keywordClassify(message);
    }

    /**
     * Keyword-based classification (fallback)
     */
    keywordClassify(message) {
        logger.warn('Using keyword fallback classification (LLM unavailable)');
        const lowerMsg = message.toLowerCase();

        const greetings = ['hi', 'hello', 'hey', 'good morning', 'good evening', 'howdy'];
        if (greetings.some(g => lowerMsg.includes(g)) && lowerMsg.length < 30) {
            return 'GENERAL';
        }

        const scores = {};
        for (const [category, keywords] of Object.entries(this.keywordPatterns)) {
            scores[category] = 0;
            for (const keyword of keywords) {
                if (lowerMsg.includes(keyword)) {
                    scores[category]++;
                }
            }
        }

        let maxCategory = 'GENERAL';
        let maxScore = 0;
        for (const [category, score] of Object.entries(scores)) {
            if (score > maxScore) {
                maxScore = score;
                maxCategory = category;
            }
        }

        // If tied or low confidence, prioritize EMOTIONAL over ACADEMIC
        if (scores.EMOTIONAL > 0 && scores.EMOTIONAL >= scores.ACADEMIC) {
            return 'EMOTIONAL';
        }

        return maxScore > 0 ? maxCategory : 'GENERAL';
    }

    /**
     * Route to the appropriate sub-agent based on classification
     */
    async routeToSubAgent(classification, message, context, userPatterns, conversationHistory = [], profile = null) {
        // Handle GENERAL case - use LLM with Student Mate persona
        if (classification === 'GENERAL') {
            logger.info('🤖 Calling Student Mate Agent (LLM will be invoked)');
            const response = await this.handleGeneralWithLLM(message, context, profile, conversationHistory);
            logger.debug('LLM response preview', response.substring(0, 100) + '...');
            return {
                agent: 'Student Mate',
                text: response
            };
        }

        // Get the sub-agent
        const subAgent = this.subAgents[classification];
        if (!subAgent) {
            logger.warn('Unknown classification, using Student Mate agent');
            const response = await this.handleGeneralWithLLM(message, context, profile, conversationHistory);
            return {
                agent: 'Student Mate',
                text: response
            };
        }

        try {
            logger.info(`🤖 Calling ${subAgent.name} (LLM will be invoked)`);
            // Call sub-agent with conversation history for memory
            const responseText = await subAgent.agent.handle(message, context, userPatterns, conversationHistory);
            logger.debug('LLM response preview', responseText.substring(0, 100) + '...');
            return {
                agent: subAgent.name,
                text: responseText
            };
        } catch (error) {
            logger.error(`Error in ${subAgent.name}`, error);
            return {
                agent: subAgent.name,
                text: "I apologize, I encountered an issue. Could you try again?"
            };
        }
    }

    /**
     * Handle GENERAL messages with LLM - Student Mate persona
     */
    async handleGeneralWithLLM(message, context, profile, conversationHistory) {
        const studentName = profile?.name || 'student';
        const subjects = profile?.subjects?.length > 0 ? profile.subjects.join(', ') : 'various subjects';

        const systemPrompt = `You are "Student Mate", a friendly, warm, and supportive AI companion for students.

YOUR PERSONALITY:
- Friendly and approachable like a helpful senior student or mentor
- Warm, encouraging, and positive
- Use casual but respectful language
- Add relevant emojis to make responses feel friendly 😊
- Remember the student and build rapport

STUDENT INFO (if available):
- Name: ${studentName}
- Studying: ${subjects}

YOUR CAPABILITIES (mention naturally when relevant):
- Help with academic questions and explanations
- Provide emotional support and stress relief
- Help manage workload and prioritize tasks
- Identify learning patterns and gaps

CONTEXT FROM MEMORY:
${context}

INSTRUCTIONS:
- Respond naturally to greetings and casual conversation
- If they say hi/hello, greet them warmly (use their name if known)
- Keep responses concise but warm (2-4 sentences for greetings)
- Ask how you can help if appropriate
- Never be robotic or list-like unless asked`;

        const response = await callLLM(systemPrompt, message, {
            temperature: 0.8,
            maxTokens: 300
        }, conversationHistory);

        // Fallback if LLM fails
        if (!response) {
            logger.warn('LLM failed, using fallback response');
            return `Hey there! 👋 I'm Student Mate, your study companion. How can I help you today?`;
        }

        return response;
    }
}

module.exports = new CentralizedAgent();
