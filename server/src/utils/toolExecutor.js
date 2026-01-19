/**
 * 🔧 TOOL EXECUTION LAYER
 * 
 * Provides tools that agents can call to perform actions:
 * - 📅 Reminders (set, get, delete)
 * - 📋 Timetable (query schedule)
 * - 📝 Notes (save, retrieve)
 * - ⏰ Study Planner (create study sessions)
 * - 📊 Progress Tracker (track goals)
 * 
 * ARCHITECTURE:
 * Agent → Tool Request → Tool Executor → Result → Agent
 */

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// Storage paths
const DATA_DIR = path.join(__dirname, '../../data');
const REMINDERS_FILE = path.join(DATA_DIR, 'reminders.json');
const NOTES_FILE = path.join(DATA_DIR, 'notes.json');
const STUDY_PLANS_FILE = path.join(DATA_DIR, 'studyPlans.json');
const DEADLINES_FILE = path.join(DATA_DIR, 'deadlines.json');
const MOODS_FILE = path.join(DATA_DIR, 'moods.json');
const POMODORO_FILE = path.join(DATA_DIR, 'pomodoro.json');
const QUIZZES_FILE = path.join(DATA_DIR, 'quizzes.json');

class ToolExecutor {
    constructor() {
        // Ensure data directory exists
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, {recursive: true});
        }

        // Load existing data
        this.reminders = this.loadJSON(REMINDERS_FILE, {});
        this.notes = this.loadJSON(NOTES_FILE, {});
        this.studyPlans = this.loadJSON(STUDY_PLANS_FILE, {});
        this.deadlines = this.loadJSON(DEADLINES_FILE, {});
        this.moods = this.loadJSON(MOODS_FILE, {});
        this.pomodoro = this.loadJSON(POMODORO_FILE, {});
        this.quizzes = this.loadJSON(QUIZZES_FILE, {});

        // Available tools registry
        this.tools = {
            // Reminders
            'setReminder': this.setReminder.bind(this),
            'getReminders': this.getReminders.bind(this),
            'deleteReminder': this.deleteReminder.bind(this),
            // Notes
            'saveNote': this.saveNote.bind(this),
            'getNotes': this.getNotes.bind(this),
            'searchNotes': this.searchNotes.bind(this),
            'deleteNote': this.deleteNote.bind(this),
            // Study Plans
            'createStudyPlan': this.createStudyPlan.bind(this),
            'getStudyPlan': this.getStudyPlan.bind(this),
            'getTodaysTasks': this.getTodaysTasks.bind(this),
            'markTaskComplete': this.markTaskComplete.bind(this),
            // 🆕 Pomodoro Timer
            'startPomodoro': this.startPomodoro.bind(this),
            'getPomodoroStats': this.getPomodoroStats.bind(this),
            'endPomodoro': this.endPomodoro.bind(this),
            // 🆕 Quiz Generator
            'generateQuiz': this.generateQuiz.bind(this),
            'getQuizzes': this.getQuizzes.bind(this),
            'saveQuizResult': this.saveQuizResult.bind(this),
            // 🆕 Mood Logger
            'logMood': this.logMood.bind(this),
            'getMoodHistory': this.getMoodHistory.bind(this),
            'getMoodTrends': this.getMoodTrends.bind(this),
            // 🆕 Deadline Tracker
            'addDeadline': this.addDeadline.bind(this),
            'getDeadlines': this.getDeadlines.bind(this),
            'getUpcomingDeadlines': this.getUpcomingDeadlines.bind(this),
            'markDeadlineComplete': this.markDeadlineComplete.bind(this),
            // 🆕 Web Search
            'webSearch': this.webSearch.bind(this),
            // 🆕 Wikipedia
            'wikipediaSummary': this.wikipediaSummary.bind(this),
            // 🆕 YouTube Search
            'youtubeSearch': this.youtubeSearch.bind(this)
        };

        logger.info('Tool Executor initialized');
    }

    // ═══════════════════════════════════════════════════════════════
    //                    UTILITY METHODS
    // ═══════════════════════════════════════════════════════════════

    loadJSON(filePath, defaultValue) {
        try {
            if (fs.existsSync(filePath)) {
                return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            }
        } catch (error) {
            logger.error(`Failed to load ${filePath}`, error);
        }
        return defaultValue;
    }

    saveJSON(filePath, data) {
        try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        } catch (error) {
            logger.error(`Failed to save ${filePath}`, error);
        }
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // ═══════════════════════════════════════════════════════════════
    //                    MAIN EXECUTION METHOD
    // ═══════════════════════════════════════════════════════════════

    /**
     * Execute a tool by name
     * @param {string} toolName - Name of the tool to execute
     * @param {object} params - Parameters for the tool
     * @param {string} userId - User ID
     * @returns {object} - {success: boolean, result: any, error?: string}
     */
    async execute(toolName, params, userId) {
        logger.debug(`Executing tool: ${toolName}`, {params, userId});

        const tool = this.tools[toolName];
        if (!tool) {
            return {
                success: false,
                error: `Unknown tool: ${toolName}`
            };
        }

        try {
            const result = await tool(params, userId);
            return {
                success: true,
                result
            };
        } catch (error) {
            logger.error(`Tool execution failed: ${toolName}`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get list of available tools (for LLM context)
     */
    getAvailableTools() {
        return [
            // REMINDERS
            {
                name: 'setReminder',
                description: 'Set a reminder for the student',
                params: ['title', 'datetime', 'description (optional)']
            },
            {
                name: 'getReminders',
                description: 'Get all reminders for the student',
                params: []
            },
            {
                name: 'deleteReminder',
                description: 'Delete a reminder by ID',
                params: ['reminderId']
            },
            // NOTES
            {
                name: 'saveNote',
                description: 'Save a note for future reference',
                params: ['title', 'content', 'tags (optional)']
            },
            {
                name: 'getNotes',
                description: 'Get all notes for the student',
                params: ['tag (optional)']
            },
            {
                name: 'searchNotes',
                description: 'Search notes by keyword',
                params: ['query']
            },
            // STUDY PLANS
            {
                name: 'createStudyPlan',
                description: 'Create a study plan/schedule',
                params: ['subject', 'duration', 'frequency', 'startDate']
            },
            {
                name: 'getTodaysTasks',
                description: 'Get tasks scheduled for today',
                params: []
            },
            {
                name: 'markTaskComplete',
                description: 'Mark a task as complete',
                params: ['taskId']
            },
            // 🍅 POMODORO
            {
                name: 'startPomodoro',
                description: 'Start a pomodoro focus session',
                params: ['subject', 'duration (default 25)', 'breakTime (default 5)']
            },
            {
                name: 'endPomodoro',
                description: 'End current pomodoro session',
                params: ['completed (boolean)', 'notes (optional)']
            },
            {
                name: 'getPomodoroStats',
                description: 'Get pomodoro statistics',
                params: ['period (today/week/month)']
            },
            // 📝 QUIZ
            {
                name: 'generateQuiz',
                description: 'Generate a quiz on a topic',
                params: ['topic', 'difficulty (easy/medium/hard)', 'numQuestions', 'type (mcq/true-false/short-answer/mixed)']
            },
            {
                name: 'getQuizzes',
                description: 'Get past quizzes',
                params: ['topic (optional)', 'limit']
            },
            {
                name: 'saveQuizResult',
                description: 'Save quiz attempt result',
                params: ['quizId', 'score', 'totalQuestions', 'answers']
            },
            // 🧠 MOOD
            {
                name: 'logMood',
                description: 'Log current mood',
                params: ['mood', 'energy (1-10)', 'notes (optional)', 'triggers (optional)']
            },
            {
                name: 'getMoodHistory',
                description: 'Get mood history',
                params: ['days (default 7)', 'limit']
            },
            {
                name: 'getMoodTrends',
                description: 'Get mood trends and insights',
                params: ['days (default 30)']
            },
            // 📅 DEADLINES
            {
                name: 'addDeadline',
                description: 'Add a deadline/due date',
                params: ['title', 'dueDate', 'subject', 'priority', 'type (assignment/exam/project)']
            },
            {
                name: 'getDeadlines',
                description: 'Get all deadlines',
                params: ['includeCompleted', 'subject (optional)']
            },
            {
                name: 'getUpcomingDeadlines',
                description: 'Get upcoming deadlines',
                params: ['days (default 7)']
            },
            {
                name: 'markDeadlineComplete',
                description: 'Mark deadline as complete',
                params: ['deadlineId']
            },
            // 🔍 SEARCH
            {
                name: 'webSearch',
                description: 'Search the web for information',
                params: ['query', 'maxResults']
            },
            {
                name: 'wikipediaSummary',
                description: 'Get Wikipedia summary for a topic',
                params: ['topic', 'sentences (default 5)']
            },
            {
                name: 'youtubeSearch',
                description: 'Search YouTube for educational videos',
                params: ['query', 'type (educational)', 'maxResults']
            }
        ];
    }

    // ═══════════════════════════════════════════════════════════════
    //                    REMINDER TOOLS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Set a reminder
     */
    setReminder({title, datetime, description = ''}, userId) {
        if (!this.reminders[userId]) {
            this.reminders[userId] = [];
        }

        const reminder = {
            id: this.generateId(),
            title,
            datetime: new Date(datetime).toISOString(),
            description,
            createdAt: new Date().toISOString(),
            completed: false
        };

        this.reminders[userId].push(reminder);
        this.saveJSON(REMINDERS_FILE, this.reminders);

        logger.debug(`Reminder set for ${userId}: ${title}`);

        return {
            message: `✅ Reminder set: "${title}" for ${new Date(datetime).toLocaleString()}`,
            reminder
        };
    }

    /**
     * Get all reminders
     */
    getReminders({includeCompleted = false}, userId) {
        const userReminders = this.reminders[userId] || [];

        const filtered = includeCompleted
            ? userReminders
            : userReminders.filter(r => !r.completed);

        // Sort by datetime
        filtered.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

        return {
            count: filtered.length,
            reminders: filtered
        };
    }

    /**
     * Delete a reminder
     */
    deleteReminder({reminderId}, userId) {
        if (!this.reminders[userId]) {
            return {success: false, message: 'No reminders found'};
        }

        const index = this.reminders[userId].findIndex(r => r.id === reminderId);
        if (index === -1) {
            return {success: false, message: 'Reminder not found'};
        }

        const deleted = this.reminders[userId].splice(index, 1)[0];
        this.saveJSON(REMINDERS_FILE, this.reminders);

        return {
            success: true,
            message: `Deleted reminder: "${deleted.title}"`
        };
    }

    // ═══════════════════════════════════════════════════════════════
    //                    NOTES TOOLS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Save a note
     */
    saveNote({title, content, tags = []}, userId) {
        if (!this.notes[userId]) {
            this.notes[userId] = [];
        }

        const note = {
            id: this.generateId(),
            title,
            content,
            tags: Array.isArray(tags) ? tags : [tags],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.notes[userId].push(note);
        this.saveJSON(NOTES_FILE, this.notes);

        logger.debug(`Note saved for ${userId}: ${title}`);

        return {
            message: `📝 Note saved: "${title}"`,
            note
        };
    }

    /**
     * Get all notes (optionally filtered by tag)
     */
    getNotes({tag = null}, userId) {
        const userNotes = this.notes[userId] || [];

        const filtered = tag
            ? userNotes.filter(n => n.tags.includes(tag.toLowerCase()))
            : userNotes;

        // Sort by most recent
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return {
            count: filtered.length,
            notes: filtered
        };
    }

    /**
     * Search notes by keyword
     */
    searchNotes({query}, userId) {
        const userNotes = this.notes[userId] || [];
        const lowerQuery = query.toLowerCase();

        const matches = userNotes.filter(n =>
            n.title.toLowerCase().includes(lowerQuery) ||
            n.content.toLowerCase().includes(lowerQuery) ||
            n.tags.some(t => t.toLowerCase().includes(lowerQuery))
        );

        return {
            query,
            count: matches.length,
            notes: matches
        };
    }

    /**
     * Delete a note
     */
    deleteNote({noteId}, userId) {
        if (!this.notes[userId]) {
            return {success: false, message: 'No notes found'};
        }

        const index = this.notes[userId].findIndex(n => n.id === noteId);
        if (index === -1) {
            return {success: false, message: 'Note not found'};
        }

        const deleted = this.notes[userId].splice(index, 1)[0];
        this.saveJSON(NOTES_FILE, this.notes);

        return {
            success: true,
            message: `Deleted note: "${deleted.title}"`
        };
    }

    // ═══════════════════════════════════════════════════════════════
    //                    STUDY PLAN TOOLS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Create a study plan
     */
    createStudyPlan({subject, duration, frequency, startDate, goals = []}, userId) {
        if (!this.studyPlans[userId]) {
            this.studyPlans[userId] = [];
        }

        const plan = {
            id: this.generateId(),
            subject,
            duration,  // e.g., "1 hour"
            frequency, // e.g., "daily", "3 times a week"
            startDate: new Date(startDate).toISOString(),
            goals,
            tasks: this.generateStudyTasks(subject, duration, frequency, startDate),
            createdAt: new Date().toISOString(),
            active: true
        };

        this.studyPlans[userId].push(plan);
        this.saveJSON(STUDY_PLANS_FILE, this.studyPlans);

        logger.debug(`Study plan created for ${userId}: ${subject}`);

        return {
            message: `📚 Study plan created for ${subject}!`,
            plan
        };
    }

    /**
     * Generate study tasks based on plan
     */
    generateStudyTasks(subject, duration, frequency, startDate) {
        const tasks = [];
        const start = new Date(startDate);

        // Generate tasks for the next 7 days
        for (let i = 0; i < 7; i++) {
            const taskDate = new Date(start);
            taskDate.setDate(taskDate.getDate() + i);

            // Add task based on frequency
            const shouldAdd = frequency === 'daily' ||
                (frequency === '3 times a week' && [1, 3, 5].includes(taskDate.getDay())) ||
                (frequency === 'weekdays' && taskDate.getDay() >= 1 && taskDate.getDay() <= 5);

            if (shouldAdd) {
                tasks.push({
                    id: this.generateId(),
                    subject,
                    duration,
                    scheduledDate: taskDate.toISOString().split('T')[0],
                    completed: false,
                    completedAt: null
                });
            }
        }

        return tasks;
    }

    /**
     * Get study plan for a subject
     */
    getStudyPlan({subject = null}, userId) {
        const userPlans = this.studyPlans[userId] || [];

        if (subject) {
            const plan = userPlans.find(p =>
                p.subject.toLowerCase() === subject.toLowerCase() && p.active
            );
            return plan || {message: `No active study plan found for ${subject}`};
        }

        return {
            count: userPlans.filter(p => p.active).length,
            plans: userPlans.filter(p => p.active)
        };
    }

    /**
     * Get today's tasks across all study plans
     */
    getTodaysTasks(params, userId) {
        const today = new Date().toISOString().split('T')[0];
        const userPlans = this.studyPlans[userId] || [];
        const todaysTasks = [];

        userPlans.forEach(plan => {
            if (!plan.active) return;

            plan.tasks.forEach(task => {
                if (task.scheduledDate === today && !task.completed) {
                    todaysTasks.push({
                        ...task,
                        subject: plan.subject,
                        planId: plan.id
                    });
                }
            });
        });

        // Also check reminders for today
        const userReminders = this.reminders[userId] || [];
        const todaysReminders = userReminders.filter(r => {
            const reminderDate = new Date(r.datetime).toISOString().split('T')[0];
            return reminderDate === today && !r.completed;
        });

        return {
            date: today,
            studyTasks: todaysTasks,
            reminders: todaysReminders,
            totalTasks: todaysTasks.length + todaysReminders.length
        };
    }

    /**
     * Mark a task as complete
     */
    markTaskComplete({taskId, planId}, userId) {
        const userPlans = this.studyPlans[userId] || [];

        for (const plan of userPlans) {
            if (planId && plan.id !== planId) continue;

            const task = plan.tasks.find(t => t.id === taskId);
            if (task) {
                task.completed = true;
                task.completedAt = new Date().toISOString();
                this.saveJSON(STUDY_PLANS_FILE, this.studyPlans);

                return {
                    success: true,
                    message: `✅ Great job! Completed: ${plan.subject} study session`
                };
            }
        }

        return {
            success: false,
            message: 'Task not found'
        };
    }

    // ═══════════════════════════════════════════════════════════════
    //                    🍅 POMODORO TIMER TOOLS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Start a pomodoro session
     */
    startPomodoro({subject, duration = 25, breakTime = 5}, userId) {
        if (!this.pomodoro[userId]) {
            this.pomodoro[userId] = {
                sessions: [],
                currentSession: null,
                totalFocusTime: 0,
                streak: 0
            };
        }

        const session = {
            id: this.generateId(),
            subject,
            duration, // minutes
            breakTime, // minutes
            startedAt: new Date().toISOString(),
            endedAt: null,
            completed: false,
            interruptions: 0
        };

        this.pomodoro[userId].currentSession = session;
        this.saveJSON(POMODORO_FILE, this.pomodoro);

        logger.debug(`Pomodoro started for ${userId}: ${subject}`);

        return {
            message: `🍅 Pomodoro started! Focus on "${subject}" for ${duration} minutes.`,
            session,
            tips: [
                '📵 Put your phone on silent',
                '🎧 Use focus music if it helps',
                '💧 Have water nearby',
                '🚫 Avoid checking messages'
            ]
        };
    }

    /**
     * End current pomodoro session
     */
    endPomodoro({completed = true, notes = ''}, userId) {
        if (!this.pomodoro[userId]?.currentSession) {
            return {success: false, message: 'No active pomodoro session'};
        }

        const session = this.pomodoro[userId].currentSession;
        session.endedAt = new Date().toISOString();
        session.completed = completed;
        session.notes = notes;

        // Calculate actual focus time
        const startTime = new Date(session.startedAt);
        const endTime = new Date(session.endedAt);
        const actualMinutes = Math.round((endTime - startTime) / 60000);
        session.actualMinutes = actualMinutes;

        // Update stats
        if (completed) {
            this.pomodoro[userId].totalFocusTime += actualMinutes;
            this.pomodoro[userId].streak += 1;
        } else {
            this.pomodoro[userId].streak = 0;
        }

        this.pomodoro[userId].sessions.push(session);
        this.pomodoro[userId].currentSession = null;
        this.saveJSON(POMODORO_FILE, this.pomodoro);

        const emoji = completed ? '✅' : '⏹️';
        return {
            success: true,
            message: `${emoji} Pomodoro ${completed ? 'completed' : 'ended'}! You focused for ${actualMinutes} minutes.`,
            session,
            streak: this.pomodoro[userId].streak,
            totalFocusTime: this.pomodoro[userId].totalFocusTime,
            suggestion: completed ? `Great job! Take a ${session.breakTime} minute break! 🧘` : 'No worries! Try again when you\'re ready.'
        };
    }

    /**
     * Get pomodoro statistics
     */
    getPomodoroStats({period = 'week'}, userId) {
        const data = this.pomodoro[userId] || {sessions: [], totalFocusTime: 0, streak: 0};

        const now = new Date();
        const periodStart = new Date();

        if (period === 'today') {
            periodStart.setHours(0, 0, 0, 0);
        } else if (period === 'week') {
            periodStart.setDate(now.getDate() - 7);
        } else if (period === 'month') {
            periodStart.setMonth(now.getMonth() - 1);
        }

        const recentSessions = data.sessions.filter(s =>
            new Date(s.startedAt) >= periodStart
        );

        const completedSessions = recentSessions.filter(s => s.completed);
        const totalMinutes = completedSessions.reduce((sum, s) => sum + (s.actualMinutes || 0), 0);

        // Group by subject
        const bySubject = {};
        completedSessions.forEach(s => {
            bySubject[s.subject] = (bySubject[s.subject] || 0) + (s.actualMinutes || 0);
        });

        return {
            period,
            totalSessions: completedSessions.length,
            totalFocusMinutes: totalMinutes,
            totalFocusHours: (totalMinutes / 60).toFixed(1),
            currentStreak: data.streak,
            averageSessionLength: completedSessions.length > 0
                ? Math.round(totalMinutes / completedSessions.length)
                : 0,
            bySubject,
            currentSession: data.currentSession,
            message: `🍅 You've completed ${completedSessions.length} pomodoros (${(totalMinutes / 60).toFixed(1)} hours) this ${period}!`
        };
    }

    // ═══════════════════════════════════════════════════════════════
    //                    📝 QUIZ GENERATOR TOOLS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Generate a quiz on a topic
     */
    generateQuiz({topic, difficulty = 'medium', numQuestions = 5, type = 'mixed'}, userId) {
        if (!this.quizzes[userId]) {
            this.quizzes[userId] = [];
        }

        // Pre-built question templates (LLM can enhance these)
        const quiz = {
            id: this.generateId(),
            topic,
            difficulty,
            type, // 'mcq', 'true-false', 'short-answer', 'mixed'
            numQuestions,
            createdAt: new Date().toISOString(),
            questions: this.generateQuizQuestions(topic, difficulty, numQuestions, type),
            attempts: [],
            bestScore: null
        };

        this.quizzes[userId].push(quiz);
        this.saveJSON(QUIZZES_FILE, this.quizzes);

        logger.debug(`Quiz generated for ${userId}: ${topic}`);

        return {
            message: `📝 Quiz generated: "${topic}" (${difficulty}, ${numQuestions} questions)`,
            quiz,
            instructions: 'Answer each question. Use saveQuizResult() when done to track your score!'
        };
    }

    /**
     * Generate quiz questions (templates - LLM can provide better ones)
     */
    generateQuizQuestions(topic, difficulty, numQuestions, type) {
        const questions = [];
        const questionTypes = type === 'mixed'
            ? ['mcq', 'true-false', 'short-answer']
            : [type];

        for (let i = 0; i < numQuestions; i++) {
            const qType = questionTypes[i % questionTypes.length];

            questions.push({
                id: this.generateId(),
                number: i + 1,
                type: qType,
                question: `[Question ${i + 1} about ${topic}]`, // Placeholder - agent should fill this
                options: qType === 'mcq' ? ['A)', 'B)', 'C)', 'D)'] : null,
                correctAnswer: null, // To be filled by agent
                explanation: null,
                userAnswer: null,
                isCorrect: null
            });
        }

        return questions;
    }

    /**
     * Get quizzes for a user
     */
    getQuizzes({topic = null, limit = 10}, userId) {
        const userQuizzes = this.quizzes[userId] || [];

        let filtered = topic
            ? userQuizzes.filter(q => q.topic.toLowerCase().includes(topic.toLowerCase()))
            : userQuizzes;

        // Sort by most recent
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        filtered = filtered.slice(0, limit);

        return {
            count: filtered.length,
            quizzes: filtered.map(q => ({
                id: q.id,
                topic: q.topic,
                difficulty: q.difficulty,
                numQuestions: q.numQuestions,
                attempts: q.attempts.length,
                bestScore: q.bestScore,
                createdAt: q.createdAt
            }))
        };
    }

    /**
     * Save quiz attempt result
     */
    saveQuizResult({quizId, score, totalQuestions, answers = []}, userId) {
        const userQuizzes = this.quizzes[userId] || [];
        const quiz = userQuizzes.find(q => q.id === quizId);

        if (!quiz) {
            return {success: false, message: 'Quiz not found'};
        }

        const attempt = {
            id: this.generateId(),
            score,
            totalQuestions,
            percentage: Math.round((score / totalQuestions) * 100),
            answers,
            attemptedAt: new Date().toISOString()
        };

        quiz.attempts.push(attempt);

        if (!quiz.bestScore || attempt.percentage > quiz.bestScore) {
            quiz.bestScore = attempt.percentage;
        }

        this.saveJSON(QUIZZES_FILE, this.quizzes);

        const emoji = attempt.percentage >= 80 ? '🌟' : attempt.percentage >= 60 ? '👍' : '💪';
        return {
            success: true,
            message: `${emoji} Quiz completed! Score: ${score}/${totalQuestions} (${attempt.percentage}%)`,
            attempt,
            bestScore: quiz.bestScore,
            improvement: quiz.attempts.length > 1
                ? `Your best score is ${quiz.bestScore}%`
                : 'First attempt! Keep practicing!'
        };
    }

    // ═══════════════════════════════════════════════════════════════
    //                    🧠 MOOD LOGGER TOOLS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Log current mood
     */
    logMood({mood, energy = 5, notes = '', triggers = []}, userId) {
        if (!this.moods[userId]) {
            this.moods[userId] = [];
        }

        // Mood scale: 1-10 or descriptive
        const moodEntry = {
            id: this.generateId(),
            mood, // 'happy', 'stressed', 'anxious', 'calm', 'tired', etc. OR 1-10
            energy, // 1-10 energy level
            notes,
            triggers, // what caused this mood
            timestamp: new Date().toISOString(),
            dayOfWeek: new Date().toLocaleDateString('en-US', {weekday: 'long'}),
            timeOfDay: this.getTimeOfDay()
        };

        this.moods[userId].push(moodEntry);
        this.saveJSON(MOODS_FILE, this.moods);

        logger.debug(`Mood logged for ${userId}: ${mood}`);

        const response = this.getMoodResponse(mood, energy);

        return {
            message: `${response.emoji} Mood logged: ${mood} (Energy: ${energy}/10)`,
            entry: moodEntry,
            suggestion: response.suggestion,
            affirmation: response.affirmation
        };
    }

    /**
     * Get time of day
     */
    getTimeOfDay() {
        const hour = new Date().getHours();
        if (hour < 6) return 'night';
        if (hour < 12) return 'morning';
        if (hour < 17) return 'afternoon';
        if (hour < 21) return 'evening';
        return 'night';
    }

    /**
     * Get mood-specific response
     */
    getMoodResponse(mood, energy) {
        const lowerMood = typeof mood === 'string' ? mood.toLowerCase() : '';

        const responses = {
            stressed: {
                emoji: '😰',
                suggestion: 'Try a 5-minute breathing exercise or take a short walk.',
                affirmation: 'You\'re handling more than you realize. Take it one step at a time.'
            },
            anxious: {
                emoji: '😟',
                suggestion: 'Ground yourself: name 5 things you can see, 4 you can hear, 3 you can touch.',
                affirmation: 'This feeling will pass. You\'ve overcome challenges before.'
            },
            happy: {
                emoji: '😊',
                suggestion: 'Great time to tackle something challenging while motivation is high!',
                affirmation: 'You deserve to feel good! Celebrate this moment.'
            },
            tired: {
                emoji: '😴',
                suggestion: 'Consider a power nap (15-20 min) or light stretching.',
                affirmation: 'Rest is productive. Your brain consolidates learning while you rest.'
            },
            calm: {
                emoji: '😌',
                suggestion: 'Perfect state for deep focus work. Make the most of it!',
                affirmation: 'Inner peace is a superpower. Well done!'
            },
            frustrated: {
                emoji: '😤',
                suggestion: 'Step away for 10 minutes. Fresh perspective often helps.',
                affirmation: 'Frustration means you care. Channel it into determination.'
            },
            motivated: {
                emoji: '🔥',
                suggestion: 'Strike while the iron is hot! Start your most important task NOW.',
                affirmation: 'This energy is precious. You\'re going to do great things!'
            }
        };

        const defaultResponse = {
            emoji: energy >= 7 ? '⚡' : energy >= 4 ? '😐' : '🔋',
            suggestion: energy < 4 ? 'Low energy detected. Consider a break or some fresh air.' : 'Keep going, you\'re doing well!',
            affirmation: 'Every mood is valid. Thanks for checking in with yourself.'
        };

        return responses[lowerMood] || defaultResponse;
    }

    /**
     * Get mood history
     */
    getMoodHistory({days = 7, limit = 50}, userId) {
        const userMoods = this.moods[userId] || [];

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const recent = userMoods
            .filter(m => new Date(m.timestamp) >= cutoffDate)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);

        return {
            period: `Last ${days} days`,
            count: recent.length,
            entries: recent
        };
    }

    /**
     * Get mood trends and insights
     */
    getMoodTrends({days = 30}, userId) {
        const userMoods = this.moods[userId] || [];

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const recent = userMoods.filter(m => new Date(m.timestamp) >= cutoffDate);

        if (recent.length < 3) {
            return {
                message: 'Not enough data for trends. Keep logging your mood!',
                entriesNeeded: 3 - recent.length
            };
        }

        // Analyze patterns
        const moodCounts = {};
        const energyByDay = {};
        const timeOfDayMoods = {morning: [], afternoon: [], evening: [], night: []};

        recent.forEach(entry => {
            // Count moods
            moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;

            // Energy by day of week
            energyByDay[entry.dayOfWeek] = energyByDay[entry.dayOfWeek] || [];
            energyByDay[entry.dayOfWeek].push(entry.energy);

            // Mood by time of day
            if (entry.timeOfDay && timeOfDayMoods[entry.timeOfDay]) {
                timeOfDayMoods[entry.timeOfDay].push(entry.energy);
            }
        });

        // Calculate averages
        const avgEnergyByDay = {};
        Object.keys(energyByDay).forEach(day => {
            const energies = energyByDay[day];
            avgEnergyByDay[day] = (energies.reduce((a, b) => a + b, 0) / energies.length).toFixed(1);
        });

        const avgEnergyByTime = {};
        Object.keys(timeOfDayMoods).forEach(time => {
            const energies = timeOfDayMoods[time];
            if (energies.length > 0) {
                avgEnergyByTime[time] = (energies.reduce((a, b) => a + b, 0) / energies.length).toFixed(1);
            }
        });

        // Find most common mood
        const mostCommonMood = Object.entries(moodCounts)
            .sort((a, b) => b[1] - a[1])[0];

        // Generate insights
        const insights = [];

        const bestTime = Object.entries(avgEnergyByTime)
            .sort((a, b) => b[1] - a[1])[0];
        if (bestTime) {
            insights.push(`Your energy is highest in the ${bestTime[0]} (avg: ${bestTime[1]}/10)`);
        }

        const bestDay = Object.entries(avgEnergyByDay)
            .sort((a, b) => b[1] - a[1])[0];
        if (bestDay) {
            insights.push(`${bestDay[0]}s tend to be your best days (avg energy: ${bestDay[1]}/10)`);
        }

        return {
            period: `Last ${days} days`,
            totalEntries: recent.length,
            mostCommonMood: mostCommonMood ? {mood: mostCommonMood[0], count: mostCommonMood[1]} : null,
            moodDistribution: moodCounts,
            averageEnergyByDay: avgEnergyByDay,
            averageEnergyByTime: avgEnergyByTime,
            insights,
            recommendation: this.getMoodRecommendation(moodCounts, avgEnergyByTime)
        };
    }

    /**
     * Generate mood-based recommendation
     */
    getMoodRecommendation(moodCounts, avgEnergyByTime) {
        const totalEntries = Object.values(moodCounts).reduce((a, b) => a + b, 0);
        const stressedCount = (moodCounts['stressed'] || 0) + (moodCounts['anxious'] || 0);

        if (stressedCount / totalEntries > 0.4) {
            return '🚨 You\'ve been stressed often lately. Consider building in more breaks and self-care time.';
        }

        const bestTime = Object.entries(avgEnergyByTime).sort((a, b) => b[1] - a[1])[0];
        if (bestTime) {
            return `💡 Schedule your most challenging tasks in the ${bestTime[0]} when your energy peaks!`;
        }

        return '✨ Keep tracking your mood to discover more patterns!';
    }

    // ═══════════════════════════════════════════════════════════════
    //                    📅 DEADLINE TRACKER TOOLS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Add a deadline
     */
    addDeadline({title, dueDate, subject, priority = 'medium', description = '', type = 'assignment'}, userId) {
        if (!this.deadlines[userId]) {
            this.deadlines[userId] = [];
        }

        const deadline = {
            id: this.generateId(),
            title,
            dueDate: new Date(dueDate).toISOString(),
            subject,
            priority, // 'low', 'medium', 'high', 'critical'
            description,
            type, // 'assignment', 'exam', 'project', 'quiz', 'other'
            createdAt: new Date().toISOString(),
            completed: false,
            completedAt: null
        };

        this.deadlines[userId].push(deadline);
        this.saveJSON(DEADLINES_FILE, this.deadlines);

        const daysUntil = this.getDaysUntil(dueDate);
        const urgency = daysUntil <= 1 ? '🚨' : daysUntil <= 3 ? '⚠️' : '📅';

        logger.debug(`Deadline added for ${userId}: ${title}`);

        return {
            message: `${urgency} Deadline added: "${title}" - Due ${new Date(dueDate).toLocaleDateString()} (${daysUntil} days)`,
            deadline,
            tip: daysUntil <= 3 ? 'This is coming up soon! Start working on it today.' : 'Good planning! Break it into smaller tasks.'
        };
    }

    /**
     * Calculate days until a date
     */
    getDaysUntil(date) {
        const now = new Date();
        const target = new Date(date);
        const diffTime = target - now;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    /**
     * Get all deadlines
     */
    getDeadlines({includeCompleted = false, subject = null}, userId) {
        const userDeadlines = this.deadlines[userId] || [];

        let filtered = includeCompleted
            ? userDeadlines
            : userDeadlines.filter(d => !d.completed);

        if (subject) {
            filtered = filtered.filter(d =>
                d.subject.toLowerCase().includes(subject.toLowerCase())
            );
        }

        // Sort by due date
        filtered.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

        // Add days until for each
        filtered = filtered.map(d => ({
            ...d,
            daysUntil: this.getDaysUntil(d.dueDate),
            isOverdue: new Date(d.dueDate) < new Date()
        }));

        return {
            count: filtered.length,
            deadlines: filtered
        };
    }

    /**
     * Get upcoming deadlines (next N days)
     */
    getUpcomingDeadlines({days = 7}, userId) {
        const userDeadlines = this.deadlines[userId] || [];

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() + days);

        const upcoming = userDeadlines
            .filter(d => !d.completed && new Date(d.dueDate) <= cutoffDate)
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .map(d => ({
                ...d,
                daysUntil: this.getDaysUntil(d.dueDate),
                isOverdue: new Date(d.dueDate) < new Date()
            }));

        // Categorize by urgency
        const overdue = upcoming.filter(d => d.isOverdue);
        const urgent = upcoming.filter(d => !d.isOverdue && d.daysUntil <= 2);
        const thisWeek = upcoming.filter(d => !d.isOverdue && d.daysUntil > 2);

        return {
            period: `Next ${days} days`,
            total: upcoming.length,
            overdue: {count: overdue.length, items: overdue},
            urgent: {count: urgent.length, items: urgent},
            thisWeek: {count: thisWeek.length, items: thisWeek},
            message: overdue.length > 0
                ? `🚨 You have ${overdue.length} overdue deadline(s)!`
                : urgent.length > 0
                    ? `⚠️ ${urgent.length} deadline(s) due in the next 2 days`
                    : `✅ All good! ${thisWeek.length} deadline(s) this week`
        };
    }

    /**
     * Mark deadline as complete
     */
    markDeadlineComplete({deadlineId}, userId) {
        const userDeadlines = this.deadlines[userId] || [];
        const deadline = userDeadlines.find(d => d.id === deadlineId);

        if (!deadline) {
            return {success: false, message: 'Deadline not found'};
        }

        deadline.completed = true;
        deadline.completedAt = new Date().toISOString();
        this.saveJSON(DEADLINES_FILE, this.deadlines);

        const wasOnTime = new Date(deadline.completedAt) <= new Date(deadline.dueDate);

        return {
            success: true,
            message: `✅ Deadline completed: "${deadline.title}"`,
            wasOnTime,
            encouragement: wasOnTime
                ? '🎉 Great job finishing on time!'
                : '👍 Better late than never! You got it done.'
        };
    }

    // ═══════════════════════════════════════════════════════════════
    //                    🔍 WEB SEARCH TOOL
    // ═══════════════════════════════════════════════════════════════

    /**
     * Search the web (using DuckDuckGo Instant Answer API - no API key needed)
     */
    async webSearch({query, maxResults = 5}, userId) {
        logger.debug(`Web search for ${userId}: ${query}`);

        try {
            // Use DuckDuckGo Instant Answer API (free, no API key)
            const encodedQuery = encodeURIComponent(query);
            const url = `https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1&skip_disambig=1`;

            const response = await fetch(url);
            const data = await response.json();

            const results = [];

            // Abstract (main answer)
            if (data.Abstract) {
                results.push({
                    type: 'answer',
                    title: data.Heading || query,
                    snippet: data.Abstract,
                    source: data.AbstractSource,
                    url: data.AbstractURL
                });
            }

            // Related topics
            if (data.RelatedTopics && data.RelatedTopics.length > 0) {
                data.RelatedTopics.slice(0, maxResults - results.length).forEach(topic => {
                    if (topic.Text) {
                        results.push({
                            type: 'related',
                            title: topic.Text.split(' - ')[0],
                            snippet: topic.Text,
                            url: topic.FirstURL
                        });
                    }
                });
            }

            // Instant answer
            if (data.Answer) {
                results.unshift({
                    type: 'instant',
                    title: 'Quick Answer',
                    snippet: data.Answer,
                    source: 'DuckDuckGo'
                });
            }

            if (results.length === 0) {
                return {
                    success: true,
                    message: `No instant results for "${query}". Try a more specific search.`,
                    results: [],
                    suggestion: `For more comprehensive results, search directly: https://duckduckgo.com/?q=${encodedQuery}`
                };
            }

            return {
                success: true,
                query,
                resultCount: results.length,
                results,
                message: `🔍 Found ${results.length} result(s) for "${query}"`
            };
        } catch (error) {
            logger.error('Web search failed', error);
            return {
                success: false,
                error: error.message,
                suggestion: `Search manually: https://duckduckgo.com/?q=${encodeURIComponent(query)}`
            };
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //                    📚 WIKIPEDIA SUMMARY TOOL
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get Wikipedia summary for a topic
     */
    async wikipediaSummary({topic, sentences = 3}, userId) {
        logger.debug(`Wikipedia search for ${userId}: ${topic}`);

        try {
            const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`;
            const response = await fetch(url);

            if (!response.ok) {
                return {
                    success: false,
                    message: `Could not find Wikipedia article for "${topic}"`
                };
            }

            const data = await response.json();

            // Extract sentences
            const summary = data.extract;
            const sentenceArray = summary.split('. ').slice(0, sentences);
            const truncatedSummary = sentenceArray.join('. ') + (sentenceArray.length > 0 ? '.' : '');

            return {
                success: true,
                topic: data.title,
                summary: truncatedSummary,
                fullUrl: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(topic)}`,
                thumbnail: data.thumbnail?.source || null,
                message: `📚 Wikipedia summary for "${data.title}"`
            };
        } catch (error) {
            logger.error('Wikipedia search failed', error);
            return {
                success: false,
                error: error.message,
                suggestion: `Search manually: https://en.wikipedia.org/wiki/${encodeURIComponent(topic)}`
            };
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //                    🎥 YOUTUBE SEARCH TOOL
    // ═══════════════════════════════════════════════════════════════

    /**
     * Search YouTube for educational videos
     * Note: Uses YouTube's oEmbed and search suggestion APIs (no API key needed)
     * For full search, we construct direct search URLs
     */
    async youtubeSearch({query, type = 'educational', maxResults = 5}, userId) {
        logger.debug(`YouTube search for ${userId}: ${query}`);

        try {
            // Enhance query for educational content
            const educationalQuery = type === 'educational'
                ? `${query} tutorial explained`
                : query;

            const encodedQuery = encodeURIComponent(educationalQuery);

            // Since YouTube Data API requires API key, we'll provide curated search links
            // and suggest specific educational channels

            const educationalChannels = [
                {name: '3Blue1Brown', topic: 'math', url: 'https://www.youtube.com/@3blue1brown'},
                {name: 'Khan Academy', topic: 'general', url: 'https://www.youtube.com/@khanacademy'},
                {name: 'CrashCourse', topic: 'general', url: 'https://www.youtube.com/@crashcourse'},
                {name: 'Kurzgesagt', topic: 'science', url: 'https://www.youtube.com/@kurzgesagt'},
                {name: 'Veritasium', topic: 'science', url: 'https://www.youtube.com/@veritasium'},
                {name: 'Numberphile', topic: 'math', url: 'https://www.youtube.com/@numberphile'},
                {name: 'Computerphile', topic: 'computer science', url: 'https://www.youtube.com/@Computerphile'},
                {name: 'freeCodeCamp', topic: 'programming', url: 'https://www.youtube.com/@freecodecamp'},
                {name: 'The Organic Chemistry Tutor', topic: 'chemistry/math', url: 'https://www.youtube.com/@TheOrganicChemistryTutor'},
                {name: 'Professor Leonard', topic: 'calculus', url: 'https://www.youtube.com/@ProfessorLeonard'}
            ];

            // Match relevant channels based on query keywords
            const queryLower = query.toLowerCase();
            const relevantChannels = educationalChannels.filter(ch =>
                queryLower.includes(ch.topic) ||
                ch.topic === 'general' ||
                (queryLower.includes('math') && ch.topic === 'math') ||
                (queryLower.includes('code') && ch.topic === 'programming') ||
                (queryLower.includes('program') && ch.topic === 'programming')
            ).slice(0, 3);

            return {
                success: true,
                query,
                message: `🎥 YouTube search results for "${query}"`,
                directSearch: {
                    url: `https://www.youtube.com/results?search_query=${encodedQuery}`,
                    description: 'Click to search on YouTube'
                },
                filteredSearch: {
                    url: `https://www.youtube.com/results?search_query=${encodedQuery}&sp=EgIQAw%253D%253D`,
                    description: 'Search filtered by educational channels'
                },
                recommendedChannels: relevantChannels.length > 0 ? relevantChannels : educationalChannels.slice(0, 3),
                searchTips: [
                    'Add "explained" or "tutorial" for better results',
                    'Add "for beginners" if you\'re new to the topic',
                    'Look for videos from verified educational channels',
                    'Check video length - longer videos often go deeper'
                ],
                specificSearches: [
                    {
                        label: 'Short explanations (< 4 min)',
                        url: `https://www.youtube.com/results?search_query=${encodedQuery}&sp=EgIYAQ%253D%253D`
                    },
                    {
                        label: 'Full lectures (> 20 min)',
                        url: `https://www.youtube.com/results?search_query=${encodedQuery}&sp=EgIYAg%253D%253D`
                    }
                ]
            };
        } catch (error) {
            logger.error('YouTube search failed', error);
            return {
                success: false,
                error: error.message,
                fallback: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
            };
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //                    HELPER FOR AGENTS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Format tools for LLM prompt
     */
    getToolsPrompt() {
        return `
═══════════════════════════════════════════════════════════════
                    AVAILABLE TOOLS
═══════════════════════════════════════════════════════════════

You can use these tools by including a TOOL_CALL in your response:

📅 REMINDERS:
- setReminder(title, datetime, description) - Set a reminder
- getReminders() - Get all pending reminders
- deleteReminder(reminderId) - Delete a reminder

📝 NOTES:
- saveNote(title, content, tags) - Save a note
- getNotes(tag) - Get notes (optionally by tag)
- searchNotes(query) - Search notes

📚 STUDY PLANS:
- createStudyPlan(subject, duration, frequency, startDate) - Create study schedule
- getStudyPlan(subject) - Get study plan
- getTodaysTasks() - Get today's scheduled tasks
- markTaskComplete(taskId) - Mark task as done

🍅 POMODORO TIMER:
- startPomodoro(subject, duration=25, breakTime=5) - Start focus session
- endPomodoro(completed, notes) - End current session
- getPomodoroStats(period) - Get focus stats (today/week/month)

📝 QUIZ GENERATOR:
- generateQuiz(topic, difficulty, numQuestions, type) - Create a quiz
- getQuizzes(topic, limit) - Get past quizzes
- saveQuizResult(quizId, score, totalQuestions) - Save quiz score

🧠 MOOD TRACKER:
- logMood(mood, energy, notes, triggers) - Log current mood
- getMoodHistory(days, limit) - Get mood history
- getMoodTrends(days) - Get insights and patterns

📅 DEADLINE TRACKER:
- addDeadline(title, dueDate, subject, priority, type) - Add deadline
- getDeadlines(includeCompleted, subject) - Get all deadlines
- getUpcomingDeadlines(days) - Get upcoming deadlines
- markDeadlineComplete(deadlineId) - Mark as done

🔍 SEARCH & RESEARCH:
- webSearch(query, maxResults) - Search the web
- wikipediaSummary(topic, sentences) - Get Wikipedia info
- youtubeSearch(query, type, maxResults) - Find educational videos

To call a tool, include in your response:
[TOOL_CALL: toolName(param1="value1", param2="value2")]

Examples:
[TOOL_CALL: setReminder(title="Math exam prep", datetime="2024-01-15T10:00:00")]
[TOOL_CALL: startPomodoro(subject="Physics", duration=25)]
[TOOL_CALL: logMood(mood="stressed", energy=4, notes="exam tomorrow")]
[TOOL_CALL: addDeadline(title="Essay due", dueDate="2024-01-20", subject="English", priority="high")]
[TOOL_CALL: wikipediaSummary(topic="Photosynthesis")]
[TOOL_CALL: youtubeSearch(query="calculus integration tutorial")]
`;
    }
}

// Export singleton
module.exports = new ToolExecutor();
