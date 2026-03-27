/**
 * 📅 DEADLINE TOOLS - Add, get, complete deadlines
 *
 * A1-A2 fix: Delegates to deadlineRepo (single source of truth for deadlines.json)
 */
const {logger} = require('./base');
const {deadlineRepo} = require('../repositories');

function getDaysUntil(date) {
    const now = new Date();
    const target = new Date(date);
    const diffTime = target - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

async function addDeadline({title, dueDate, subject, priority = 'medium', description = '', type = 'assignment'}, userId) {
    if (!title || !title.trim()) {
        return {message: '\u274c Please provide a title for the deadline.', deadline: null, tip: 'Try: "My essay is due on January 15th"'};
    }
    if (!dueDate || isNaN(new Date(dueDate).getTime())) {
        return {message: '\u274c Invalid due date. Please provide a valid date.', deadline: null, tip: 'Try: "due on March 5th" or "due on 03/05"'};
    }

    const deadline = await deadlineRepo.add(userId, {
        title, dueDate: new Date(dueDate).toISOString(),
        subject, priority, description, type,
        completed: false, completedAt: null
    });

    const daysUntil = getDaysUntil(dueDate);
    const urgency = daysUntil <= 1 ? '🚨' : daysUntil <= 3 ? '⚠️' : '📅';
    logger.debug(`Deadline added for ${userId}: ${title}`);

    return {
        message: `${urgency} Deadline added: "${title}" - Due ${new Date(dueDate).toLocaleDateString()} (${daysUntil} days)`,
        deadline,
        tip: daysUntil <= 3 ? 'This is coming up soon! Start working on it today.' : 'Good planning! Break it into smaller tasks.'
    };
}

async function getDeadlines({includeCompleted = false, subject = null}, userId) {
    const userDeadlines = await deadlineRepo.getByUserId(userId);
    let filtered = includeCompleted ? userDeadlines : userDeadlines.filter(d => !d.completed);

    if (subject) {
        filtered = filtered.filter(d => d.subject && d.subject.toLowerCase().includes(subject.toLowerCase()));
    }

    filtered.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    filtered = filtered.map(d => ({...d, daysUntil: getDaysUntil(d.dueDate), isOverdue: new Date(d.dueDate) < new Date()}));

    return {count: filtered.length, deadlines: filtered};
}

async function getUpcomingDeadlines({days = 7}, userId) {
    const userDeadlines = await deadlineRepo.getByUserId(userId);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + days);

    const upcoming = userDeadlines
        .filter(d => !d.completed && new Date(d.dueDate) <= cutoffDate)
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .map(d => ({...d, daysUntil: getDaysUntil(d.dueDate), isOverdue: new Date(d.dueDate) < new Date()}));

    const overdue = upcoming.filter(d => d.isOverdue);
    const urgent = upcoming.filter(d => !d.isOverdue && d.daysUntil <= 2);
    const thisWeek = upcoming.filter(d => !d.isOverdue && d.daysUntil > 2);

    return {
        period: `Next ${days} days`, total: upcoming.length,
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

async function markDeadlineComplete({deadlineId}, userId) {
    const deadline = await deadlineRepo.getById(userId, deadlineId);
    if (!deadline) return {success: false, message: 'Deadline not found'};

    await deadlineRepo.markComplete(userId, deadlineId);

    const wasOnTime = new Date() <= new Date(deadline.dueDate);
    return {
        success: true, message: `✅ Deadline completed: "${deadline.title}"`, wasOnTime,
        encouragement: wasOnTime ? '🎉 Great job finishing on time!' : '👍 Better late than never! You got it done.'
    };
}

module.exports = {addDeadline, getDeadlines, getUpcomingDeadlines, markDeadlineComplete};
