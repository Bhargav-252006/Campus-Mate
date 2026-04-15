/**
 * 📋 SCHEDULE (TASKS) REPOSITORY
 * A1-A2 fix: Replaces DataStore('schedule.json') as single source of truth.
 */
const {BaseRepository} = require('./BaseRepository');

class ScheduleRepository extends BaseRepository {
    constructor() {
        super('schedule.json', {});
    }

    async getPending(userId) {
        const items = await this.getByUserId(userId);
        return items.filter(t => !t.completed);
    }
}

module.exports = new ScheduleRepository();
