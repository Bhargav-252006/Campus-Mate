/**
 * 🍅 POMODORO TOOLS - Start/end sessions, get stats
 */
const {loadJSON, saveJSON, generateId, dataPath, logger} = require('./base');

const POMODORO_FILE = dataPath('pomodoro.json');
let pomodoro = loadJSON(POMODORO_FILE, {});

function startPomodoro({subject, duration = 25, breakTime = 5}, userId) {
    if (!pomodoro[userId]) {
        pomodoro[userId] = {sessions: [], currentSession: null, totalFocusTime: 0, streak: 0};
    }

    if (pomodoro[userId].currentSession) {
        const active = pomodoro[userId].currentSession;
        return {
            message: `\ud83c\udf45 You already have an active pomodoro for "${active.subject}"! Say "end pomodoro" first.`,
            session: active,
            tips: ['End your current session before starting a new one.']
        };
    }

    const session = {
        id: generateId(), subject, duration, breakTime,
        startedAt: new Date().toISOString(), endedAt: null,
        completed: false, interruptions: 0
    };

    pomodoro[userId].currentSession = session;
    saveJSON(POMODORO_FILE, pomodoro);
    logger.debug(`Pomodoro started for ${userId}: ${subject}`);

    return {
        message: `🍅 Pomodoro started! Focus on "${subject}" for ${duration} minutes.`,
        session,
        tips: ['📵 Put your phone on silent', '🎧 Use focus music if it helps', '💧 Have water nearby', '🚫 Avoid checking messages']
    };
}

function endPomodoro({completed = true, notes = ''}, userId) {
    if (!pomodoro[userId]?.currentSession) {
        return {success: false, message: 'No active pomodoro session'};
    }

    const session = pomodoro[userId].currentSession;
    session.endedAt = new Date().toISOString();
    session.completed = completed;
    session.notes = notes;

    const startTime = new Date(session.startedAt);
    const endTime = new Date(session.endedAt);
    const actualMinutes = Math.round((endTime - startTime) / 60000);
    session.actualMinutes = actualMinutes;

    if (completed) {
        pomodoro[userId].totalFocusTime += actualMinutes;
        pomodoro[userId].streak += 1;
    } else {
        pomodoro[userId].streak = 0;
    }

    pomodoro[userId].sessions.push(session);
    pomodoro[userId].currentSession = null;
    saveJSON(POMODORO_FILE, pomodoro);

    const emoji = completed ? '✅' : '⏹️';
    return {
        success: true,
        message: `${emoji} Pomodoro ${completed ? 'completed' : 'ended'}! You focused for ${actualMinutes} minutes.`,
        session, streak: pomodoro[userId].streak,
        totalFocusTime: pomodoro[userId].totalFocusTime,
        suggestion: completed ? `Great job! Take a ${session.breakTime} minute break! 🧘` : 'No worries! Try again when you\'re ready.'
    };
}

function getPomodoroStats({period = 'week'}, userId) {
    const data = pomodoro[userId] || {sessions: [], totalFocusTime: 0, streak: 0};
    const now = new Date();
    const periodStart = new Date();

    if (period === 'today') periodStart.setHours(0, 0, 0, 0);
    else if (period === 'week') periodStart.setDate(now.getDate() - 7);
    else if (period === 'month') periodStart.setMonth(now.getMonth() - 1);

    const recentSessions = data.sessions.filter(s => new Date(s.startedAt) >= periodStart);
    const completedSessions = recentSessions.filter(s => s.completed);
    const totalMinutes = completedSessions.reduce((sum, s) => sum + (s.actualMinutes || 0), 0);

    const bySubject = {};
    completedSessions.forEach(s => {
        bySubject[s.subject] = (bySubject[s.subject] || 0) + (s.actualMinutes || 0);
    });

    return {
        period, totalSessions: completedSessions.length,
        totalFocusMinutes: totalMinutes,
        totalFocusHours: (totalMinutes / 60).toFixed(1),
        currentStreak: data.streak,
        averageSessionLength: completedSessions.length > 0 ? Math.round(totalMinutes / completedSessions.length) : 0,
        bySubject, currentSession: data.currentSession,
        message: `🍅 You've completed ${completedSessions.length} pomodoros (${(totalMinutes / 60).toFixed(1)} hours) this ${period}!`
    };
}

module.exports = {startPomodoro, endPomodoro, getPomodoroStats};
