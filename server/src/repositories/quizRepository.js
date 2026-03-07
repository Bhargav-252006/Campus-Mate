/**
 * 📝 QUIZ REPOSITORY
 */
const {BaseRepository} = require('./BaseRepository');

class QuizRepository extends BaseRepository {
    constructor() {
        super('quizzes.json', {});
    }

    async getByTopic(userId, topic) {
        const items = await this.getByUserId(userId);
        return items.filter(q => q.topic?.toLowerCase().includes(topic.toLowerCase()));
    }

    async getRecent(userId, limit = 10) {
        const items = await this.getByUserId(userId);
        return [...items]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, limit);
    }
}

module.exports = new QuizRepository();
