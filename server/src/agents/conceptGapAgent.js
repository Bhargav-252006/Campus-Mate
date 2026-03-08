const {callLLM} = require('../utils/llmService');
const {getStudentMatePersona, getAdaptiveTone, getContinuityPrompt} = require('./studentMatePersona');

/**
 * CONCEPT GAP AGENT - Specialized for Finding Missing Knowledge
 * Uses unified Student Mate persona for supportive diagnostic learning
 */

const AGENT_CONFIG = {
    name: 'Concept Gap Agent',
    specialization: '🔍 Finding & Filling Knowledge Gaps',
    temperature: 0.7,
    maxTokens: 1500,

    topics: [
        'confused', "don't understand", "don't get", 'unclear',
        'lost', 'missing something', 'gap', 'prerequisite',
        'fundamentals', 'basics', 'foundation'
    ],

    // Common prerequisite chains (what topic requires what prior knowledge)
    prerequisiteChains: {
        calculus: ['algebra', 'functions', 'limits', 'trigonometry'],
        derivatives: ['limits', 'slopes', 'rate of change'],
        integrals: ['derivatives', 'area', 'summation'],
        recursion: ['functions', 'stack', 'base case'],
        oop: ['functions', 'data types', 'variables'],
        pointers: ['memory', 'variables', 'addresses'],
        sql: ['tables', 'relationships', 'basic logic'],
        statistics: ['basic math', 'probability', 'averages']
    },

    agentInstructions: `
╔═══════════════════════════════════════════════════════════╗
║          KNOWLEDGE GAP DIAGNOSIS SPECIALIZATION           ║
╚═══════════════════════════════════════════════════════════╝

YOUR DIAGNOSTIC FOCUS:
✓ Finding what prerequisite knowledge is missing
✓ Asking targeted questions to find the exact gap
✓ Explaining foundational concepts they missed
✓ Building bridges from what they know to what they need
✓ Creating "aha!" breakthrough moments ✨

DIAGNOSTIC APPROACH (like a friendly doctor):

1. **SYMPTOM** - What topic are they confused about?
2. **PROBE** - Ask ONE targeted question to find the gap
3. **DIAGNOSE** - Identify the missing prerequisite
4. **PRESCRIBE** - Explain JUST the missing piece
5. **VERIFY** - Check if the gap is filled

KEY INSIGHT:
When students are confused about topic Y, they often don't understand prerequisite topic X. Your job is to find X!

EXAMPLE:
- Student: "I don't understand derivatives"
- WRONG: Launch into explaining derivatives
- RIGHT: Ask "Do you understand what a limit is? What about rate of change?"
- Find they don't understand limits → Explain limits first → Then derivatives click! ✨

DIAGNOSTIC QUESTIONS TO USE:
- "Before we go further, can you explain [prerequisite] in your own words?"
- "What do you understand so far about this?"
- "Where exactly does it stop making sense?"
- "Have you learned about [prerequisite] before?"

RESPONSE APPROACH (as Student Mate):
1. Acknowledge their confusion warmly (it's normal!)
2. Ask ONE clarifying question at a time
3. Wait for them to identify where confusion starts
4. Explain the MISSING piece simply
5. Use analogies to connect to what they already know
6. Celebrate when they get it! 🎉

NEVER:
✗ Dump a full explanation without diagnosing first
✗ Assume you know what they're missing
✗ Make them feel dumb for having gaps

Remember: Everyone has gaps. You're a friendly detective, not a judge! 🔍`
};

class ConceptGapAgent {
    constructor() {
        this.config = AGENT_CONFIG;
    }

    async handle(message, context = '', userPatterns = {}, profile = {}, toolSchemas = []) {
        console.log(`[${this.config.name}] Diagnosing concept gaps...`);

        // Build unified Student Mate persona + agent specialization
        const personaPrompt = getStudentMatePersona(profile, context, this.config.specialization);
        const tonePrompt = getAdaptiveTone(userPatterns);
        const continuityPrompt = getContinuityPrompt();

        const fullSystemPrompt = personaPrompt + this.config.agentInstructions + tonePrompt + continuityPrompt;

        // Build user prompt with topic context
        const userPrompt = this.buildPrompt(message, userPatterns);

        // Call LLM with unified persona
        const llmResponse = await callLLM(
            fullSystemPrompt,
            userPrompt,
            {
                maxTokens: this.config.maxTokens,
                temperature: this.config.temperature,
                taskType: 'heavy_reasoning',
                toolSchemas
            }
        );

        if (llmResponse) {
            return llmResponse;
        }

        // Friendly fallback
        return this.getFriendlyFallback(message, profile);
    }

    buildPrompt(message, userPatterns) {
        let prompt = '';

        // Add known knowledge gaps if tracked
        if (userPatterns?.knowledgeGaps && userPatterns.knowledgeGaps.length > 0) {
            prompt += `Note: This student has previously shown gaps in: ${userPatterns.knowledgeGaps.join(', ')}.\n\n`;
        }

        prompt += `Student says: ${message}`;
        return prompt;
    }

    getFriendlyFallback(message, profile = {}) {
        const name = profile?.name;
        const nameGreeting = name ? `${name}, ` : '';

        return `${nameGreeting}I totally get it - sometimes a topic just doesn't click! 😊

**Let's figure out where the confusion starts:**

Usually when something doesn't make sense, it's because there's a foundational piece missing. It's like trying to build the 2nd floor before the 1st floor is solid!

**Help me help you:**
1. What topic is confusing you?
2. What parts DO make sense so far?
3. Where exactly does it start getting fuzzy?

Once we find the gap, I'll help you fill it - and then the rest will click! ✨

What are you trying to understand?`;
    }

    // Check if a topic has known prerequisites
    getPrerequisites(topic) {
        const lowerTopic = topic.toLowerCase();
        for (const [key, prereqs] of Object.entries(this.config.prerequisiteChains)) {
            if (lowerTopic.includes(key)) {
                return prereqs;
            }
        }
        return [];
    }
}

module.exports = new ConceptGapAgent();



