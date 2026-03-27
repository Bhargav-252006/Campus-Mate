/**
 * ⏰ REMINDER TOOLS - Set, get, delete reminders
 *
 * A1-A2 fix: Delegates to reminderRepo (single source of truth for reminders.json)
 */
const {logger} = require('./base');
const {reminderRepo} = require('../repositories');

async function setReminder({title, datetime, description = ''}, userId) {
    if (!title || !title.trim()) {
        return {message: '\u274c Please provide a title for the reminder.', reminder: null};
    }
    if (!datetime || isNaN(new Date(datetime).getTime())) {
        return {message: '\u274c Please provide a valid date/time for the reminder.', reminder: null};
    }

    const reminder = await reminderRepo.add(userId, {
        title, datetime: new Date(datetime).toISOString(),
        description, completed: false
    });

    logger.debug(`Reminder set for ${userId}: ${title}`);
    return {
        message: `✅ Reminder set: "${title}" for ${new Date(datetime).toLocaleString()}`,
        reminder
    };
}

async function getReminders({includeCompleted = false}, userId) {
    const userReminders = await reminderRepo.getByUserId(userId);
    const filtered = includeCompleted ? userReminders : userReminders.filter(r => !r.completed);
    filtered.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
    return {count: filtered.length, reminders: filtered};
}

async function deleteReminder({reminderId}, userId) {
    const reminder = await reminderRepo.getById(userId, reminderId);
    if (!reminder) return {success: false, message: 'Reminder not found'};
    await reminderRepo.remove(userId, reminderId);
    return {success: true, message: `Deleted reminder: "${reminder.title}"`};
}

// A1-A2 fix: _getData now returns data from the repo (single source of truth)
function _getData() {
    // reminderRepo.data is the in-memory cache — return a shallow copy
    const copy = {};
    for (const userId of Object.keys(reminderRepo.data)) {
        const items = reminderRepo.data[userId];
        copy[userId] = Array.isArray(items) ? [...items] : [];
    }
    return copy;
}

module.exports = {setReminder, getReminders, deleteReminder, _getData};
