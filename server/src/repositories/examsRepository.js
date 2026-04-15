/**
 * 📝 EXAMS REPOSITORY
 * A1-A2 fix: Replaces DataStore('exams.json') as single source of truth.
 */
const {BaseRepository} = require('./BaseRepository');

class ExamsRepository extends BaseRepository {
    constructor() {
        super('exams.json', {});
    }

    async getUpcoming(userId) {
        const items = await this.getByUserId(userId);
        const now = new Date();
        return items
            .filter(e => new Date(e.date) >= now)
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    }
}

module.exports = new ExamsRepository();
