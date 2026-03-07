/**
 * 🧠 MOOD REPOSITORY
 */
const {BaseRepository} = require('./BaseRepository');

class MoodRepository extends BaseRepository {
    constructor() {
        super('moods.json', {});
    }

    async getRecent(userId, days = 7, limit = 50) {
        const items = await this.getByUserId(userId);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        return items
            .filter(m => new Date(m.timestamp || m.createdAt) >= cutoff)
            .sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt))
            .slice(0, limit);
    }

    async getByDateRange(userId, startDate, endDate) {
        const items = await this.getByUserId(userId);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return items.filter(m => {
            const d = new Date(m.timestamp || m.createdAt);
            return d >= start && d <= end;
        });
    }
}

module.exports = new MoodRepository();
