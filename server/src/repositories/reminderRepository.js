/**
 * ⏰ REMINDER REPOSITORY
 */
const {BaseRepository} = require('./BaseRepository');

class ReminderRepository extends BaseRepository {
    constructor() {
        super('reminders.json', {});
    }

    async getActive(userId) {
        const items = await this.getByUserId(userId);
        return items
            .filter(r => !r.completed)
            .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
    }

    async getForDate(userId, dateStr) {
        const items = await this.getByUserId(userId);
        return items.filter(r => {
            const d = new Date(r.datetime).toISOString().split('T')[0];
            return d === dateStr && !r.completed;
        });
    }
}

module.exports = new ReminderRepository();
