/**
 * 📋 PROGRESS LEDGER - Multi-Turn Task Tracking
 * 
 * Tracks complex tasks across multiple conversation turns.
 * Inspired by Microsoft's Magentic-One architecture.
 * Maintains task state, progress, and enables re-planning.
 */

const logger = require('./logger');

// ═══════════════════════════════════════════════════════════════
//                    CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const CONFIG = {
    MAX_TASK_AGE_MS: 3600000,      // 1 hour - tasks expire after this
    MAX_STEPS_PER_TASK: 20,        // Maximum steps before forcing completion
    STALL_THRESHOLD: 3,            // Steps without progress = stalled
    AUTO_CLEANUP_INTERVAL: 300000  // Clean up old tasks every 5 min
};

// Task types for categorization
const TASK_TYPES = {
    STUDY_SESSION: 'study_session',
    EXAM_PREP: 'exam_prep',
    PROBLEM_SOLVING: 'problem_solving',
    CONCEPT_LEARNING: 'concept_learning',
    EMOTIONAL_SUPPORT: 'emotional_support',
    PLANNING: 'planning',
    GENERAL: 'general'
};

// ═══════════════════════════════════════════════════════════════
//                    PROGRESS LEDGER CLASS
// ═══════════════════════════════════════════════════════════════

class ProgressLedger {
    constructor() {
        this.tasks = {};           // userId -> current active task
        this.taskHistory = {};     // userId -> completed tasks
        this.globalStats = {
            tasksStarted: 0,
            tasksCompleted: 0,
            tasksAbandoned: 0
        };

        // Start auto-cleanup
        this.startAutoCleanup();
    }

    // ═══════════════════════════════════════════════════════════
    //                    TASK MANAGEMENT
    // ═══════════════════════════════════════════════════════════

    /**
     * Start a new task
     */
    startTask(userId, taskType, goal, metadata = {}) {
        // Complete any existing task first
        if (this.tasks[userId]) {
            this.completeTask(userId, 'replaced');
        }

        const task = {
            id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: taskType,
            goal: goal,
            status: 'in_progress',
            startTime: Date.now(),
            lastUpdateTime: Date.now(),
            steps: [],
            facts: [],           // Discovered facts during task
            plan: [],            // Current plan steps
            metadata: metadata
        };

        this.tasks[userId] = task;
        this.globalStats.tasksStarted++;

        logger.info('Task started', {userId, taskType, goal: goal.slice(0, 50)});

        return task;
    }

    /**
     * Update task progress
     */
    updateProgress(userId, stepDescription, result, metadata = {}) {
        const task = this.tasks[userId];
        if (!task) {
            // No active task - create implicit one
            return null;
        }

        const step = {
            stepNumber: task.steps.length + 1,
            description: stepDescription,
            result: result, // 'success', 'partial', 'no_progress', 'error'
            timestamp: Date.now(),
            agentUsed: metadata.agent,
            metadata: metadata
        };

        task.steps.push(step);
        task.lastUpdateTime = Date.now();

        // Check if task is stalled
        const recentSteps = task.steps.slice(-CONFIG.STALL_THRESHOLD);
        const isStalled = recentSteps.length >= CONFIG.STALL_THRESHOLD &&
            recentSteps.every(s => s.result === 'no_progress' || s.result === 'error');

        if (isStalled) {
            task.status = 'stalled';
            logger.warn('Task stalled', {userId, taskId: task.id});
        }

        // Check if max steps reached
        if (task.steps.length >= CONFIG.MAX_STEPS_PER_TASK) {
            this.completeTask(userId, 'max_steps_reached');
        }

        return {
            task,
            isStalled,
            stepCount: task.steps.length
        };
    }

    /**
     * Add discovered fact to task
     */
    addFact(userId, fact) {
        const task = this.tasks[userId];
        if (task) {
            task.facts.push({
                fact: fact,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Update task plan
     */
    updatePlan(userId, newPlan) {
        const task = this.tasks[userId];
        if (task) {
            task.plan = newPlan;
            task.lastUpdateTime = Date.now();
            logger.debug('Task plan updated', {userId, planSteps: newPlan.length});
        }
    }

    /**
     * Complete a task
     */
    completeTask(userId, reason = 'completed') {
        const task = this.tasks[userId];
        if (!task) return null;

        task.status = reason === 'completed' ? 'completed' : 'abandoned';
        task.endTime = Date.now();
        task.duration = task.endTime - task.startTime;
        task.completionReason = reason;

        // Move to history
        if (!this.taskHistory[userId]) {
            this.taskHistory[userId] = [];
        }
        this.taskHistory[userId].push(task);

        // Keep only last 10 tasks in history
        if (this.taskHistory[userId].length > 10) {
            this.taskHistory[userId].shift();
        }

        // Update stats
        if (reason === 'completed') {
            this.globalStats.tasksCompleted++;
        } else {
            this.globalStats.tasksAbandoned++;
        }

        delete this.tasks[userId];

        logger.info('Task completed', {
            userId,
            reason,
            duration: task.duration,
            steps: task.steps.length
        });

        return task;
    }

    // ═══════════════════════════════════════════════════════════
    //                    TASK ANALYSIS
    // ═══════════════════════════════════════════════════════════

    /**
     * Get current task for user
     */
    getCurrentTask(userId) {
        return this.tasks[userId] || null;
    }

    /**
     * Check task progress and get recommendations
     */
    analyzeProgress(userId) {
        const task = this.tasks[userId];
        if (!task) {
            return {hasActiveTask: false};
        }

        const analysis = {
            hasActiveTask: true,
            taskId: task.id,
            type: task.type,
            goal: task.goal,
            status: task.status,
            stepCount: task.steps.length,
            duration: Date.now() - task.startTime,
            isStalled: task.status === 'stalled',
            recentProgress: this.getRecentProgress(task),
            recommendation: this.getRecommendation(task)
        };

        return analysis;
    }

    /**
     * Get recent progress summary
     */
    getRecentProgress(task) {
        const recent = task.steps.slice(-5);
        const successCount = recent.filter(s => s.result === 'success').length;
        const partialCount = recent.filter(s => s.result === 'partial').length;

        return {
            recentSteps: recent.length,
            successRate: recent.length > 0
                ? ((successCount + partialCount * 0.5) / recent.length * 100).toFixed(0) + '%'
                : 'N/A',
            lastStepResult: recent[recent.length - 1]?.result || 'none'
        };
    }

    /**
     * Get recommendation based on task state
     */
    getRecommendation(task) {
        if (task.status === 'stalled') {
            return {
                action: 'REPLAN',
                message: 'Task appears stuck. Consider breaking down the problem differently.',
                suggestions: [
                    'Try a simpler approach',
                    'Ask clarifying questions',
                    'Focus on one sub-problem'
                ]
            };
        }

        if (task.steps.length > 10) {
            return {
                action: 'SUMMARIZE',
                message: 'Task is taking many steps. Consider summarizing progress.',
                suggestions: [
                    'Check if original goal is still relevant',
                    'Consider completing current sub-task'
                ]
            };
        }

        return {
            action: 'CONTINUE',
            message: 'Task is progressing normally.',
            suggestions: []
        };
    }

    /**
     * Detect task type from message
     */
    detectTaskType(message) {
        const lowerMessage = message.toLowerCase();

        if (lowerMessage.includes('exam') || lowerMessage.includes('test')) {
            return TASK_TYPES.EXAM_PREP;
        }
        if (lowerMessage.includes('study') || lowerMessage.includes('learn')) {
            return TASK_TYPES.STUDY_SESSION;
        }
        if (lowerMessage.includes('solve') || lowerMessage.includes('problem') ||
            lowerMessage.includes('calculate')) {
            return TASK_TYPES.PROBLEM_SOLVING;
        }
        if (lowerMessage.includes('explain') || lowerMessage.includes('what is') ||
            lowerMessage.includes('how does')) {
            return TASK_TYPES.CONCEPT_LEARNING;
        }
        if (lowerMessage.includes('stress') || lowerMessage.includes('anxious') ||
            lowerMessage.includes('worried') || lowerMessage.includes('feel')) {
            return TASK_TYPES.EMOTIONAL_SUPPORT;
        }
        if (lowerMessage.includes('schedule') || lowerMessage.includes('plan') ||
            lowerMessage.includes('deadline')) {
            return TASK_TYPES.PLANNING;
        }

        return TASK_TYPES.GENERAL;
    }

    // ═══════════════════════════════════════════════════════════
    //                    MAINTENANCE
    // ═══════════════════════════════════════════════════════════

    /**
     * Start auto-cleanup of old tasks
     */
    startAutoCleanup() {
        // P8 fix: Store interval ref so it can be cleared on shutdown
        this._cleanupInterval = setInterval(() => {
            this.cleanupOldTasks();
        }, CONFIG.AUTO_CLEANUP_INTERVAL);
        // Don't keep the process alive just for cleanup
        if (this._cleanupInterval.unref) {
            this._cleanupInterval.unref();
        }
    }

    /**
     * Stop auto-cleanup (call on shutdown)
     */
    stopAutoCleanup() {
        if (this._cleanupInterval) {
            clearInterval(this._cleanupInterval);
            this._cleanupInterval = null;
        }
    }

    /**
     * Clean up expired tasks
     */
    cleanupOldTasks() {
        const now = Date.now();
        let cleaned = 0;

        for (const userId of Object.keys(this.tasks)) {
            const task = this.tasks[userId];
            if (now - task.lastUpdateTime > CONFIG.MAX_TASK_AGE_MS) {
                this.completeTask(userId, 'expired');
                cleaned++;
            }
        }

        if (cleaned > 0) {
            logger.debug('Cleaned up old tasks', {count: cleaned});
        }
    }

    /**
     * Get global statistics
     */
    getStats() {
        return {
            ...this.globalStats,
            activeTasks: Object.keys(this.tasks).length,
            completionRate: this.globalStats.tasksStarted > 0
                ? ((this.globalStats.tasksCompleted / this.globalStats.tasksStarted) * 100).toFixed(1) + '%'
                : 'N/A'
        };
    }

    /**
     * Get task history for user
     */
    getTaskHistory(userId) {
        return this.taskHistory[userId] || [];
    }
}

// Export singleton and task types
module.exports = new ProgressLedger();
module.exports.TASK_TYPES = TASK_TYPES;
