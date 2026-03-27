/**
 * 📚 STUDY PLAN TOOLS - Create plans, get tasks, mark complete
 *
 * A1-A2 fix: Delegates to studyPlanRepo & reminderRepo
 * (single source of truth for studyPlans.json & reminders.json)
 */
const {generateId, logger} = require('./base');
const {studyPlanRepo, reminderRepo} = require('../repositories');

function generateStudyTasks(subject, duration, frequency, startDate) {
    const tasks = [];
    const start = new Date(startDate);

    for (let i = 0; i < 7; i++) {
        const taskDate = new Date(start);
        taskDate.setDate(taskDate.getDate() + i);

        const shouldAdd = frequency === 'daily' ||
            (frequency === '3 times a week' && [1, 3, 5].includes(taskDate.getDay())) ||
            (frequency === 'weekdays' && taskDate.getDay() >= 1 && taskDate.getDay() <= 5);

        if (shouldAdd) {
            tasks.push({
                id: generateId(), subject, duration,
                scheduledDate: taskDate.toISOString().split('T')[0],
                completed: false, completedAt: null
            });
        }
    }
    return tasks;
}

async function createStudyPlan({subject, duration, frequency, startDate, goals = []}, userId) {
    // E4 fix: Validate startDate, default to today if invalid/missing
    const parsedStart = startDate ? new Date(startDate) : new Date();
    if (isNaN(parsedStart.getTime())) {
        return {message: 'Invalid start date. Please provide a valid date.', plan: null};
    }

    const plan = await studyPlanRepo.add(userId, {
        subject, duration, frequency,
        startDate: parsedStart.toISOString(), goals,
        tasks: generateStudyTasks(subject, duration, frequency, parsedStart),
        active: true
    });

    logger.debug(`Study plan created for ${userId}: ${subject}`);
    return {message: `📚 Study plan created for ${subject}!`, plan};
}

async function getStudyPlan({subject = null}, userId) {
    if (subject) {
        const plan = await studyPlanRepo.getBySubject(userId, subject);
        return plan || {message: `No active study plan found for ${subject}`};
    }
    const activePlans = await studyPlanRepo.getActive(userId);
    return {count: activePlans.length, plans: activePlans};
}

async function getTodaysTasks(params, userId) {
    const today = new Date().toISOString().split('T')[0];
    const todaysTasks = await studyPlanRepo.getTodaysTasks(userId);

    // Also check reminders for today
    const todaysReminders = await reminderRepo.getForDate(userId, today);

    return {
        date: today, studyTasks: todaysTasks, reminders: todaysReminders,
        totalTasks: todaysTasks.length + todaysReminders.length
    };
}

async function markTaskComplete({taskId, planId}, userId) {
    const plans = await studyPlanRepo.getByUserId(userId);
    for (const plan of plans) {
        if (planId && plan.id !== planId) continue;
        const task = (plan.tasks || []).find(t => t.id === taskId);
        if (task) {
            task.completed = true;
            task.completedAt = new Date().toISOString();
            await studyPlanRepo.update(userId, plan.id, {tasks: plan.tasks});
            return {success: true, message: `✅ Great job! Completed: ${plan.subject} study session`};
        }
    }
    return {success: false, message: 'Task not found'};
}

module.exports = {createStudyPlan, getStudyPlan, getTodaysTasks, markTaskComplete};
