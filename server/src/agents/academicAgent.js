const {BaseAgent} = require('./BaseAgent');

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

class AcademicAgent extends BaseAgent {
    constructor() {
        super(AGENT_CONFIG);
    }

    buildPrompt(message, userPatterns) {
        let prompt = '';
        if (userPatterns?.learningStyle) {
            prompt += `Note: This student prefers ${userPatterns.learningStyle} learning.\n\n`;
        }
        prompt += `Student's Question: ${message}`;
        return prompt;
    }

    getFriendlyFallback(message, profile = {}) {
        return `Hey! 😊 I'd love to help you with that question. Unfortunately, I'm having a small technical hiccup right now. 

Could you try asking again in a moment? Or if you want, rephrase it slightly - sometimes that helps!

I'm here for you! 💪`;
    }
}

module.exports = new AcademicAgent();
