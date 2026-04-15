const {BaseAgent} = require('./BaseAgent');

/**
 * COGNITIVE LOAD AGENT - Specialized for Workload & Focus Management
 * Uses unified Student Mate persona for supportive productivity guidance
 */

const AGENT_CONFIG = {
    name: 'Cognitive Load Agent',
    specialization: '⚡ Productivity & Time Management',
    temperature: 0.6,
    maxTokens: 1500,

    topics: [
        'overwhelm', 'too much', 'time management', 'prioritize',
        'deadline', 'focus', 'distraction', 'procrastination',
        'burnout', 'productivity', 'schedule', 'planning'
    ],

    agentInstructions: `
╔═══════════════════════════════════════════════════════════╗
║         PRODUCTIVITY & FOCUS SPECIALIZATION               ║
╚═══════════════════════════════════════════════════════════╝

YOUR PRODUCTIVITY FOCUS:
✓ Time management strategies
✓ Prioritization techniques
✓ Breaking down overwhelming tasks
✓ Focus techniques (Pomodoro, time-boxing)
✓ Dealing with procrastination
✓ Preventing and recovering from burnout
✓ Study scheduling and planning

CORE FRAMEWORKS YOU USE:

1. **EISENHOWER MATRIX**:
   - Urgent + Important → DO NOW
   - Important + Not Urgent → SCHEDULE
   - Urgent + Not Important → MINIMIZE
   - Neither → DROP

2. **POMODORO TECHNIQUE**:
   - 25 min focused work → 5 min break
   - After 4 rounds → 15-30 min longer break

3. **2-MINUTE RULE**: If it takes less than 2 minutes, do it now

4. **EAT THE FROG**: Do the hardest/most important task first

RESPONSE APPROACH (as Student Mate):
1. Acknowledge the overwhelm - it's valid! 
2. Ask clarifying questions if needed
3. Provide SPECIFIC, ACTIONABLE steps
4. Use clear structure (numbered lists)
5. Give them ONE clear "next action" to start with
6. Be encouraging and supportive 💪

Remember: Less is more. Help them SIMPLIFY, not add more stress!`
};

class CognitiveLoadAgent extends BaseAgent {
    constructor() {
        super(AGENT_CONFIG);
    }

    buildPrompt(message, userPatterns) {
        let prompt = '';
        if (userPatterns?.currentWorkload) {
            prompt += `Note: Student's current workload is ${userPatterns.currentWorkload}.\n\n`;
        }
        prompt += `Student says: ${message}`;
        return prompt;
    }

    getFriendlyFallback(message, profile = {}) {
        const name = profile?.name;
        const nameGreeting = name ? `${name}, ` : '';

        return `${nameGreeting}I totally get it - feeling overwhelmed is tough! 💪

Let me help you break things down:

**Quick Steps:**
1. **Brain dump**: Write down EVERYTHING that's on your mind
2. **Pick the TOP 3**: What's actually most important/urgent?
3. **Start with ONE**: Choose the smallest task from your top 3

**Try the Pomodoro:**
- 25 minutes focused work
- 5 minute break
- Repeat!

What's the biggest thing weighing on you right now? Let's tackle it together! 🎯`;
    }
}

module.exports = new CognitiveLoadAgent();
