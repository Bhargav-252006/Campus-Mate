const {callLLM} = require('../utils/llmService');
const {getStudentMatePersona, getAdaptiveTone, getContinuityPrompt} = require('./studentMatePersona');
const logger = require('../utils/logger');

/**
 * ACADEMIC AGENT - Specialized for Educational Content
 * Uses unified Campus Mate persona for consistent, friendly communication
 */

const AGENT_CONFIG = {
    name: 'Academic Agent',
    specialization: '📚 Academic Tutoring & Learning',
    temperature: 0.7,
    maxTokens: 2000,

    topics: [
        'mathematics', 'physics', 'chemistry', 'biology',
        'computer science', 'programming', 'data structures',
        'algorithms', 'history', 'geography', 'economics',
        'literature', 'language', 'engineering'
    ],

    // Agent-specific instructions (combined with core persona)
    agentInstructions: `
╔═══════════════════════════════════════════════════════════╗
║           ACADEMIC TUTORING SPECIALIZATION                ║
╚═══════════════════════════════════════════════════════════╝

YOUR ACADEMIC FOCUS:
✓ Explaining concepts in ANY subject (math, science, programming, etc.)
✓ Step-by-step problem solving
✓ Real-world analogies and examples
✓ Homework and assignment help
✓ Making complex topics simple and fun

TEACHING APPROACH (as Campus Mate):
1. Greet warmly if it's a new topic
2. Start with a simple, clear explanation
3. Use relatable analogies (Netflix, food, games, etc.)
4. Break complex topics into bite-sized steps
5. Include practical examples
6. End with a key takeaway + offer to help more

FORMAT YOUR RESPONSES:
- Use **bold** for important terms
- Use numbered lists for steps
- Use code blocks for programming
- Keep it concise but thorough
- Add encouraging emojis where appropriate 📝✨

EXAMPLE TEACHING STYLE:
"Great question! 😊 Let me break this down for you...

**What is [concept]?**
Think of it like [relatable analogy]...

**How it works:**
1. First... 
2. Then...
3. Finally...

**Quick Example:**
[Practical example]

**Key Takeaway:** [One sentence summary]

Want me to explain any part in more detail? 🎯"`
};

class AcademicAgent {
    constructor() {
        this.config = AGENT_CONFIG;
    }

    async handle(message, context = '', userPatterns = {}, profile = {}) {
        logger.agent(this.config.name, 'Processing academic query...');

        // Build unified Campus Mate persona + agent specialization
        const personaPrompt = getStudentMatePersona(profile, context, this.config.specialization);
        const tonePrompt = getAdaptiveTone(userPatterns);
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
                taskType: 'teaching'  // Use main model for educational content
            }
        );

        if (llmResponse) {
            return llmResponse;
        }

        // Friendly fallback
        return this.getFriendlyFallback(message);
    }

    buildPrompt(message, userPatterns) {
        let prompt = '';

        if (userPatterns?.learningStyle) {
            prompt += `Note: This student prefers ${userPatterns.learningStyle} learning.\n\n`;
        }

        prompt += `Student's Question: ${message}`;
        return prompt;
    }

    getFriendlyFallback(message) {
        return `Hey! 😊 I'd love to help you with that question. Unfortunately, I'm having a small technical hiccup right now. 

Could you try asking again in a moment? Or if you want, rephrase it slightly - sometimes that helps!

I'm here for you! 💪`;
    }

}

module.exports = new AcademicAgent();
