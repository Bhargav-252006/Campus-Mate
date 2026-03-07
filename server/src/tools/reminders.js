/**
 * ⏰ REMINDER TOOLS - Set, get, delete reminders
 */
const {loadJSON, saveJSON, generateId, dataPath, logger} = require('./base');

const REMINDERS_FILE = dataPath('reminders.json');
let reminders = loadJSON(REMINDERS_FILE, {});

function setReminder({title, datetime, description = ''}, userId) {
    if (!title || !title.trim()) {
        return {message: '\u274c Please provide a title for the reminder.', reminder: null};
    }
    if (!datetime || isNaN(new Date(datetime).getTime())) {
        return {message: '\u274c Please provide a valid date/time for the reminder.', reminder: null};
    }

    if (!reminders[userId]) reminders[userId] = [];

    const reminder = {
        id: generateId(), title,
        datetime: new Date(datetime).toISOString(),
        description, createdAt: new Date().toISOString(), completed: false
    };

    reminders[userId].push(reminder);
    saveJSON(REMINDERS_FILE, reminders);
    logger.debug(`Reminder set for ${userId}: ${title}`);

    return {
        message: `✅ Reminder set: "${title}" for ${new Date(datetime).toLocaleString()}`,
        reminder
    };
}

function getReminders({includeCompleted = false}, userId) {
    const userReminders = reminders[userId] || [];
    const filtered = includeCompleted ? userReminders : userReminders.filter(r => !r.completed);
    filtered.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
    return {count: filtered.length, reminders: filtered};
}

function deleteReminder({reminderId}, userId) {
    if (!reminders[userId]) return {success: false, message: 'No reminders found'};
    const index = reminders[userId].findIndex(r => r.id === reminderId);
    if (index === -1) return {success: false, message: 'Reminder not found'};
    const deleted = reminders[userId].splice(index, 1)[0];
    saveJSON(REMINDERS_FILE, reminders);
    return {success: true, message: `Deleted reminder: "${deleted.title}"`};
}

// Expose data ref for cross-tool use (getTodaysTasks)
function _getData() {return reminders;}

module.exports = {setReminder, getReminders, deleteReminder, _getData};
