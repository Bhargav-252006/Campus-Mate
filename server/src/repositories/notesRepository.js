/**
 * 📝 NOTES REPOSITORY
 */
const {BaseRepository} = require('./BaseRepository');

class NotesRepository extends BaseRepository {
    constructor() {
        super('notes.json', {});
    }

    async search(userId, query) {
        const items = await this.getByUserId(userId);
        const lower = query.toLowerCase();
        return items.filter(n =>
            n.title?.toLowerCase().includes(lower) ||
            n.content?.toLowerCase().includes(lower) ||
            (n.tags || []).some(t => t.toLowerCase().includes(lower))
        );
    }

    async getByTag(userId, tag) {
        const items = await this.getByUserId(userId);
        return items.filter(n => (n.tags || []).includes(tag.toLowerCase()));
    }
}

module.exports = new NotesRepository();
