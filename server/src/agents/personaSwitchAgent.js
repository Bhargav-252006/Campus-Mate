const {callLLM} = require('../utils/llmService');
const {getStudentMatePersona, getAdaptiveTone, getContinuityPrompt} = require('./studentMatePersona');

/**
 * PERSONA SWITCH AGENT - Specialized for Adaptive Communication Styles
 * Uses unified Student Mate persona with flexible teaching styles
 */

const AGENT_CONFIG = {
    name: 'Persona Switch Agent',
    specialization: '🎭 Adaptive Teaching Styles',
    temperature: 0.8,  // Higher for more creative, varied responses
    maxTokens: 600,

    personas: {
        friend: {
            name: 'Friendly Study Buddy',
            emoji: '😊',
            style: `FRIENDLY STUDY BUDDY MODE:
- Casual, warm, and relatable
- Use simple everyday language
- Add emojis and keep it light 😊
- Use relatable analogies (Netflix, food, games)
- Phrases like "Hey!", "No worries!", "You got this!"`
        },

        teacher: {
            name: 'Expert Professor',
            emoji: '👨‍🏫',
            style: `EXPERT PROFESSOR MODE:
- Professional and structured
- Use proper terminology (but explain it)
- Clear, logical organization
- Include key definitions and summaries
- Formal but encouraging`
        },

        eli5: {
            name: 'Simple Explainer (ELI5)',
            emoji: '👶',
            style: `ELI5 (Explain Like I'm 5) MODE:
- EXTREMELY simple language
- Short sentences, no jargon
- Compare to toys, food, family things
- Lots of "imagine" and "think of it like"
- One idea at a time`
        },

        interviewer: {
            name: 'Interview Coach',
            emoji: '💼',
            style: `INTERVIEW COACH MODE:
- Professional but supportive
- Focus on confidence building
- Provide structured answers (STAR method)
- Give constructive feedback
- Practice common questions`
        }
    },

    agentInstructions: `
╔═══════════════════════════════════════════════════════════╗
║        ADAPTIVE COMMUNICATION SPECIALIZATION              ║
╚═══════════════════════════════════════════════════════════╝

YOUR COMMUNICATION FOCUS:
✓ Adapting explanation style based on student preference
✓ Teaching like different personas (friend, teacher, mentor)
✓ Simplifying complex topics for different audiences
✓ Interview preparation and practice
✓ Making learning fit the student's needs

DETECT AND ADAPT:
- "explain like I'm 5" → Use ELI5 mode
- "like a friend" / "casually" → Use Friend mode
- "formally" / "technically" → Use Professor mode
- "interview" / "job" → Use Interview Coach mode

RESPONSE APPROACH (as Student Mate):
1. Detect the requested style from their message
2. Adapt your entire response to that style
3. Still be friendly and supportive (that's core to who you are!)
4. Make learning enjoyable in whatever style they prefer
5. Offer to try a different style if they want

Remember: You're still Student Mate - just wearing different "hats" to teach better! 🎭`
};

class PersonaSwitchAgent {
    constructor() {
        this.config = AGENT_CONFIG;
    }

    async handle(message, context = '', userPatterns = {}, profile = {}) {
        console.log(`[${this.config.name}] Processing persona switch request...`);

        // Detect requested persona
        const detectedPersona = this.detectRequestedPersona(message);

        // Build unified Student Mate persona + agent specialization + persona style
        const personaPrompt = getStudentMatePersona(profile, context, this.config.specialization);
        const tonePrompt = getAdaptiveTone(userPatterns);
        const continuityPrompt = getContinuityPrompt();

        let fullSystemPrompt = personaPrompt + this.config.agentInstructions;

        // Add specific persona style if detected
        if (detectedPersona) {
            fullSystemPrompt += `\n\nCURRENT ACTIVE STYLE:\n${this.config.personas[detectedPersona].style}`;
        }

        fullSystemPrompt += tonePrompt + continuityPrompt;

        // Build user prompt
        const userPrompt = `Student says: ${message}`;

        // Call LLM with unified persona
        const llmResponse = await callLLM(
            fullSystemPrompt,
            userPrompt,
            {
                maxTokens: this.config.maxTokens,
                temperature: this.config.temperature,
                taskType: 'creative'  // Use creative model for persona switching
            }
        );

        if (llmResponse) {
            return llmResponse;
        }

        // Friendly fallback
        return this.getFriendlyFallback(message, profile);
    }

    detectRequestedPersona(message) {
        const lowerMsg = message.toLowerCase();

        if (lowerMsg.includes('eli5') || lowerMsg.includes('like i\'m 5') || lowerMsg.includes('simply') || lowerMsg.includes('super simple')) {
            return 'eli5';
        }
        if (lowerMsg.includes('friend') || lowerMsg.includes('casual') || lowerMsg.includes('chill')) {
            return 'friend';
        }
        if (lowerMsg.includes('formal') || lowerMsg.includes('technical') || lowerMsg.includes('professor') || lowerMsg.includes('detailed')) {
            return 'teacher';
        }
        if (lowerMsg.includes('interview') || lowerMsg.includes('job') || lowerMsg.includes('hire')) {
            return 'interviewer';
        }

        return null; // Default Student Mate style
    }

    getFriendlyFallback(message, profile = {}) {
        const name = profile?.name;
        const nameGreeting = name ? `Hey ${name}! ` : 'Hey! ';

        return `${nameGreeting}😊 I can explain things in different ways depending on what works best for you!

**Pick a style:**
- 😊 **Like a friend** - casual and fun
- 👨‍🏫 **Like a professor** - structured and detailed  
- 👶 **Super simple (ELI5)** - like explaining to a 5-year-old
- 💼 **Interview prep** - professional practice

Just tell me what you'd like explained and how you want me to explain it!`;
    }
}

module.exports = new PersonaSwitchAgent();
