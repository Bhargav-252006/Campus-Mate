import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Helper for requests
const api = axios.create({
    baseURL: API_URL,
    headers: {'Content-Type': 'application/json'}
});

// User ID (in real app, get from auth)
const getUserId = () => 'user-123';

// ============ CHAT ============
export const sendMessageToAgent = async (message) => {
    const response = await api.post('/chat', {
        message,
        userId: getUserId()
    });
    return response.data;
};

export const getChatHistory = async () => {
    try {
        const response = await api.get(`/chat/history?userId=${getUserId()}`);
        return response.data;
    } catch {
        return [];
    }
};

export const clearChatHistory = async () => {
    await api.delete(`/chat/history?userId=${getUserId()}`);
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
