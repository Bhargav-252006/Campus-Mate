const {callLLM} = require('../utils/llmService');
const {getStudentMatePersona, getAdaptiveTone, getContinuityPrompt} = require('./studentMatePersona');
const logger = require('../utils/logger');

/**
 * EMOTIONAL SUPPORT AGENT - Specialized for Mental Health & Wellbeing
 * Uses unified Student Mate persona for consistent, caring support
 */

const AGENT_CONFIG = {
    name: 'Emotional Support Agent',
    specialization: '💙 Emotional Support & Wellbeing',
    temperature: 0.8,  // Slightly higher for more empathetic responses
    maxTokens: 1500,

    topics: [
        'stress', 'anxiety', 'depression', 'loneliness',
        'motivation', 'self-esteem', 'fear', 'worry',
        'sadness', 'anger', 'frustration', 'burnout',
        'feelings', 'emotions', 'mental health'
    ],

    crisisKeywords: [
        'suicide', 'kill myself', 'end it all', 'want to die',
        'self harm', 'hurt myself', 'cutting', 'no reason to live',
        'better off dead', 'end my life'
    ],

    agentInstructions: `
╔═══════════════════════════════════════════════════════════╗
║          EMOTIONAL SUPPORT SPECIALIZATION                 ║
╚═══════════════════════════════════════════════════════════╝

YOUR EMOTIONAL SUPPORT FOCUS:
✓ Listening and validating feelings
✓ Providing comfort and reassurance
✓ Teaching coping strategies (breathing, mindfulness)
✓ Motivation and encouragement
✓ Stress relief techniques
✓ Building resilience and self-esteem

RESPONSE APPROACH (as Student Mate):
1. ALWAYS acknowledge their feelings FIRST ("I hear you", "That sounds really tough")
2. Validate their experience - NEVER minimize it
3. Be warm, caring, and human - like a trusted friend
4. Use gentle language and supportive emojis 💙
5. Offer practical coping strategies
6. Know when to recommend professional help

COPING TECHNIQUES TO SUGGEST:
- Deep breathing (4-4-4: breathe in 4s, hold 4s, out 4s)
- Grounding (5 things you see, 4 you hear, 3 you touch...)
- Taking breaks and self-care
- Talking to someone trusted
- Physical activity
- Journaling

CRITICAL SAFETY RULES:
⚠️ If someone mentions self-harm, suicide, or severe distress:
1. Take it SERIOUSLY
2. Express genuine concern
3. ALWAYS provide helpline numbers
4. Encourage professional help
5. Never leave them feeling alone

Remember: You are a SAFE SPACE. No judgment. Just support and understanding. 💙`
};

class EmotionalSupportAgent {
    constructor() {
        this.config = AGENT_CONFIG;
    }

    async handle(message, context = '', userPatterns = {}, profile = {}) {
        logger.agent(this.config.name, 'Processing emotional support request...');

        // CRITICAL: Check for crisis keywords FIRST
        if (this.detectCrisis(message)) {
            logger.warn(`[${this.config.name}] CRISIS DETECTED - Providing safety response`);
            return this.getCrisisResponse(profile);
        }

        // Build unified Student Mate persona + agent specialization
        const personaPrompt = getStudentMatePersona(profile, context, this.config.specialization);
        const tonePrompt = getAdaptiveTone(userPatterns); // Use actual patterns instead of forcing high
        const continuityPrompt = getContinuityPrompt();

        const fullSystemPrompt = personaPrompt + this.config.agentInstructions + tonePrompt + continuityPrompt;

        // Build user prompt
        const userPrompt = this.buildPrompt(message, userPatterns);

        // Call LLM with unified persona
        const llmResponse = await callLLM(
            fullSystemPrompt,
            userPrompt,
            {
                maxTokens: this.config.maxTokens,
                temperature: this.config.temperature,
                taskType: 'empathy'  // Use main model for empathetic responses
            }
        );

        if (llmResponse) {
            return llmResponse;
        }

        // Friendly fallback
        return this.getFriendlyFallback(message, profile);
    }

    detectCrisis(message) {
        const lowerMsg = message.toLowerCase();
        return this.config.crisisKeywords.some(keyword => lowerMsg.includes(keyword));
    }

    getCrisisResponse(profile = {}) {
        const name = profile?.name;
        const nameGreeting = name ? `${name}, ` : '';

        return `${nameGreeting}I'm really concerned about what you've shared, and I want you to know that I genuinely care about you. 💙

**You are not alone.** What you're feeling is real, and there are people who want to help.

**Please reach out to someone who can help right now:**

📞 **Crisis Helplines (India):**
• **iCall**: 9152987821 (Mon-Sat, 8am-10pm)
• **Vandrevala Foundation**: 1860-2662-345 (24/7)
• **NIMHANS**: 080-46110007
• **Snehi**: 044-24640050

These are trained counselors who understand what you're going through.

**Right now:**
- If you're in immediate danger, please call emergency services
- Reach out to a trusted person - family member, friend, teacher
- Stay somewhere safe

I'm here if you want to talk, but please also reach out to one of these helplines. They can provide the support you deserve. 🤗

**You matter. Your life matters.**`;
    }

    buildPrompt(message, userPatterns) {
        let prompt = '';

        if (userPatterns?.emotionalState) {
            prompt += `Note: Student has been showing signs of ${userPatterns.emotionalState}.\n\n`;
        }

        prompt += `Student says: ${message}`;
        return prompt;
    }

    getFriendlyFallback(message, profile = {}) {
        const name = profile?.name;
        const nameGreeting = name ? `${name}, ` : '';

        return `${nameGreeting}Thank you for sharing how you're feeling. It takes courage to open up, and I'm here for you. 💙

**Your feelings are valid**, whatever they are. You don't have to have it all figured out.

**I'm here to:**
• Listen without judgment
• Help you process what you're going through
• Suggest coping strategies if you'd like

**Remember:**
• It's okay to not be okay
• Asking for help is a sign of strength
• You're not alone in this

Would you like to tell me more about what's on your mind? I'm all ears. 🤗`;
    }

    matchesEmotion(message, keywords) {
        return keywords.some(kw => message.toLowerCase().includes(kw));
    }
}

module.exports = new EmotionalSupportAgent();
