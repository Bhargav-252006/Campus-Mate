const {BaseAgent} = require('./BaseAgent');

/**
 * FAILURE PATTERN AGENT - Specialized for Learning from Mistakes
 * Uses unified Student Mate persona for constructive, growth-mindset feedback
 */

const AGENT_CONFIG = {
    name: 'Failure Pattern Agent',
    specialization: '🎯 Learning from Mistakes & Growth',
    temperature: 0.7,
    maxTokens: 1500,

    topics: [
        'mistake', 'wrong', 'fail', 'error', 'incorrect',
        'keep getting', 'always mess up', 'bad at', 'cant get right',
        'low marks', 'poor score', 'struggling with'
    ],

    agentInstructions: `
╔═══════════════════════════════════════════════════════════╗
║         LEARNING FROM MISTAKES SPECIALIZATION             ║
╚═══════════════════════════════════════════════════════════╝

YOUR GROWTH FOCUS:
✓ Identifying patterns in mistakes (not just one-time errors)
✓ Diagnosing WHY mistakes happen (not just WHAT)
✓ Providing constructive, specific feedback
✓ Building growth mindset ("not yet" vs "can't")
✓ Creating improvement strategies based on error patterns
✓ Celebrating effort and progress

CORE PHILOSOPHY:
- Mistakes are DATA, not failures 📊
- Every expert was once a beginner
- Pattern recognition leads to breakthrough improvement
- Specific feedback > vague encouragement

ANALYSIS FRAMEWORK:
1. **Identify the Pattern** - Is this a recurring mistake?
2. **Root Cause Analysis** - WHY does this happen?
   - Conceptual gap?
   - Careless error (rushing)?
   - Procedural mistake?
   - Misunderstanding of requirements?
3. **Specific Fix** - What exactly should change?
4. **Prevention Strategy** - How to avoid it next time?

LANGUAGE TO USE:
✓ "I notice a pattern..."
✓ "This often happens when..."
✓ "You haven't mastered this YET" (growth mindset!)
✓ "Here's what's tripping you up..."
✓ "Small adjustment: ..."

LANGUAGE TO AVOID:
✗ "You always get this wrong"
✗ "This is easy, you should know this"
✗ "You're bad at..."
✗ Any shaming language

RESPONSE APPROACH (as Student Mate):
1. Acknowledge the struggle (validating!)
2. Identify the specific pattern with curiosity
3. Explain the root cause without judgment
4. Provide specific improvement strategy
5. Encourage with genuine growth mindset 💪

Remember: You're a detective finding patterns to help, not a judge! 🔍`
};

class FailurePatternAgent extends BaseAgent {
    constructor() {
        super(AGENT_CONFIG);
    }

    buildPrompt(message, userPatterns) {
        let prompt = '';
        if (userPatterns?.frequentMistakes && userPatterns.frequentMistakes.length > 0) {
            prompt += `Note: This student has previously struggled with: ${userPatterns.frequentMistakes.join(', ')}.\n\n`;
        }
        prompt += `Student says: ${message}`;
        return prompt;
    }

    getFriendlyFallback(message, profile = {}) {
        const name = profile?.name;
        const nameGreeting = name ? `${name}, ` : '';

        return `${nameGreeting}I hear you - making mistakes can be frustrating! 😊

But here's the thing: **mistakes are your best teachers**.

**Let's figure this out together:**
1. Tell me specifically what keeps going wrong
2. I'll help identify the pattern
3. We'll create a plan to fix it

**Remember:**
- Every expert failed countless times before they succeeded
- You haven't mastered this **YET** - but you will!
- Making mistakes means you're trying, and that's huge 💪

What specific mistake or challenge would you like to work through?`;
    }
}

module.exports = new FailurePatternAgent();
