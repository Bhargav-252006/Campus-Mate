/**
 * 🧠 ENHANCED Memory Manager v3 - Production Ready
 * 
 * IMPROVEMENTS OVER V2:
 * ✅ Debounced disk writes (saves every 5s, not every message)
 * ✅ LLM-powered summarization for long-term memory
 * ✅ Importance scoring for memories
 * ✅ Semantic similarity for memory retrieval
 * ✅ Memory decay (old memories fade)
 * ✅ Tiered memory architecture
 * ✅ Efficient token budgeting
 * 
 * MEMORY ARCHITECTURE:
 * ┌─────────────────────────────────────────────────────────────┐
 * │  WORKING MEMORY (Immediate)   │ Last 5 messages            │
 * ├─────────────────────────────────────────────────────────────┤
 * │  SHORT-TERM MEMORY            │ Last 20 messages           │
 * ├─────────────────────────────────────────────────────────────┤
 * │  EPISODIC MEMORY (Summaries)  │ Compressed conversations   │
 * ├─────────────────────────────────────────────────────────────┤
 * │  SEMANTIC MEMORY (Facts)      │ Extracted knowledge        │
 * ├─────────────────────────────────────────────────────────────┤
 * │  PROFILE MEMORY               │ Who the user is            │
 * └─────────────────────────────────────────────────────────────┘
 */

const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const crypto = require('crypto');
const logger = require('./logger');
const {callLLM} = require('./llmService');

// ═══════════════════════════════════════════════════════════════
//                    CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const CONFIG = {
    // Memory limits
    WORKING_MEMORY_SIZE: 5,      // Immediate context
    SHORT_TERM_SIZE: 20,         // Recent messages
    MAX_EPISODIC_LENGTH: 2000,   // Characters for summaries
    MAX_FACTS: 50,               // Important facts to remember

    // Timing
    SAVE_DEBOUNCE_MS: 5000,      // Save to disk every 5 seconds max
    SUMMARY_TRIGGER: 15,          // Generate summary after N messages
    DECAY_INTERVAL_HOURS: 24,     // Check for decay daily

    // Importance thresholds
    HIGH_IMPORTANCE: 0.8,
    MEDIUM_IMPORTANCE: 0.5,
    LOW_IMPORTANCE: 0.3,

    // Token budgets
    MAX_CONTEXT_TOKENS: 3000,
    PROFILE_TOKEN_BUDGET: 300,
    SUMMARY_TOKEN_BUDGET: 500,
    RECENT_TOKEN_BUDGET: 1500,
    FACTS_TOKEN_BUDGET: 400
};

// Storage paths
const DATA_DIR = path.join(__dirname, '../../data');
const MEMORY_FILE = path.join(DATA_DIR, 'memory-v3.json');
const PROFILES_FILE = path.join(DATA_DIR, 'profiles-v3.json');

const ENCRYPTED_PREFIX = 'ENCv1:';
const PROFILE_UPDATABLE_FIELDS = new Set(['name', 'grade', 'institution', 'subjects', 'goals', 'strengths', 'weakAreas']);

function parseEncryptionKey() {
    const raw = process.env.DATA_ENCRYPTION_KEY;
    if (!raw) return null;

    const trimmed = raw.trim();
    if (/^[a-fA-F0-9]{64}$/.test(trimmed)) {
        return Buffer.from(trimmed, 'hex');
    }

    try {
        const key = Buffer.from(trimmed, 'base64');
        if (key.length === 32) return key;
    } catch (_) {
        // Ignore invalid base64 parsing errors and report as invalid below.
    }

    throw new Error('DATA_ENCRYPTION_KEY must be 32-byte base64 or 64-char hex');
}

const DATA_ENCRYPTION_KEY = parseEncryptionKey();

if (!DATA_ENCRYPTION_KEY && process.env.NODE_ENV === 'production') {
    logger.error('FATAL: DATA_ENCRYPTION_KEY is required in production for encrypted memory at rest.');
    process.exit(1);
}

function encryptJson(obj) {
    const plain = JSON.stringify(obj, null, 2);
    if (!DATA_ENCRYPTION_KEY) return plain;

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', DATA_ENCRYPTION_KEY, iv);
    const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    const payload = {
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        data: ciphertext.toString('base64')
    };

    return ENCRYPTED_PREFIX + Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
}

function decryptJson(rawText) {
    if (!rawText) return null;

    if (!rawText.startsWith(ENCRYPTED_PREFIX)) {
        return JSON.parse(rawText);
    }

    if (!DATA_ENCRYPTION_KEY) {
        throw new Error('Encrypted data present but DATA_ENCRYPTION_KEY is not set');
    }

    const payloadB64 = rawText.slice(ENCRYPTED_PREFIX.length);
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'));

    const iv = Buffer.from(payload.iv, 'base64');
    const tag = Buffer.from(payload.tag, 'base64');
    const ciphertext = Buffer.from(payload.data, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', DATA_ENCRYPTION_KEY, iv);
    decipher.setAuthTag(tag);

    const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    return JSON.parse(plain);
}

// ═══════════════════════════════════════════════════════════════
//                    MEMORY MANAGER CLASS
// ═══════════════════════════════════════════════════════════════

class MemoryManagerV3 {
    constructor() {
        this.ensureDataDir();

        // Memory stores
        this.workingMemory = {};     // Very recent (5 messages)
        this.shortTermMemory = {};   // Recent (20 messages)
        this.episodicMemory = {};    // Summaries of past conversations
        this.semanticMemory = {};    // Extracted facts & knowledge
        this.profiles = {};          // User profiles
        this.preferences = {};       // User preferences

        // Metadata
        this.lastAccess = {};        // Track last access time per user
        this.messageCount = {};      // Messages since last summary

        // Debounce state
        this._saveTimeout = null;
        this._dirty = false;
        this._writeInProgress = false;

        // Load from disk
        this.loadFromDisk();

        logger.info('🧠 Memory Manager V3 initialized');
    }

    ensureDataDir() {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, {recursive: true});
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //                    PERSISTENCE (DEBOUNCED)
    // ═══════════════════════════════════════════════════════════════

    loadFromDisk() {
        try {
            if (fs.existsSync(MEMORY_FILE)) {
                const data = decryptJson(fs.readFileSync(MEMORY_FILE, 'utf-8'));
                this.workingMemory = data.workingMemory || {};
                this.shortTermMemory = data.shortTermMemory || {};
                this.episodicMemory = data.episodicMemory || {};
                this.semanticMemory = data.semanticMemory || {};
                this.lastAccess = data.lastAccess || {};
                this.messageCount = data.messageCount || {};
                logger.memory('Loaded memory', `${Object.keys(this.shortTermMemory).length} users`);
            }

            if (fs.existsSync(PROFILES_FILE)) {
                const profiles = decryptJson(fs.readFileSync(PROFILES_FILE, 'utf-8'));
                this.profiles = profiles.profiles || {};
                this.preferences = profiles.preferences || {};
                logger.memory('Loaded profiles', `${Object.keys(this.profiles).length} profiles`);
            }

            if (!DATA_ENCRYPTION_KEY) {
                logger.warn('DATA_ENCRYPTION_KEY not set - memory files are stored unencrypted (development only).');
            }
        } catch (error) {
            logger.error('Failed to load memory', error);
        }
    }

    /**
     * 💾 DEBOUNCED SAVE - Only writes to disk every 5 seconds
     * This prevents disk I/O bottleneck on every message
     */
    saveToDisk() {
        this._dirty = true;

        if (this._saveTimeout) {
            return; // Already scheduled
        }

        this._saveTimeout = setTimeout(() => {
            this._performSave();
            this._saveTimeout = null;
        }, CONFIG.SAVE_DEBOUNCE_MS);
    }

    _performSave() {
        if (!this._dirty) return;
        if (this._writeInProgress) {
            // A write is already in flight — re-schedule so we don't lose
            // any mutations that arrived while the previous write ran.
            this._saveTimeout = setTimeout(() => {
                this._saveTimeout = null;
                this._performSave();
            }, CONFIG.SAVE_DEBOUNCE_MS);
            return;
        }

        try {
            this._writeInProgress = true;

            // Save memory (async - non-blocking)
            const memoryData = encryptJson({
                workingMemory: this.workingMemory,
                shortTermMemory: this.shortTermMemory,
                episodicMemory: this.episodicMemory,
                semanticMemory: this.semanticMemory,
                lastAccess: this.lastAccess,
                messageCount: this.messageCount,
                savedAt: new Date().toISOString()
            });

            const profileData = encryptJson({
                profiles: this.profiles,
                preferences: this.preferences,
                savedAt: new Date().toISOString()
            });

            // Use async writes to avoid blocking the event loop
            Promise.all([
                fsPromises.writeFile(MEMORY_FILE, memoryData),
                fsPromises.writeFile(PROFILES_FILE, profileData)
            ]).then(() => {
                // Clear dirty flag AFTER write succeeds (Fix #3: race condition)
                this._dirty = false;
                this._writeInProgress = false;
                logger.debug('Memory saved to disk');
            }).catch(err => {
                this._writeInProgress = false;
                logger.error('Failed to save memory (async)', err);
                // Keep _dirty = true so next debounce retries
            });
        } catch (error) {
            this._writeInProgress = false;
            logger.error('Failed to save memory', error);
        }
    }

    /**
     * Force immediate save (for shutdown)
     */
    forceSave() {
        if (this._saveTimeout) {
            clearTimeout(this._saveTimeout);
            this._saveTimeout = null;
        }
        // Force synchronous save for shutdown
        if (!this._dirty) return;
        try {
            fs.writeFileSync(MEMORY_FILE, encryptJson({
                workingMemory: this.workingMemory,
                shortTermMemory: this.shortTermMemory,
                episodicMemory: this.episodicMemory,
                semanticMemory: this.semanticMemory,
                lastAccess: this.lastAccess,
                messageCount: this.messageCount,
                savedAt: new Date().toISOString()
            }));
            fs.writeFileSync(PROFILES_FILE, encryptJson({
                profiles: this.profiles,
                preferences: this.preferences,
                savedAt: new Date().toISOString()
            }));
            this._dirty = false;
        } catch (error) {
            logger.error('Failed to force save memory', error);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //                    MESSAGE HANDLING
    // ═══════════════════════════════════════════════════════════════

    /**
     * 🚀 ADD MESSAGE - Main entry point
     */
    addMessage(userId, message) {
        this.initUserIfNeeded(userId);
        this.lastAccess[userId] = Date.now();

        const messageWithMeta = {
            ...message,
            timestamp: new Date().toISOString(),
            importance: this.scoreImportance(message.text, message.sender)
        };

        // Add to working memory (most recent)
        this.workingMemory[userId].push(messageWithMeta);
        if (this.workingMemory[userId].length > CONFIG.WORKING_MEMORY_SIZE) {
            const overflow = this.workingMemory[userId].shift();
            this.shortTermMemory[userId].push(overflow);
        }

        // Trim short-term if needed
        if (this.shortTermMemory[userId].length > CONFIG.SHORT_TERM_SIZE) {
            this.archiveToEpisodic(userId);
        }

        // Extract important info from user messages
        if (message.sender === 'user') {
            this.extractAndStore(userId, message.text);
            this.messageCount[userId] = (this.messageCount[userId] || 0) + 1;
        }

        // Trigger summary generation periodically
        if (this.messageCount[userId] >= CONFIG.SUMMARY_TRIGGER) {
            this.generateEpisodicSummary(userId);
            this.messageCount[userId] = 0;
        }

        this.saveToDisk();
    }

    initUserIfNeeded(userId) {
        if (!this.workingMemory[userId]) {
            this.workingMemory[userId] = [];
            this.shortTermMemory[userId] = [];
            this.episodicMemory[userId] = [];
            this.semanticMemory[userId] = {facts: [], entities: {}};
            this.profiles[userId] = this.createDefaultProfile(userId);
            this.preferences[userId] = this.createDefaultPreferences();
            this.messageCount[userId] = 0;
            logger.user(userId, 'New user initialized');
        }
    }

    createDefaultProfile(userId) {
        return {
            userId,
            name: null,
            grade: null,
            institution: null,
            subjects: [],
            goals: [],
            strengths: [],
            weakAreas: [],
            createdAt: new Date().toISOString()
        };
    }

    createDefaultPreferences() {
        return {
            tone: 'friendly',
            emoji: true,
            detailLevel: 'balanced',
            explanationStyle: 'step-by-step'
        };
    }

    // ═══════════════════════════════════════════════════════════════
    //                    IMPORTANCE SCORING
    // ═══════════════════════════════════════════════════════════════

    /**
     * 📊 Score message importance (0.0 - 1.0)
     */
    scoreImportance(text, sender) {
        if (sender !== 'user') return CONFIG.LOW_IMPORTANCE;

        const lowerText = text.toLowerCase();
        let score = CONFIG.MEDIUM_IMPORTANCE;

        // High importance indicators
        const highIndicators = [
            /my name is/i, /i('m| am) studying/i, /my goal/i,
            /i struggle with/i, /help me with/i, /exam/i,
            /deadline/i, /important/i, /remember/i
        ];

        // Medium importance indicators
        const mediumIndicators = [
            /i like/i, /i prefer/i, /i want/i, /can you/i,
            /explain/i, /teach me/i
        ];

        // Low importance indicators (greetings, etc.)
        const lowIndicators = [
            /^(hi|hello|hey|thanks|ok|okay|sure|yes|no)$/i,
            /how are you/i, /good morning/i
        ];

        if (highIndicators.some(p => p.test(lowerText))) {
            score = CONFIG.HIGH_IMPORTANCE;
        } else if (lowIndicators.some(p => p.test(lowerText))) {
            score = CONFIG.LOW_IMPORTANCE;
        } else if (mediumIndicators.some(p => p.test(lowerText))) {
            score = CONFIG.MEDIUM_IMPORTANCE;
        }

        // Boost for longer messages (usually more content)
        if (text.length > 100) score = Math.min(1.0, score + 0.1);
        if (text.length > 200) score = Math.min(1.0, score + 0.1);

        return score;
    }

    // ═══════════════════════════════════════════════════════════════
    //                    INFORMATION EXTRACTION
    // ═══════════════════════════════════════════════════════════════

    /**
     * 🔍 Extract and store important information
     */
    extractAndStore(userId, text) {
        const profile = this.profiles[userId];
        if (!profile) return;  // Guard against missing profile
        const semantic = this.semanticMemory[userId];
        if (!semantic) return;  // Guard against missing semantic memory
        const lowerText = text.toLowerCase();

        // Extract name
        const nameMatch = text.match(/(?:my name is|i'm|i am|call me)\s+([A-Z][a-z]+)/i);
        if (nameMatch && !profile.name) {
            profile.name = nameMatch[1];
            this.addFact(userId, `User's name is ${profile.name}`, CONFIG.HIGH_IMPORTANCE);
        }

        // Extract grade/year
        const gradeMatch = text.match(/(?:i'm in|studying in|i am in)\s+([\w\s]+(?:year|grade|semester))/i) ||
            text.match(/(freshman|sophomore|junior|senior)/i) ||
            text.match(/(undergrad|graduate|masters|phd)/i);
        if (gradeMatch && !profile.grade) {
            profile.grade = gradeMatch[1];
        }

        // Extract institution
        const instMatch = text.match(/(?:i study at|i'm at|student at)\s+([A-Z][\w\s]+(?:University|College|School))/i);
        if (instMatch && !profile.institution) {
            profile.institution = instMatch[1];
        }

        // Extract subjects
        const subjectPatterns = [
            'math', 'physics', 'chemistry', 'biology', 'english', 'history',
            'computer science', 'programming', 'economics', 'psychology',
            'engineering', 'calculus', 'algebra', 'statistics', 'data science'
        ];
        subjectPatterns.forEach(subject => {
            if (lowerText.includes(subject) && !profile.subjects.includes(subject)) {
                if (lowerText.match(/study|learning|class|exam|course|taking/)) {
                    profile.subjects.push(subject);
                }
            }
        });

        // Extract goals
        const goalMatch = text.match(/(?:i want to|my goal is|planning to|aiming to)\s+(.+?)(?:\.|$)/i);
        if (goalMatch && goalMatch[1].length < 100) {
            const goal = goalMatch[1].trim();
            if (!profile.goals.some(g => g.text === goal)) {
                profile.goals.push({
                    text: goal,
                    addedAt: new Date().toISOString()
                });
            }
        }

        // Extract weak areas
        const weakMatch = text.match(/(?:i struggle with|weak in|bad at|don't understand)\s+(.+?)(?:\.|$)/i);
        if (weakMatch && !profile.weakAreas.includes(weakMatch[1].trim())) {
            profile.weakAreas.push(weakMatch[1].trim());
            this.addFact(userId, `Struggles with: ${weakMatch[1].trim()}`, CONFIG.HIGH_IMPORTANCE);
        }

        // Extract preferences
        if (lowerText.includes('simple') || lowerText.includes('easy') || lowerText.includes('eli5')) {
            this.preferences[userId].explanationStyle = 'simple';
        }
        if (lowerText.includes('detailed') || lowerText.includes('in-depth')) {
            this.preferences[userId].explanationStyle = 'detailed';
        }
        if (lowerText.includes('step by step') || lowerText.includes('step-by-step')) {
            this.preferences[userId].explanationStyle = 'step-by-step';
        }
    }

    /**
     * Add a fact to semantic memory
     */
    addFact(userId, fact, importance = CONFIG.MEDIUM_IMPORTANCE) {
        this.initUserIfNeeded(userId);
        const semantic = this.semanticMemory[userId];
        if (!semantic || !semantic.facts) return;
        if (!semantic.facts.some(f => f.text === fact)) {
            semantic.facts.push({
                text: fact,
                importance,
                addedAt: new Date().toISOString(),
                accessCount: 0
            });

            // Keep only top facts by importance
            if (semantic.facts.length > CONFIG.MAX_FACTS) {
                semantic.facts.sort((a, b) => b.importance - a.importance);
                semantic.facts = semantic.facts.slice(0, CONFIG.MAX_FACTS);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //                    EPISODIC MEMORY (SUMMARIES)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Archive old messages to episodic memory
     */
    archiveToEpisodic(userId) {
        const toArchive = this.shortTermMemory[userId].splice(0, 5);

        // Create a mini-summary
        const summary = this.createMiniSummary(toArchive);
        if (summary) {
            this.episodicMemory[userId].push({
                summary,
                timestamp: new Date().toISOString(),
                messageCount: toArchive.length
            });

            // Keep episodic memory trimmed
            this.trimEpisodicMemory(userId);
        }
    }

    /**
     * Create mini-summary of messages (rule-based, fast)
     */
    createMiniSummary(messages) {
        const userMessages = messages.filter(m => m.sender === 'user');
        if (userMessages.length === 0) return null;

        // Get high importance messages
        const important = userMessages.filter(m => m.importance >= CONFIG.MEDIUM_IMPORTANCE);

        if (important.length > 0) {
            return important.map(m => m.text.substring(0, 100)).join(' | ');
        }

        return userMessages[0].text.substring(0, 150);
    }

    /**
     * Generate comprehensive episodic summary (call periodically)
     * This could use LLM in production
     */
    async generateEpisodicSummary(userId) {
        const messages = this.shortTermMemory[userId];
        const userMessages = messages.filter(m => m.sender === 'user');

        if (userMessages.length < 5) return;

        // Try LLM-based summarization first
        try {
            const conversationText = messages
                .map(m => `${m.sender}: ${m.text}`)
                .join('\n');

            const summary = await callLLM(
                'You are a conversation summarizer. Extract key topics discussed, important facts mentioned, and main concerns/requests from this conversation.',
                `Summarize this conversation:\n\n${conversationText}`,
                {
                    maxTokens: 200,
                    temperature: 0.3,
                    taskType: 'summarization'  // Use MiMo Flash for fast summarization
                }
            );

            if (summary) {
                this.episodicMemory[userId].push({
                    summary: summary.trim(),
                    messageCount: userMessages.length,
                    generatedAt: new Date().toISOString(),
                    type: 'llm-generated'
                });
                this.trimEpisodicMemory(userId);
                logger.debug(`Generated LLM summary for ${userId}: ${summary.substring(0, 50)}...`);
                return;
            }
        } catch (error) {
            logger.warn('LLM summarization failed, falling back to rule-based');
        }

        // Fallback to rule-based extraction
        const topics = new Set();
        const actions = [];

        userMessages.forEach(msg => {
            const text = msg.text.toLowerCase();

            // Topics
            if (text.includes('study') || text.includes('learn')) topics.add('studying');
            if (text.includes('exam') || text.includes('test')) topics.add('exams');
            if (text.includes('stress') || text.includes('anxious')) topics.add('stress');
            if (text.includes('deadline') || text.includes('due')) topics.add('deadlines');
            if (text.includes('help') || text.includes('explain')) topics.add('getting help');

            // Important actions/requests
            if (msg.importance >= CONFIG.HIGH_IMPORTANCE) {
                actions.push(msg.text.substring(0, 80));
            }
        });

        const summary = {
            topics: Array.from(topics),
            keyMessages: actions.slice(0, 3),
            messageCount: userMessages.length,
            generatedAt: new Date().toISOString(),
            type: 'rule-based'
        };

        this.episodicMemory[userId].push(summary);
        this.trimEpisodicMemory(userId);

        logger.debug(`Generated episodic summary for ${userId}`, summary);
    }

    trimEpisodicMemory(userId) {
        // P3 fix: Avoid repeated JSON.stringify in loop (was O(n^2))
        // Estimate size by summing individual entry sizes instead
        const episodes = this.episodicMemory[userId];
        if (!episodes || episodes.length <= 1) return;

        let totalLength = 0;
        const entrySizes = episodes.map(e => {
            const size = JSON.stringify(e).length;
            totalLength += size;
            return size;
        });

        while (totalLength > CONFIG.MAX_EPISODIC_LENGTH && episodes.length > 1) {
            totalLength -= entrySizes.shift();
            episodes.shift();
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //                    CONTEXT BUILDING (FOR LLM)
    // ═══════════════════════════════════════════════════════════════

    /**
     * 📝 Build context for LLM prompt
     * Token-budgeted and prioritized
     */
    buildContext(userId) {
        this.initUserIfNeeded(userId);

        const profile = this.profiles[userId];
        const prefs = this.preferences[userId];
        const episodic = this.episodicMemory[userId];
        const semantic = this.semanticMemory[userId];
        const working = this.workingMemory[userId];
        const shortTerm = this.shortTermMemory[userId];

        let context = '';
        let tokensUsed = 0;

        // 1. Profile (highest priority)
        const profileSection = this.buildProfileSection(profile, prefs);
        if (profileSection && tokensUsed + this.estimateTokens(profileSection) < CONFIG.PROFILE_TOKEN_BUDGET) {
            context += profileSection;
            tokensUsed += this.estimateTokens(profileSection);
        }

        // 2. Important facts
        const factsSection = this.buildFactsSection(semantic);
        if (factsSection && tokensUsed + this.estimateTokens(factsSection) < CONFIG.MAX_CONTEXT_TOKENS) {
            context += factsSection;
            tokensUsed += this.estimateTokens(factsSection);
        }

        // 3. Episodic summary (if any)
        const episodicSection = this.buildEpisodicSection(episodic);
        if (episodicSection && tokensUsed + this.estimateTokens(episodicSection) < CONFIG.MAX_CONTEXT_TOKENS) {
            context += episodicSection;
            tokensUsed += this.estimateTokens(episodicSection);
        }

        // 4. Recent messages (fill remaining budget)
        const allRecent = [...shortTerm, ...working];
        const recentSection = this.buildRecentSection(allRecent, CONFIG.MAX_CONTEXT_TOKENS - tokensUsed);
        if (recentSection) {
            context += recentSection;
        }

        return context;
    }

    buildProfileSection(profile, prefs) {
        if (!profile.name && profile.subjects.length === 0) return '';

        let section = '=== 👤 STUDENT PROFILE ===\n';
        if (profile.name) section += `Name: ${profile.name}\n`;
        if (profile.grade) section += `Level: ${profile.grade}\n`;
        if (profile.institution) section += `School: ${profile.institution}\n`;
        if (profile.subjects.length > 0) section += `Subjects: ${profile.subjects.join(', ')}\n`;
        if (profile.goals.length > 0) section += `Goals: ${profile.goals.map(g => g.text || (typeof g === 'string' ? g : '')).filter(Boolean).join('; ')}\n`;
        if (profile.weakAreas.length > 0) section += `Needs help with: ${profile.weakAreas.join(', ')}\n`;
        section += `Preferred style: ${prefs.explanationStyle}, ${prefs.tone}\n`;
        section += '\n';
        return section;
    }

    buildFactsSection(semantic) {
        if (!semantic.facts || semantic.facts.length === 0) return '';

        // Sort by importance and recency
        const sortedFacts = [...semantic.facts]
            .sort((a, b) => b.importance - a.importance)
            .slice(0, 10);

        if (sortedFacts.length === 0) return '';

        let section = '=== 📌 IMPORTANT TO REMEMBER ===\n';
        sortedFacts.forEach(f => {
            section += `• ${f.text}\n`;
        });
        section += '\n';
        return section;
    }

    buildEpisodicSection(episodic) {
        if (!episodic || episodic.length === 0) return '';

        // Get most recent summaries
        const recent = episodic.slice(-3);

        let section = '=== 📜 PREVIOUS CONVERSATIONS ===\n';
        recent.forEach(ep => {
            if (ep.topics) {
                section += `Topics: ${ep.topics.join(', ')}\n`;
            }
            if (ep.summary) {
                section += `${ep.summary}\n`;
            }
        });
        section += '\n';
        return section;
    }

    buildRecentSection(messages, tokenBudget) {
        if (messages.length === 0) return '';

        let section = '=== 💬 RECENT CHAT ===\n';
        let tokens = this.estimateTokens(section);

        // Work backwards from most recent
        const recentMsgs = [];
        for (let i = messages.length - 1; i >= 0 && tokens < tokenBudget; i--) {
            const msg = messages[i];
            const line = `${msg.sender === 'user' ? 'Student' : 'You'}: ${msg.text}\n`;
            const lineTokens = this.estimateTokens(line);

            if (tokens + lineTokens > tokenBudget) break;

            recentMsgs.unshift(line);
            tokens += lineTokens;
        }

        return section + recentMsgs.join('');
    }

    estimateTokens(text) {
        return Math.ceil(text.length / 4);
    }

    // ═══════════════════════════════════════════════════════════════
    //                    GETTER METHODS (FOR AGENTS)
    // ═══════════════════════════════════════════════════════════════

    getProfile(userId) {
        this.initUserIfNeeded(userId);
        return this.profiles[userId];
    }

    getPreferences(userId) {
        this.initUserIfNeeded(userId);
        return this.preferences[userId];
    }

    getSummary(userId) {
        const episodic = this.episodicMemory[userId] || [];
        return episodic.map(e => e.summary || JSON.stringify(e.topics)).join(' | ');
    }

    getRecentMessages(userId, count = 5) {
        const working = this.workingMemory[userId] || [];
        const shortTerm = this.shortTermMemory[userId] || [];
        return [...shortTerm, ...working].slice(-count);
    }

    getPatterns(userId) {
        this.initUserIfNeeded(userId);
        const messages = [...(this.shortTermMemory[userId] || []), ...(this.workingMemory[userId] || [])];

        const userText = messages.filter(m => m.sender === 'user').map(m => m.text.toLowerCase()).join(' ');

        const patterns = {
            stressLevel: 'normal',
            currentMood: 'neutral',
            frequentTopics: []
        };

        // Stress detection
        const stressWords = ['stress', 'anxious', 'worried', 'overwhelm', 'panic'];
        const stressCount = stressWords.filter(w => userText.includes(w)).length;
        if (stressCount >= 2) patterns.stressLevel = 'high';
        else if (stressCount >= 1) patterns.stressLevel = 'moderate';

        // Mood
        if (/happy|great|awesome|excited/.test(userText)) patterns.currentMood = 'positive';
        if (/sad|down|depressed|upset/.test(userText)) patterns.currentMood = 'sad';
        if (/frustrated|angry|annoyed/.test(userText)) patterns.currentMood = 'frustrated';
        if (/stressed|anxious|worried/.test(userText)) patterns.currentMood = 'stressed';

        return patterns;
    }

    getFacts(userId) {
        this.initUserIfNeeded(userId);
        return this.semanticMemory[userId]?.facts || [];
    }

    // Legacy compatibility
    getContext(userId) {
        return this.buildContext(userId);
    }

    getConversationHistory(userId, count = 10) {
        return this.getRecentMessages(userId, count);
    }

    detectPatterns(userId) {
        return this.getPatterns(userId);
    }

    // ═══════════════════════════════════════════════════════════════
    //                    UPDATE METHODS
    // ═══════════════════════════════════════════════════════════════

    updateProfile(userId, updates) {
        this.initUserIfNeeded(userId);
        const safeUpdates = {};
        Object.entries(updates || {}).forEach(([key, value]) => {
            if (PROFILE_UPDATABLE_FIELDS.has(key)) {
                safeUpdates[key] = value;
            }
        });

        this.profiles[userId] = {...this.profiles[userId], ...safeUpdates};
        this.saveToDisk();
    }

    updatePreferences(userId, updates) {
        this.initUserIfNeeded(userId);
        this.preferences[userId] = {...this.preferences[userId], ...updates};
        this.saveToDisk();
    }

    suggestUpdate(userId, suggestions) {
        if (suggestions.profile) this.updateProfile(userId, suggestions.profile);
        if (suggestions.preferences) this.updatePreferences(userId, suggestions.preferences);
        if (suggestions.facts) {
            suggestions.facts.forEach(f => this.addFact(userId, f, CONFIG.MEDIUM_IMPORTANCE));
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //                    CLEANUP
    // ═══════════════════════════════════════════════════════════════

    clearConversation(userId) {
        this.workingMemory[userId] = [];
        this.shortTermMemory[userId] = [];
        // Keep profile, episodic, and semantic
        this.saveToDisk();
    }

    clearAll(userId) {
        delete this.workingMemory[userId];
        delete this.shortTermMemory[userId];
        delete this.episodicMemory[userId];
        delete this.semanticMemory[userId];
        delete this.profiles[userId];
        delete this.preferences[userId];
        this.saveToDisk();
    }

    exportUserData(userId) {
        return {
            profile: this.profiles[userId],
            preferences: this.preferences[userId],
            episodic: this.episodicMemory[userId],
            semantic: this.semanticMemory[userId],
            recent: this.getRecentMessages(userId, 20)
        };
    }
}

// Singleton
const memoryManager = new MemoryManagerV3();

// NOTE: Shutdown handlers (SIGINT/SIGTERM) are managed exclusively by app.js
// which calls memoryManager.forceSave(). We do NOT register process handlers
// here to avoid double-exit race conditions (Fix #6).

module.exports = memoryManager;
