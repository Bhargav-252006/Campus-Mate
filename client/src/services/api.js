import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper for requests
const api = axios.create({
    baseURL: API_URL,
    headers: {'Content-Type': 'application/json'}
});

// ============ AUTH & SESSION ============
let sessionToken = localStorage.getItem('campusMate_token');
let sessionUserId = localStorage.getItem('campusMate_userId') || 'user-123';

// Attach token to all requests if available
api.interceptors.request.use((config) => {
    if (sessionToken) {
        config.headers.Authorization = `Bearer ${sessionToken}`;
    }
    return config;
});

// Auto-create session on first load
export const initSession = async (preferredUserId) => {
    try {
        const response = await api.post('/auth/session', {
            userId: preferredUserId || sessionUserId
        });
        sessionToken = response.data.token;
        sessionUserId = response.data.userId;
        localStorage.setItem('campusMate_token', sessionToken);
        localStorage.setItem('campusMate_userId', sessionUserId);
        return response.data;
    } catch (err) {
        console.warn('Session init failed, using fallback userId');
        return {userId: sessionUserId, token: null};
    }
};

export const getSessionUserId = () => sessionUserId;

// User ID - uses session userId
const getUserId = (id) => id || sessionUserId;

// ============ CHAT ============
export const sendMessageToAgent = async (message, userId, clientRequestId) => {
    const response = await api.post('/chat', {
        message,
        userId: getUserId(userId),
        clientRequestId
    });
    return response.data;
};

export const getChatHistory = async (userId) => {
    try {
        const response = await api.get(`/chat/history?userId=${getUserId(userId)}`);
        return response.data;
    } catch {
        return [];
    }
};

export const clearChatHistory = async (userId) => {
    await api.delete(`/chat/history?userId=${getUserId(userId)}`);
};

// ============ TIMETABLE ============
export const getTimetable = async () => {
    try {
        const response = await api.get(`/timetable?userId=${getUserId()}`);
        return response.data;
    } catch {
        return [];
    }
};

export const addTimetableEntry = async (entry) => {
    const response = await api.post('/timetable', {...entry, userId: getUserId()});
    return response.data;
};

export const updateTimetableEntry = async (id, entry) => {
    const response = await api.put(`/timetable/${id}`, {...entry, userId: getUserId()});
    return response.data;
};

export const deleteTimetableEntry = async (id) => {
    await api.delete(`/timetable/${id}?userId=${getUserId()}`);
};

// ============ EXAMS ============
export const getExams = async () => {
    try {
        const response = await api.get(`/exams?userId=${getUserId()}`);
        return response.data;
    } catch {
        return [];
    }
};

export const addExam = async (exam) => {
    const response = await api.post('/exams', {...exam, userId: getUserId()});
    return response.data;
};

export const updateExam = async (id, exam) => {
    const response = await api.put(`/exams/${id}`, {...exam, userId: getUserId()});
    return response.data;
};

export const deleteExam = async (id) => {
    await api.delete(`/exams/${id}?userId=${getUserId()}`);
};

// ============ SCHEDULE (TASKS) ============
export const getSchedule = async () => {
    try {
        const response = await api.get(`/schedule?userId=${getUserId()}`);
        return response.data;
    } catch {
        return [];
    }
};

export const addTask = async (task) => {
    const response = await api.post('/schedule', {...task, userId: getUserId()});
    return response.data;
};

export const updateTask = async (id, task) => {
    const response = await api.put(`/schedule/${id}`, {...task, userId: getUserId()});
    return response.data;
};

export const deleteTask = async (id) => {
    await api.delete(`/schedule/${id}?userId=${getUserId()}`);
};

// ============ TOOLS API ============

// Helper to call tools via chat
const callTool = async (message) => {
    const response = await api.post('/chat', {
        message,
        userId: getUserId()
    });
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
