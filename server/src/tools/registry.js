/**
 * 🔧 TOOL REGISTRY - Aggregates all domain tools and provides the same
 * interface as the original ToolExecutor (execute, getAvailableTools, getToolsPrompt).
 *
 * Drop-in replacement for utils/toolExecutor.js
 */
const {logger} = require('./base');

// Import all domain tools
const reminders = require('./reminders');
const notes = require('./notes');
const studyPlans = require('./studyPlans');
const pomodoro = require('./pomodoro');
const quiz = require('./quiz');
const mood = require('./mood');
const deadlines = require('./deadlines');
const search = require('./search');

// ── Tool map (name → function) ──────────────────────────────────
const tools = {
    // Reminders
    setReminder: reminders.setReminder,
    getReminders: reminders.getReminders,
    deleteReminder: reminders.deleteReminder,
    // Notes
    saveNote: notes.saveNote,
    getNotes: notes.getNotes,
    searchNotes: notes.searchNotes,
    deleteNote: notes.deleteNote,
    // Study Plans
    createStudyPlan: studyPlans.createStudyPlan,
    getStudyPlan: studyPlans.getStudyPlan,
    getTodaysTasks: studyPlans.getTodaysTasks,
    markTaskComplete: studyPlans.markTaskComplete,
    // Pomodoro
    startPomodoro: pomodoro.startPomodoro,
    endPomodoro: pomodoro.endPomodoro,
    getPomodoroStats: pomodoro.getPomodoroStats,
    // Quiz
    generateQuiz: quiz.generateQuiz,
    getQuizzes: quiz.getQuizzes,
    saveQuizResult: quiz.saveQuizResult,
    // Mood
    logMood: mood.logMood,
    getMoodHistory: mood.getMoodHistory,
    getMoodTrends: mood.getMoodTrends,
    // Deadlines
    addDeadline: deadlines.addDeadline,
    getDeadlines: deadlines.getDeadlines,
    getUpcomingDeadlines: deadlines.getUpcomingDeadlines,
    markDeadlineComplete: deadlines.markDeadlineComplete,
    // Search
    webSearch: search.webSearch,
    wikipediaSummary: search.wikipediaSummary,
    youtubeSearch: search.youtubeSearch
};

// ── execute() ────────────────────────────────────────────────────
async function execute(toolName, params, userId) {
    logger.debug(`Executing tool: ${toolName}`, {params, userId});

    const tool = tools[toolName];
    if (!tool) {
        return {success: false, error: `Unknown tool: ${toolName}`};
    }

    try {
        const result = await tool(params, userId);
        return {success: true, result};
    } catch (error) {
        logger.error(`Tool execution failed: ${toolName}`, error);
        return {success: false, error: error.message};
    }
}

// ── getAvailableTools() ──────────────────────────────────────────
function getAvailableTools() {
    return [
        {name: 'setReminder', description: 'Set a reminder for the student', params: ['title', 'datetime', 'description (optional)']},
        {name: 'getReminders', description: 'Get all reminders for the student', params: []},
        {name: 'deleteReminder', description: 'Delete a reminder by ID', params: ['reminderId']},
        {name: 'saveNote', description: 'Save a note for future reference', params: ['title', 'content', 'tags (optional)']},
        {name: 'getNotes', description: 'Get all notes for the student', params: ['tag (optional)']},
        {name: 'searchNotes', description: 'Search notes by keyword', params: ['query']},
        {name: 'createStudyPlan', description: 'Create a study plan/schedule', params: ['subject', 'duration', 'frequency', 'startDate']},
        {name: 'getTodaysTasks', description: 'Get tasks scheduled for today', params: []},
        {name: 'markTaskComplete', description: 'Mark a task as complete', params: ['taskId']},
        {name: 'startPomodoro', description: 'Start a pomodoro focus session', params: ['subject', 'duration (default 25)', 'breakTime (default 5)']},
        {name: 'endPomodoro', description: 'End current pomodoro session', params: ['completed (boolean)', 'notes (optional)']},
        {name: 'getPomodoroStats', description: 'Get pomodoro statistics', params: ['period (today/week/month)']},
        {name: 'generateQuiz', description: 'Generate a quiz on a topic', params: ['topic', 'difficulty (easy/medium/hard)', 'numQuestions', 'type (mcq/true-false/short-answer/mixed)']},
        {name: 'getQuizzes', description: 'Get past quizzes', params: ['topic (optional)', 'limit']},
        {name: 'saveQuizResult', description: 'Save quiz attempt result', params: ['quizId', 'score', 'totalQuestions', 'answers']},
        {name: 'logMood', description: 'Log current mood', params: ['mood', 'energy (1-10)', 'notes (optional)', 'triggers (optional)']},
        {name: 'getMoodHistory', description: 'Get mood history', params: ['days (default 7)', 'limit']},
        {name: 'getMoodTrends', description: 'Get mood trends and insights', params: ['days (default 30)']},
        {name: 'addDeadline', description: 'Add a deadline/due date', params: ['title', 'dueDate', 'subject', 'priority', 'type (assignment/exam/project)']},
        {name: 'getDeadlines', description: 'Get all deadlines', params: ['includeCompleted', 'subject (optional)']},
        {name: 'getUpcomingDeadlines', description: 'Get upcoming deadlines', params: ['days (default 7)']},
        {name: 'markDeadlineComplete', description: 'Mark deadline as complete', params: ['deadlineId']},
        {name: 'webSearch', description: 'Search the web for information', params: ['query', 'maxResults']},
        {name: 'wikipediaSummary', description: 'Get Wikipedia summary for a topic', params: ['topic', 'sentences (default 5)']},
        {name: 'youtubeSearch', description: 'Search YouTube for educational videos', params: ['query', 'type (educational)', 'maxResults']}
    ];
}

// ── getToolsPrompt() ─────────────────────────────────────────────
function getToolsPrompt() {
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

logger.info('Tool Registry initialized (modular)');

module.exports = {execute, getAvailableTools, getToolsPrompt, tools};
