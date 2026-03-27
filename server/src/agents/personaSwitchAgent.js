const {BaseAgent} = require('./BaseAgent');

/**
 * PERSONA SWITCH AGENT - Specialized for Adaptive Communication Styles
 * Uses unified Student Mate persona with flexible teaching styles
 *
 * Extra methods: detectRequestedPersona()
 * Overrides buildSystemPrompt() to inject detected persona style.
 */

const AGENT_CONFIG = {
    name: 'Persona Switch Agent',
    specialization: '🎭 Adaptive Teaching Styles',
    temperature: 0.8,
    maxTokens: 1500,

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

class PersonaSwitchAgent extends BaseAgent {
    constructor() {
        super(AGENT_CONFIG);
        // Store last detected persona for buildSystemPrompt
        this._detectedPersona = null;
    }

    async handle(message, context = '', userPatterns = {}, profile = {}, toolSchemas = []) {
        // Detect persona before building system prompt (used in buildSystemPrompt override)
        this._detectedPersona = this.detectRequestedPersona(message);
        return super.handle(message, context, userPatterns, profile, toolSchemas);
    }

    /** Override to inject detected persona style into system prompt. */
    buildSystemPrompt(profile, context, userPatterns) {
        let prompt = super.buildSystemPrompt(profile, context, userPatterns);
        if (this._detectedPersona) {
            const style = this.config.personas[this._detectedPersona].style;
            // Insert persona style before the tone/continuity suffixes
            prompt = prompt.replace(
                this.config.agentInstructions,
                this.config.agentInstructions + `\n\nCURRENT ACTIVE STYLE:\n${style}`
            );
        }
        return prompt;
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

        return null;
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
