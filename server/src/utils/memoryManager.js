/**
 * 🧠 PERSISTENT Memory Manager - Saves ALL memory to files
 * Your Student Mate will NEVER forget you!
 * 
 * Memory survives:
 * ✅ Server restarts
 * ✅ API key changes  
 * ✅ System reboots
 */

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const MAX_SHORT_TERM_MESSAGES = 15;  // Keep last N messages in full
const MAX_CONTEXT_TOKENS = 4000;     // Token budget for context

// Persistent storage paths
const DATA_DIR = path.join(__dirname, '../../data');
const MEMORY_FILE = path.join(DATA_DIR, 'memory.json');
const PROFILES_FILE = path.join(DATA_DIR, 'studentProfiles.json');

class PersistentMemoryManager {
    constructor() {
        // Ensure data directory exists
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, {recursive: true});
            logger.info('Created data directory for persistent storage');
        }

        // Load existing data from files
        this.shortTermMemory = {};  // Recent messages
        this.longTermMemory = {};   // Summarized context
        this.userProfiles = {};     // Student profiles & preferences
        this.learningPatterns = {}; // Detected learning patterns

        this.loadFromDisk();
    }

    /**
     * 💾 Load all memory from disk
     */
    loadFromDisk() {
        try {
            if (fs.existsSync(MEMORY_FILE)) {
                const data = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf-8'));
                this.shortTermMemory = data.shortTermMemory || {};
                this.longTermMemory = data.longTermMemory || {};
                this.learningPatterns = data.learningPatterns || {};
                logger.memory('Loaded from disk', `${Object.keys(this.shortTermMemory).length} conversations`);
            } else {
                logger.info('No existing memory file - starting fresh');
            }

            if (fs.existsSync(PROFILES_FILE)) {
                this.userProfiles = JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf-8'));
                logger.memory('Loaded profiles', `${Object.keys(this.userProfiles).length} student profiles`);
            }

            logger.success('Persistent memory loaded successfully');
        } catch (error) {
            logger.error('Failed to load memory from disk', error);
        }
    }

    /**
     * 💾 Save all memory to disk
     */
    saveToDisk() {
        try {
            // Save conversations and memory
            fs.writeFileSync(MEMORY_FILE, JSON.stringify({
                shortTermMemory: this.shortTermMemory,
                longTermMemory: this.longTermMemory,
                learningPatterns: this.learningPatterns,
                lastUpdated: new Date().toISOString()
            }, null, 2));

            // Save student profiles separately
            fs.writeFileSync(PROFILES_FILE, JSON.stringify(this.userProfiles, null, 2));
            logger.debug('Memory saved to disk');
        } catch (error) {
            logger.error('Failed to save memory to disk', error);
        }
    }

    /**
     * Add a message and auto-save
     */
    addMessage(userId, message) {
        if (!this.shortTermMemory[userId]) {
            this.shortTermMemory[userId] = [];
            logger.user(userId, 'New user conversation started');
        }

        this.shortTermMemory[userId].push({
            ...message,
            timestamp: new Date().toISOString()
        });

        // Trim if exceeds max
        if (this.shortTermMemory[userId].length > MAX_SHORT_TERM_MESSAGES) {
            const removed = this.shortTermMemory[userId].shift();
            this.updateLongTermSummary(userId, removed);
        }

        // Auto-extract important info
        this.extractAndSaveInfo(userId, message);

        // Auto-save to disk
        this.saveToDisk();
    }

    /**
     * 🔍 Extract important info from messages automatically
     */
    extractAndSaveInfo(userId, message) {
        if (message.sender !== 'user') return;

        const text = message.text.toLowerCase();
        const profile = this.userProfiles[userId] || this.createDefaultProfile(userId);

        // Extract name
        const nameMatch = text.match(/(?:my name is|i'm|i am|call me)\s+(\w+)/i);
        if (nameMatch) {
            profile.name = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1);
        }

        // Extract subjects they're studying
        const subjects = ['math', 'physics', 'chemistry', 'biology', 'english', 'history',
            'computer science', 'programming', 'economics', 'psychology'];
        subjects.forEach(subject => {
            if (text.includes(subject) && text.match(/study|learning|class|exam|test/)) {
                if (!profile.subjects.includes(subject)) {
                    profile.subjects.push(subject);
                }
            }
        });

        // Extract exam mentions
        const examMatch = text.match(/(?:exam|test)\s+(?:on|is|in)\s+(\w+\s*\d*)/i);
        if (examMatch) {
            profile.upcomingExams.push({
                mention: examMatch[1],
                mentionedAt: new Date().toISOString()
            });
        }

        // Detect stress level
        const stressWords = ['stress', 'anxious', 'worried', 'overwhelm', 'panic', 'scared', 'nervous'];
        if (stressWords.some(w => text.includes(w))) {
            profile.currentMood = 'stressed';
            profile.lastStressMention = new Date().toISOString();
        }

        // Save goals/aspirations
        const goalMatch = text.match(/(?:want to|goal is|planning to|aim to)\s+(.+)/i);
        if (goalMatch && goalMatch[1].length < 100) {
            profile.goals.push({
                goal: goalMatch[1],
                addedAt: new Date().toISOString()
            });
        }

        this.userProfiles[userId] = profile;
    }

    /**
     * Create default student profile
     */
    createDefaultProfile(userId) {
        return {
            userId,
            name: null,
            subjects: [],
            upcomingExams: [],
            goals: [],
            currentMood: 'neutral',
            preferredTone: 'friendly',
            studyStreak: 0,
            totalInteractions: 0,
            createdAt: new Date().toISOString(),
            lastInteraction: new Date().toISOString()
        };
    }

    /**
     * Get conversation context for LLM (with persistent memory)
     */
    getContext(userId) {
        const shortTerm = this.shortTermMemory[userId] || [];
        const longTerm = this.longTermMemory[userId] || '';
        const profile = this.userProfiles[userId] || {};

        let context = '';

        // Add student profile (THE KEY TO REMEMBERING!)
        if (profile.name || profile.subjects?.length > 0) {
            context += '=== STUDENT PROFILE (REMEMBER THIS!) ===\n';
            if (profile.name) context += `Name: ${profile.name}\n`;
            if (profile.subjects?.length) context += `Subjects: ${profile.subjects.join(', ')}\n`;
            if (profile.goals?.length) context += `Goals: ${profile.goals.map(g => g.goal).join('; ')}\n`;
            if (profile.currentMood) context += `Current mood: ${profile.currentMood}\n`;
            context += '\n';
        }

        // Add long-term summary
        if (longTerm) {
            context += `=== PREVIOUS CONVERSATIONS ===\n${longTerm}\n\n`;
        }

        // Add recent messages
        if (shortTerm.length > 0) {
            context += '=== RECENT CHAT ===\n';
            shortTerm.slice(-10).forEach(msg => {
                const role = msg.sender === 'user' ? 'Student' : 'You';
                context += `${role}: ${msg.text}\n`;
            });
        }

        // Update interaction count
        if (this.userProfiles[userId]) {
            this.userProfiles[userId].totalInteractions = (this.userProfiles[userId].totalInteractions || 0) + 1;
            this.userProfiles[userId].lastInteraction = new Date().toISOString();
        }

        return context;
    }

    /**
     * Get conversation history as array (for LLM context)
     */
    getConversationHistory(userId, count = 10) {
        const messages = this.shortTermMemory[userId] || [];
        return messages.slice(-count);
    }

    /**
     * Get recent messages (for display)
     */
    getRecentMessages(userId, count = 5) {
        const messages = this.shortTermMemory[userId] || [];
        return messages.slice(-count);
    }

    /**
     * Update long-term summary
     */
    updateLongTermSummary(userId, message) {
        if (!this.longTermMemory[userId]) {
            this.longTermMemory[userId] = '';
        }

        const summary = `[${message.sender}] ${message.text.substring(0, 100)}`;
        this.longTermMemory[userId] += summary + '; ';

        // Keep long-term memory at reasonable size
        if (this.longTermMemory[userId].length > 2000) {
            this.longTermMemory[userId] = this.longTermMemory[userId].substring(
                this.longTermMemory[userId].length - 1500
            );
        }
    }

    /**
     * Update user profile manually
     */
    updateUserProfile(userId, updates) {
        if (!this.userProfiles[userId]) {
            this.userProfiles[userId] = this.createDefaultProfile(userId);
        }
        this.userProfiles[userId] = {
            ...this.userProfiles[userId],
            ...updates
        };
        this.saveToDisk();
    }

    /**
     * Get student profile
     */
    getProfile(userId) {
        return this.userProfiles[userId] || null;
    }

    /**
     * Detect patterns in user behavior
     */
    detectPatterns(userId) {
        const messages = this.shortTermMemory[userId] || [];
        const patterns = {
            stressLevel: 'normal',
            preferredStyle: 'balanced',
            frequentTopics: [],
            studyTime: null,
            weakAreas: []
        };

        const allText = messages
            .filter(m => m.sender === 'user')
            .map(m => m.text.toLowerCase())
            .join(' ');

        // Stress detection
        const stressWords = ['stress', 'anxious', 'worried', 'overwhelm', 'panic', 'scared'];
        const stressCount = stressWords.filter(w => allText.includes(w)).length;
        if (stressCount >= 2) patterns.stressLevel = 'high';
        else if (stressCount >= 1) patterns.stressLevel = 'moderate';

        // Topic detection
        const topics = {
            'academics': ['exam', 'study', 'learn', 'class', 'subject', 'homework'],
            'schedule': ['time', 'schedule', 'busy', 'deadline', 'task'],
            'emotional': ['feel', 'sad', 'happy', 'angry', 'frustrated']
        };

        for (const [topic, keywords] of Object.entries(topics)) {
            if (keywords.some(k => allText.includes(k))) {
                patterns.frequentTopics.push(topic);
            }
        }

        // Save patterns
        this.learningPatterns[userId] = patterns;
        this.saveToDisk();

        return patterns;
    }

    /**
     * Get all data for a user (for export)
     */
    exportUserData(userId) {
        return {
            profile: this.userProfiles[userId],
            conversations: this.shortTermMemory[userId],
            longTermMemory: this.longTermMemory[userId],
            patterns: this.learningPatterns[userId]
        };
    }

    /**
     * Clear memory for a user
     */
    clearMemory(userId) {
        delete this.shortTermMemory[userId];
        delete this.longTermMemory[userId];
        delete this.learningPatterns[userId];
        // Keep profile, just clear conversations
        this.saveToDisk();
    }

    /**
     * Clear everything including profile
     */
    clearAllData(userId) {
        delete this.shortTermMemory[userId];
        delete this.longTermMemory[userId];
        delete this.learningPatterns[userId];
        delete this.userProfiles[userId];
        this.saveToDisk();
    }
}

// Singleton instance
const memoryManager = new PersistentMemoryManager();

module.exports = memoryManager;
