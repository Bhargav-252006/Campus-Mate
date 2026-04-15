import axios from 'axios';

const normalizeBaseUrl = (url) => url.replace(/\/+$/, '');
const envApiUrl = (import.meta.env.VITE_API_URL || '').trim();
const shouldSkipEnvApiUrl = (url) => /^https:\/\/localhost(?::\d+)?$/i.test(url);
const SESSION_STORAGE_KEY = 'campusMate_userId';
const LEGACY_SESSION_STORAGE_KEY = 'student_mate_userId';
const CONVERSATION_STORAGE_KEY = 'campusMate_conversationId';

const getApiBaseCandidates = () => {
    const candidates = [];

    if (envApiUrl && !shouldSkipEnvApiUrl(envApiUrl)) {
        candidates.push(normalizeBaseUrl(envApiUrl));
    }

    // Preferred default when served behind nginx in docker.
    candidates.push('/api');

    // Local fallback for direct gateway access in dev.
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        candidates.push('http://localhost:3000');
    }

    return [...new Set(candidates.filter(Boolean))];
};

const API_BASE_CANDIDATES = getApiBaseCandidates();
let activeApiBaseIndex = 0;

const getActiveApiBase = () => API_BASE_CANDIDATES[activeApiBaseIndex] || '/api';

const rotateApiBase = () => {
    if (activeApiBaseIndex < API_BASE_CANDIDATES.length - 1) {
        activeApiBaseIndex += 1;
        return true;
    }
    return false;
};

// Helper for requests
const api = axios.create({
    baseURL: getActiveApiBase(),
    headers: {'Content-Type': 'application/json'},
    withCredentials: true
});

// ============ AUTH & SESSION ============
let sessionUserId = localStorage.getItem(SESSION_STORAGE_KEY) || null;

const ensureSessionUserId = () => {
    if (sessionUserId) {
        return sessionUserId;
    }

    const legacyUserId = localStorage.getItem(LEGACY_SESSION_STORAGE_KEY);
    if (legacyUserId) {
        sessionUserId = legacyUserId;
        localStorage.setItem(SESSION_STORAGE_KEY, sessionUserId);
        return sessionUserId;
    }

    const generatedUserId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    sessionUserId = generatedUserId;
    localStorage.setItem(SESSION_STORAGE_KEY, sessionUserId);
    localStorage.setItem(LEGACY_SESSION_STORAGE_KEY, sessionUserId);
    return sessionUserId;
};

// Attach token to all requests if available
api.interceptors.request.use((config) => {
    const requestPath = config.url || '';
    const isSessionInit = requestPath.includes('/auth/session');

    if (sessionUserId && !isSessionInit) {
        config.headers['x-user-id'] = sessionUserId;
    }
    return config;
});

// Handle 401 responses: keep the browser identity so the user can re-authenticate
// without losing access to the same history namespace.
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        // On network errors, switch to next known API base and retry once.
        if (!error.response && !error.config?._baseRetryAttempted && rotateApiBase()) {
            error.config._baseRetryAttempted = true;
            api.defaults.baseURL = getActiveApiBase();
            error.config.baseURL = getActiveApiBase();
            return api(error.config);
        }

        if (error.response?.status === 401) {
            sessionUserId = localStorage.getItem(SESSION_STORAGE_KEY) || sessionUserId;
        }
        return Promise.reject(error);
    }
);

// Auto-create session on first load
export const initSession = async () => {
    try {
        const persistentUserId = ensureSessionUserId();
        const response = await api.post('/auth/session', {userId: persistentUserId});
        sessionUserId = response.data.userId || persistentUserId;
        localStorage.setItem(SESSION_STORAGE_KEY, sessionUserId);
        localStorage.setItem(LEGACY_SESSION_STORAGE_KEY, sessionUserId);
        return response.data;
    } catch (err) {
        console.warn('Session init failed');
        throw err;
    }
};

export const getSessionUserId = () => sessionUserId;

export const getConversationId = () => localStorage.getItem(CONVERSATION_STORAGE_KEY) || null;

export const setConversationId = (conversationId) => {
    if (conversationId) {
        localStorage.setItem(CONVERSATION_STORAGE_KEY, conversationId);
    }
};

export const clearConversationId = () => {
    localStorage.removeItem(CONVERSATION_STORAGE_KEY);
};

// ============ CHAT ============
// Server derives userId from JWT token — no need to send in body/query
export const sendMessageToAgent = async (message, userId, clientRequestId) => {
    const conversationId = getConversationId();
    const response = await api.post('/chat', {
        message,
        conversationId,
        clientRequestId
    });

    if (response.data?.conversationId) {
        setConversationId(response.data.conversationId);
    }

    return {
        ...response.data,
        response: response.data.response || response.data.message || ''
    };
};

export const getChatHistory = async (userId, conversationId = null) => {
    try {
        const response = await api.get('/chat/history', {
            params: conversationId ? {conversationId} : {}
        });
        return response.data;
    } catch (err) {
        console.warn('Failed to load chat history', err?.message);
        return [];
    }
};

export const clearChatHistory = async (userId) => {
    await api.delete('/chat/history');
    clearConversationId();
};

// ============ TIMETABLE ============
export const getTimetable = async () => {
    try {
        const response = await api.get('/timetable');
        return response.data;
    } catch (err) {
        console.warn('Failed to load timetable', err?.message);
        return [];
    }
};

export const addTimetableEntry = async (entry) => {
    const response = await api.post('/timetable', entry);
    return response.data;
};

export const updateTimetableEntry = async (id, entry) => {
    const response = await api.put(`/timetable/${id}`, entry);
    return response.data;
};

export const deleteTimetableEntry = async (id) => {
    await api.delete(`/timetable/${id}`);
};

// ============ EXAMS ============
export const getExams = async () => {
    try {
        const response = await api.get('/exams');
        return response.data;
    } catch (err) {
        console.warn('Failed to load exams', err?.message);
        return [];
    }
};

export const addExam = async (exam) => {
    const response = await api.post('/exams', exam);
    return response.data;
};

export const updateExam = async (id, exam) => {
    const response = await api.put(`/exams/${id}`, exam);
    return response.data;
};

export const deleteExam = async (id) => {
    await api.delete(`/exams/${id}`);
};

// ============ SCHEDULE (TASKS) ============
export const getSchedule = async () => {
    try {
        const response = await api.get('/schedule');
        return response.data;
    } catch (err) {
        console.warn('Failed to load schedule', err?.message);
        return [];
    }
};

export const addTask = async (task) => {
    const response = await api.post('/schedule', task);
    return response.data;
};

export const updateTask = async (id, task) => {
    const response = await api.put(`/schedule/${id}`, task);
    return response.data;
};

export const deleteTask = async (id) => {
    await api.delete(`/schedule/${id}`);
};

// ============ TOOLS API ============

// Helper to call tools via chat (server derives userId from token)
const callTool = async (message) => {
    const response = await api.post('/chat', {message});
    return response.data;
};

// 🍅 POMODORO
export const startPomodoro = async (subject, duration = 25) => {
    return callTool(`Start a pomodoro for ${subject} for ${duration} minutes`);
};

export const endPomodoro = async () => {
    return callTool('End pomodoro');
};

export const getPomodoroStats = async (period = 'week') => {
    return callTool(`Show my pomodoro stats for this ${period}`);
};

// 🧠 MOOD
export const logMood = async (mood, energy, notes = '') => {
    return callTool(`I'm feeling ${mood}, energy level ${energy}. ${notes}`);
};

export const getMoodHistory = async () => {
    return callTool('Show my mood history');
};

export const getMoodTrends = async () => {
    return callTool('Show my mood trends and patterns');
};

// 📅 DEADLINES
export const addDeadline = async (title, dueDate, subject, priority = 'medium') => {
    return callTool(`Add deadline: ${title} for ${subject} due on ${dueDate}, priority ${priority}`);
};

export const getDeadlines = async () => {
    return callTool('Show my deadlines');
};

export const getUpcomingDeadlines = async () => {
    return callTool("What's due this week?");
};

export const markDeadlineComplete = async (title) => {
    return callTool(`Mark ${title} deadline as complete`);
};

// 📝 NOTES
export const saveNote = async (content) => {
    return callTool(`Save note: ${content}`);
};

export const getNotes = async () => {
    return callTool('Show my notes');
};

export const searchNotes = async (query) => {
    return callTool(`Search my notes for ${query}`);
};

// 📝 QUIZ
export const generateQuiz = async (topic, numQuestions = 5) => {
    return callTool(`Quiz me on ${topic} with ${numQuestions} questions`);
};

// 🔍 SEARCH
export const searchWeb = async (query) => {
    return callTool(`Search for ${query}`);
};

export const searchWikipedia = async (topic) => {
    return callTool(`What is ${topic}?`);
};

export const searchYoutube = async (query) => {
    return callTool(`Find YouTube videos about ${query}`);
};

// 📚 STUDY PLANS
export const createStudyPlan = async (subject) => {
    return callTool(`Create a study plan for ${subject}`);
};

export const getTodaysTasks = async () => {
    return callTool("What should I do today?");
};

// ⏰ REMINDERS
export const setReminder = async (title, datetime) => {
    return callTool(`Remind me to ${title} at ${datetime}`);
};

export const getReminders = async () => {
    return callTool('Show my reminders');
};

export const getEnhancementStats = async () => {
    const res = await api.get('/stats/enhancements');
    return res.data;
};
