/**
 * 📚 STUDY PLAN TOOLS - Create plans, get tasks, mark complete
 */
const {loadJSON, saveJSON, generateId, dataPath, logger} = require('./base');
const reminders = require('./reminders');

const STUDY_PLANS_FILE = dataPath('studyPlans.json');
let studyPlans = loadJSON(STUDY_PLANS_FILE, {});

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

function createStudyPlan({subject, duration, frequency, startDate, goals = []}, userId) {
    if (!studyPlans[userId]) studyPlans[userId] = [];

    const plan = {
        id: generateId(), subject, duration, frequency,
        startDate: new Date(startDate).toISOString(), goals,
        tasks: generateStudyTasks(subject, duration, frequency, startDate),
        createdAt: new Date().toISOString(), active: true
    };

    studyPlans[userId].push(plan);
    saveJSON(STUDY_PLANS_FILE, studyPlans);
    logger.debug(`Study plan created for ${userId}: ${subject}`);

    return {message: `📚 Study plan created for ${subject}!`, plan};
}

function getStudyPlan({subject = null}, userId) {
    const userPlans = studyPlans[userId] || [];
    if (subject) {
        const plan = userPlans.find(p =>
            p.subject.toLowerCase() === subject.toLowerCase() && p.active
        );
        return plan || {message: `No active study plan found for ${subject}`};
    }
    return {count: userPlans.filter(p => p.active).length, plans: userPlans.filter(p => p.active)};
}

function getTodaysTasks(params, userId) {
    const today = new Date().toISOString().split('T')[0];
    const userPlans = studyPlans[userId] || [];
    const todaysTasks = [];

    userPlans.forEach(plan => {
        if (!plan.active) return;
        plan.tasks.forEach(task => {
            if (task.scheduledDate === today && !task.completed) {
                todaysTasks.push({...task, subject: plan.subject, planId: plan.id});
            }
        });
    });

    // Also check reminders for today
    const reminderData = reminders._getData();
    const userReminders = reminderData[userId] || [];
    const todaysReminders = userReminders.filter(r => {
        const reminderDate = new Date(r.datetime).toISOString().split('T')[0];
        return reminderDate === today && !r.completed;
    });

    return {
        date: today, studyTasks: todaysTasks, reminders: todaysReminders,
        totalTasks: todaysTasks.length + todaysReminders.length
    };
}

function markTaskComplete({taskId, planId}, userId) {
    const userPlans = studyPlans[userId] || [];
    for (const plan of userPlans) {
        if (planId && plan.id !== planId) continue;
        const task = plan.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = true;
            task.completedAt = new Date().toISOString();
            saveJSON(STUDY_PLANS_FILE, studyPlans);
            return {success: true, message: `✅ Great job! Completed: ${plan.subject} study session`};
        }
    }
    return {success: false, message: 'Task not found'};
}

module.exports = {createStudyPlan, getStudyPlan, getTodaysTasks, markTaskComplete};
