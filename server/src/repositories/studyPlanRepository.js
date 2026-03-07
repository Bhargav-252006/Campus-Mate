/**
 * 📚 STUDY PLAN REPOSITORY
 */
const {BaseRepository} = require('./BaseRepository');

class StudyPlanRepository extends BaseRepository {
    constructor() {
        super('studyPlans.json', {});
    }

    async getActive(userId) {
        const items = await this.getByUserId(userId);
        return items.filter(p => p.active);
    }

    async getBySubject(userId, subject) {
        const items = await this.getActive(userId);
        return items.find(p => p.subject?.toLowerCase() === subject.toLowerCase()) || null;
    }

    async getTodaysTasks(userId) {
        const today = new Date().toISOString().split('T')[0];
        const plans = await this.getActive(userId);
        const tasks = [];
        for (const plan of plans) {
            for (const task of (plan.tasks || [])) {
                if (task.scheduledDate === today && !task.completed) {
                    tasks.push({...task, subject: plan.subject, planId: plan.id});
                }
            }
        }
        return tasks;
    }
}

module.exports = new StudyPlanRepository();
