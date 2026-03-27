/**
 * 📅 TIMETABLE REPOSITORY
 * A1-A2 fix: Replaces DataStore('timetable.json') as single source of truth.
 */
const {BaseRepository} = require('./BaseRepository');

class TimetableRepository extends BaseRepository {
    constructor() {
        super('timetable.json', {});
    }

    async getByDay(userId, day) {
        const items = await this.getByUserId(userId);
        return items.filter(e => e.day?.toLowerCase() === day.toLowerCase());
    }
}

module.exports = new TimetableRepository();
