/**
 * 🔍 MEMORY EXTRACTION PIPELINE
 * 
 * Smart extraction of USEFUL information from conversations.
 * Filters out noise and temporary states.
 * 
 * WHAT WE EXTRACT:
 * ✅ Profile info (name, grade, institution)
 * ✅ Subjects & academic interests
 * ✅ Goals & aspirations
 * ✅ Preferences (tone, style)
 * ✅ Important facts mentioned
 * 
 * WHAT WE IGNORE:
 * ❌ Temporary emotions ("I'm stressed today")
 * ❌ Small talk ("how are you")
 * ❌ Generic statements
 * ❌ Bot responses (only extract from user)
 */

const logger = require('./logger');

class MemoryExtractionPipeline {
    constructor() {
        // Patterns for extraction
        this.patterns = {
            // Name extraction
            name: [
                /(?:my name is|i'm|i am|call me|this is)\s+([A-Z][a-z]+)/i,
                /(?:^|\s)([A-Z][a-z]+)\s+here/i
            ],

            // Grade/Year extraction
            grade: [
                /(?:i'm in|i am in|studying in)\s+([\w\s]+(?:year|grade|semester|class))/i,
                /(\d+(?:st|nd|rd|th)\s+(?:year|grade|semester))/i,
                /(freshman|sophomore|junior|senior)/i,
                /(undergrad|graduate|masters|phd|doctoral)/i
            ],

            // Institution extraction
            institution: [
                /(?:i study at|i'm at|i go to|studying at|student at)\s+([A-Z][\w\s]+(?:University|College|Institute|School))/i,
                /(?:from)\s+([A-Z][\w\s]+(?:University|College|Institute|School))/i
            ],

            // Subject extraction keywords
            subjects: [
                'mathematics', 'math', 'physics', 'chemistry', 'biology',
                'computer science', 'programming', 'coding', 'english',
                'history', 'geography', 'economics', 'psychology',
                'engineering', 'medicine', 'law', 'business', 'accounting',
                'statistics', 'calculus', 'algebra', 'geometry',
                'data science', 'machine learning', 'artificial intelligence',
                'literature', 'philosophy', 'sociology', 'political science'
            ],

            // Goals extraction
            goals: [
                /(?:i want to|my goal is|i'm trying to|i aim to|planning to|hoping to)\s+(.+?)(?:\.|$)/i,
                /(?:dream is to|aspire to|working towards?)\s+(.+?)(?:\.|$)/i
            ],

            // Preference indicators
            preferences: {
                tone: {
                    'casual': ['casual', 'informal', 'friendly', 'chill', 'relaxed'],
                    'formal': ['formal', 'professional', 'serious'],
                    'supportive': ['supportive', 'encouraging', 'motivating']
                },
                explanationStyle: {
                    'simple': ['simple', 'easy', 'basic', 'eli5', "like i'm 5", 'dumbed down'],
                    'detailed': ['detailed', 'in-depth', 'thorough', 'comprehensive'],
                    'examples': ['with examples', 'show me examples', 'practical examples'],
                    'step-by-step': ['step by step', 'step-by-step', 'one at a time']
                }
            },

            // Strength indicators
            strengths: [
                /(?:i'm good at|i excel at|my strength is|i'm strong in)\s+(.+?)(?:\.|$)/i
            ],

            // Weakness indicators
            weakAreas: [
                /(?:i struggle with|i'm bad at|weak in|having trouble with|can't understand)\s+(.+?)(?:\.|$)/i,
                /(?:i don't get|i don't understand|confused about)\s+(.+?)(?:\.|$)/i
            ]
        };

        // Words to ignore (temporary states)
        this.temporaryStateWords = [
            'today', 'right now', 'at the moment', 'currently feeling',
            'just now', 'this minute', 'temporarily'
        ];

        // Minimum message length to consider for extraction
        this.MIN_MESSAGE_LENGTH = 10;
    }

    /**
     * 🚀 MAIN METHOD: Extract useful info from a message
     * 
     * @param {string} text - User message text
     * @param {object} existingProfile - Current profile to avoid duplicates
     * @returns {object} - Extracted data { profile: {}, preferences: {}, facts: [] }
     */
    extract(text, existingProfile = {}) {
        if (!text || text.length < this.MIN_MESSAGE_LENGTH) {
            return {profile: {}, preferences: {}, facts: []};
        }

        const lowerText = text.toLowerCase();
        const extracted = {
            profile: {},
            preferences: {},
            facts: []
        };

        // Skip if temporary state
        if (this.isTemporaryState(lowerText)) {
            logger.debug('Skipping temporary state message');
            return extracted;
        }

        // Extract profile info
        extracted.profile = this.extractProfile(text, lowerText, existingProfile);

        // Extract preferences
        extracted.preferences = this.extractPreferences(lowerText);

        // Extract important facts
        extracted.facts = this.extractFacts(text);

        const hasExtracted = Object.keys(extracted.profile).length > 0 ||
            Object.keys(extracted.preferences).length > 0 ||
            extracted.facts.length > 0;

        if (hasExtracted) {
            logger.debug('Extracted from message', extracted);
        }

        return extracted;
    }

    /**
     * Extract profile information (name, grade, subjects, etc.)
     */
    extractProfile(text, lowerText, existingProfile) {
        const profile = {};

        // Extract name (only if not already known)
        if (!existingProfile?.name) {
            for (const pattern of this.patterns.name) {
                const match = text.match(pattern);
                if (match && match[1] && match[1].length >= 2 && match[1].length <= 20) {
                    profile.name = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
                    break;
                }
            }
        }

        // Extract grade/year
        for (const pattern of this.patterns.grade) {
            const match = text.match(pattern);
            if (match && match[1]) {
                profile.grade = match[1].trim();
                break;
            }
        }

        // Extract institution
        for (const pattern of this.patterns.institution) {
            const match = text.match(pattern);
            if (match && match[1]) {
                profile.institution = match[1].trim();
                break;
            }
        }

        // Extract subjects mentioned
        const mentionedSubjects = [];
        for (const subject of this.patterns.subjects) {
            if (lowerText.includes(subject)) {
                // Check if it's in academic context
                const academicContext = ['study', 'learn', 'class', 'exam', 'test', 'homework',
                    'assignment', 'course', 'major', 'taking', 'enrolled'];
                if (academicContext.some(ctx => lowerText.includes(ctx)) ||
                    lowerText.includes(subject + ' class') ||
                    lowerText.includes(subject + ' exam')) {
                    mentionedSubjects.push(subject);
                }
            }
        }
        if (mentionedSubjects.length > 0) {
            profile.subjects = mentionedSubjects;
        }

        // Extract goals
        for (const pattern of this.patterns.goals) {
            const match = text.match(pattern);
            if (match && match[1] && match[1].length >= 5 && match[1].length <= 100) {
                profile.goals = [{
                    goal: match[1].trim(),
                    addedAt: new Date().toISOString()
                }];
                break;
            }
        }

        // Extract strengths
        for (const pattern of this.patterns.strengths) {
            const match = text.match(pattern);
            if (match && match[1]) {
                profile.strengths = [match[1].trim()];
                break;
            }
        }

        // Extract weak areas
        for (const pattern of this.patterns.weakAreas) {
            const match = text.match(pattern);
            if (match && match[1]) {
                profile.weakAreas = [match[1].trim()];
                break;
            }
        }

        return profile;
    }

    /**
     * Extract user preferences (tone, style, etc.)
     */
    extractPreferences(lowerText) {
        const preferences = {};

        // Extract tone preference
        for (const [tone, keywords] of Object.entries(this.patterns.preferences.tone)) {
            if (keywords.some(kw => lowerText.includes(kw))) {
                preferences.tone = tone;
                break;
            }
        }

        // Extract explanation style preference
        for (const [style, keywords] of Object.entries(this.patterns.preferences.explanationStyle)) {
            if (keywords.some(kw => lowerText.includes(kw))) {
                preferences.explanationStyle = style;
                break;
            }
        }

        // Detect if they want more/less detail
        if (lowerText.includes('more detail') || lowerText.includes('elaborate')) {
            preferences.detailLevel = 'high';
        } else if (lowerText.includes('brief') || lowerText.includes('short') || lowerText.includes('quick')) {
            preferences.detailLevel = 'low';
        }

        // Detect emoji preference
        if (lowerText.includes('no emoji') || lowerText.includes('without emoji')) {
            preferences.emoji = false;
        }

        return preferences;
    }

    /**
     * Extract important facts worth remembering
     */
    extractFacts(text) {
        const facts = [];

        // Exam mentions
        const examMatch = text.match(/(?:exam|test|quiz)\s+(?:on|is|in|for)\s+(.+?)(?:\.|,|$)/i);
        if (examMatch) {
            facts.push({
                type: 'exam',
                content: examMatch[1].trim(),
                extractedAt: new Date().toISOString()
            });
        }

        // Deadline mentions
        const deadlineMatch = text.match(/(?:deadline|due|submit)\s+(?:on|by|is)\s+(.+?)(?:\.|,|$)/i);
        if (deadlineMatch) {
            facts.push({
                type: 'deadline',
                content: deadlineMatch[1].trim(),
                extractedAt: new Date().toISOString()
            });
        }

        return facts;
    }

    /**
     * Check if message is about temporary state (should not be stored long-term)
     */
    isTemporaryState(lowerText) {
        // Very short messages are usually temporary
        if (lowerText.length < 15) return false;  // Still process short messages

        // Check for temporary indicators
        const hasTemporaryIndicator = this.temporaryStateWords.some(word => lowerText.includes(word));

        // Check if it's ONLY about current emotions (no other info)
        const emotionWords = ['stressed', 'anxious', 'happy', 'sad', 'tired', 'bored'];
        const isOnlyEmotion = emotionWords.some(e => lowerText.includes(e)) &&
            !lowerText.includes('always') &&
            !lowerText.includes('usually') &&
            lowerText.length < 50;

        return hasTemporaryIndicator && isOnlyEmotion;
    }

    /**
     * Merge extracted data with existing profile
     */
    mergeWithExisting(existing, extracted) {
        const merged = {...existing};

        // Merge profile
        for (const [key, value] of Object.entries(extracted.profile)) {
            if (key === 'subjects' && merged.subjects) {
                // Merge subjects without duplicates
                const existingSubjects = new Set(merged.subjects.map(s => s.toLowerCase()));
                value.forEach(s => {
                    if (!existingSubjects.has(s.toLowerCase())) {
                        merged.subjects.push(s);
                    }
                });
            } else if (key === 'goals' && merged.goals) {
                // Append goals
                merged.goals = [...merged.goals, ...value].slice(-5);  // Keep last 5
            } else if (key === 'strengths' && merged.strengths) {
                // Merge strengths
                merged.strengths = [...new Set([...merged.strengths, ...value])];
            } else if (key === 'weakAreas' && merged.weakAreas) {
                // Merge weak areas
                merged.weakAreas = [...new Set([...merged.weakAreas, ...value])];
            } else if (!merged[key]) {
                // Only add if not already set
                merged[key] = value;
            }
        }

        return merged;
    }

    /**
     * Generate conversation summary from messages
     * Extracts key points and compresses
     */
    generateSummary(messages, maxLength = 500) {
        if (!messages || messages.length === 0) return '';

        const userMessages = messages
            .filter(m => m.sender === 'user')
            .map(m => m.text)
            .slice(-10);  // Last 10 user messages

        // Extract key topics
        const topics = new Set();
        const actions = [];

        userMessages.forEach(msg => {
            const lower = msg.toLowerCase();

            // Detect topics
            this.patterns.subjects.forEach(subject => {
                if (lower.includes(subject)) topics.add(subject);
            });

            // Detect questions/requests
            if (lower.includes('?') || lower.includes('help') || lower.includes('explain')) {
                actions.push(msg.substring(0, 50));
            }
        });

        let summary = '';

        if (topics.size > 0) {
            summary += `Topics discussed: ${[...topics].join(', ')}. `;
        }

        if (actions.length > 0) {
            summary += `Recent requests: ${actions.slice(-3).join('; ')}`;
        }

        return summary.substring(0, maxLength);
    }
}

// Export singleton
module.exports = new MemoryExtractionPipeline();
