/**
 * 🔧 PROMPT ASSEMBLER - Centralized Prompt Builder
 * 
 * This is the SINGLE SOURCE OF TRUTH for building LLM prompts.
 * Every agent uses this to ensure consistent, personalized prompts.
 * 
 * PROMPT STRUCTURE:
 * ┌─────────────────────────────────────────┐
 * │ 1. System Prompt (agent-specific)       │
 * │ 2. Profile Memory (who user is)         │
 * │ 3. Preference Memory (how they like)    │
 * │ 4. Summary Memory (past context)        │
 * │ 5. Recent Messages (last 3-5)           │
 * │ 6. Current User Message                 │
 * └─────────────────────────────────────────┘
 */

const logger = require('./logger');

class PromptAssembler {
    constructor() {
        this.MAX_RECENT_MESSAGES = 5;
        this.MAX_SUMMARY_CHARS = 500;
        this.MAX_TOTAL_CHARS = 6000;  // Keep under token limits
    }

    /**
     * 🚀 MAIN METHOD: Assemble a complete prompt for LLM
     * 
     * @param {object} options - Configuration object
     * @param {string} options.agentSystemPrompt - The agent's specific system prompt
     * @param {object} options.profile - User's profile memory
     * @param {object} options.preferences - User's preference memory
     * @param {string} options.summary - Conversation summary
     * @param {array} options.recentMessages - Recent message history
     * @param {string} options.currentMessage - Current user message
     * @param {object} options.patterns - Detected user patterns
     * @returns {object} - { systemPrompt, userMessage, messages }
     */
    assemble({
        agentSystemPrompt = '',
        profile = {},
        preferences = {},
        summary = '',
        recentMessages = [],
        currentMessage = '',
        patterns = {}
    }) {
        logger.debug('Assembling prompt...', {
            hasProfile: !!profile?.name,
            hasPreferences: Object.keys(preferences).length > 0,
            hasSummary: !!summary,
            recentCount: recentMessages.length
        });

        // Build the complete system prompt
        const systemPrompt = this.buildSystemPrompt({
            agentSystemPrompt,
            profile,
            preferences,
            summary,
            patterns
        });

        // Build conversation history for context
        const messages = this.buildMessageHistory(recentMessages);

        return {
            systemPrompt,
            userMessage: currentMessage,
            messages,  // For LLM services that support conversation history
            totalChars: systemPrompt.length + currentMessage.length
        };
    }

    /**
     * Build the complete system prompt with all memory
     */
    buildSystemPrompt({agentSystemPrompt, profile, preferences, summary, patterns}) {
        let prompt = '';

        // 1. Agent-specific system prompt
        prompt += agentSystemPrompt;

        // 2. Profile Memory (WHO the user is)
        prompt += this.buildProfileSection(profile);

        // 3. Preference Memory (HOW they like to be helped)
        prompt += this.buildPreferenceSection(preferences);

        // 4. Pattern Detection (current state)
        prompt += this.buildPatternSection(patterns);

        // 5. Summary Memory (past context)
        prompt += this.buildSummarySection(summary);

        // 6. Response guidelines
        prompt += this.buildResponseGuidelines();

        // 7. Enforce total character budget so Qwen3 8B doesn't get
        //    oversized context (causes slow responses & wasted tokens).
        //    Truncate from the end — agent instructions at top are kept.
        if (prompt.length > this.MAX_TOTAL_CHARS) {
            logger.debug(`Prompt truncated: ${prompt.length} → ${this.MAX_TOTAL_CHARS} chars`);
            prompt = prompt.substring(0, this.MAX_TOTAL_CHARS);
        }

        return prompt;
    }

    /**
     * Build PROFILE section - WHO the user is
     */
    buildProfileSection(profile) {
        if (!profile || Object.keys(profile).length === 0) {
            return '';
        }

        let section = `
╔═══════════════════════════════════════════════════════════╗
║              📋 STUDENT PROFILE (REMEMBER!)               ║
╚═══════════════════════════════════════════════════════════╝
`;
        if (profile.name) section += `👤 Name: ${profile.name}\n`;
        if (profile.grade) section += `🎓 Grade/Year: ${profile.grade}\n`;
        if (profile.subjects?.length > 0) section += `📚 Subjects: ${profile.subjects.join(', ')}\n`;
        if (profile.institution) section += `🏫 Institution: ${profile.institution}\n`;
        if (profile.goals?.length > 0) {
            const recentGoals = profile.goals.slice(-3).map(g => g.text || g.goal || (typeof g === 'string' ? g : '')).filter(Boolean).join('; ');
            section += `🎯 Goals: ${recentGoals}\n`;
        }
        if (profile.strengths?.length > 0) section += `💪 Strengths: ${profile.strengths.join(', ')}\n`;
        if (profile.weakAreas?.length > 0) section += `📈 Areas to improve: ${profile.weakAreas.join(', ')}\n`;

        return section + '\n';
    }

    /**
     * Build PREFERENCE section - HOW they like to be helped
     */
    buildPreferenceSection(preferences) {
        if (!preferences || Object.keys(preferences).length === 0) {
            return '';
        }

        let section = `
╔═══════════════════════════════════════════════════════════╗
║              ⚙️ USER PREFERENCES                          ║
╚═══════════════════════════════════════════════════════════╝
`;
        if (preferences.tone) section += `🗣️ Preferred tone: ${preferences.tone}\n`;
        if (preferences.explanationStyle) section += `📝 Explanation style: ${preferences.explanationStyle}\n`;
        if (preferences.detailLevel) section += `📊 Detail level: ${preferences.detailLevel}\n`;
        if (preferences.language) section += `🌐 Language: ${preferences.language}\n`;
        if (preferences.emoji !== undefined) section += `😊 Use emojis: ${preferences.emoji ? 'Yes' : 'Minimal'}\n`;
        if (preferences.responseLength) section += `📏 Response length: ${preferences.responseLength}\n`;

        return section + '\n';
    }

    /**
     * Build PATTERN section - Current detected state
     */
    buildPatternSection(patterns) {
        if (!patterns || Object.keys(patterns).length === 0) {
            return '';
        }

        let section = `
╔═══════════════════════════════════════════════════════════╗
║              🔍 DETECTED PATTERNS                         ║
╚═══════════════════════════════════════════════════════════╝
`;
        if (patterns.stressLevel && patterns.stressLevel !== 'normal') {
            const emoji = patterns.stressLevel === 'high' ? '🚨' : '⚠️';
            section += `${emoji} Stress Level: ${patterns.stressLevel.toUpperCase()}\n`;
            section += `   → Be extra supportive and gentle\n`;
        }
        if (patterns.currentMood && patterns.currentMood !== 'neutral') {
            section += `😊 Current Mood: ${patterns.currentMood}\n`;
        }
        if (patterns.frequentTopics?.length > 0) {
            section += `📌 Frequent topics: ${patterns.frequentTopics.join(', ')}\n`;
        }
        if (patterns.studyTime) {
            section += `⏰ Preferred study time: ${patterns.studyTime}\n`;
        }

        return section + '\n';
    }

    /**
     * Build SUMMARY section - Past conversation context
     */
    buildSummarySection(summary) {
        if (!summary || summary.trim() === '') {
            return '';
        }

        // Truncate if too long (keep beginning which is most relevant)
        const truncatedSummary = summary.length > this.MAX_SUMMARY_CHARS
            ? summary.substring(0, this.MAX_SUMMARY_CHARS) + '...'
            : summary;

        return `
╔═══════════════════════════════════════════════════════════╗
║              📜 CONVERSATION SUMMARY                      ║
╚═══════════════════════════════════════════════════════════╝
${truncatedSummary}

`;
    }

    /**
     * Build response guidelines
     */
    buildResponseGuidelines() {
        return `
╔═══════════════════════════════════════════════════════════╗
║              📝 RESPONSE GUIDELINES                       ║
╚═══════════════════════════════════════════════════════════╝
• Use the student's name naturally if known
• Reference their goals/subjects when relevant
• Keep responses focused and helpful
• Use markdown formatting for clarity (bold, lists, headers)
• Add appropriate emojis to be friendly 😊
• Ask follow-up questions to show engagement
• NEVER make up information about them
`;
    }

    /**
     * Build message history array for LLM
     */
    buildMessageHistory(recentMessages) {
        if (!recentMessages || recentMessages.length === 0) {
            return [];
        }

        // Take only the most recent messages
        const recent = recentMessages.slice(-this.MAX_RECENT_MESSAGES);

        return recent
            .filter(msg => msg && msg.sender && msg.text)
            .map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'assistant',
                content: msg.text || ''
            }));
    }

    /**
     * Quick method for simple prompts (backward compatibility)
     */
    simple(systemPrompt, userMessage) {
        return {
            systemPrompt,
            userMessage,
            messages: [],
            totalChars: systemPrompt.length + userMessage.length
        };
    }
}

// Export singleton
module.exports = new PromptAssembler();
