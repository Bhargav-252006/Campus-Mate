/**
 * 📅 DEADLINE REPOSITORY
 */
const {BaseRepository} = require('./BaseRepository');

class DeadlineRepository extends BaseRepository {
    constructor() {
        super('deadlines.json', {});
    }

    async getActive(userId) {
        const items = await this.getByUserId(userId);
        return items
            .filter(d => !d.completed)
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    }

    async getUpcoming(userId, days = 7) {
        const items = await this.getActive(userId);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() + days);
        return items.filter(d => new Date(d.dueDate) <= cutoff);
    }

    async getOverdue(userId) {
        const items = await this.getActive(userId);
        const now = new Date();
        return items.filter(d => new Date(d.dueDate) < now);
    }

    async markComplete(userId, id) {
        return this.update(userId, id, {
            completed: true,
            completedAt: new Date().toISOString(),
        });
    }
}

module.exports = new DeadlineRepository();
