/**
 * 🍅 POMODORO REPOSITORY
 */
const {BaseRepository} = require('./BaseRepository');

class PomodoroRepository extends BaseRepository {
    constructor() {
        super('pomodoro.json', {});
    }

    /** Override _ensureUser to set the right shape (object, not array) */
    _ensureUser(userId) {
        if (!this.data[userId]) {
            this.data[userId] = {sessions: [], currentSession: null, totalFocusTime: 0, streak: 0};
        }
    }

    async getUserData(userId) {
        this._ensureUser(userId);
        return this.data[userId];
    }

    async setUserData(userId, data) {
        this.data[userId] = data;
        this._scheduleSave();
    }

    async getSessionsByPeriod(userId, periodStart) {
        const userData = await this.getUserData(userId);
        return (userData.sessions || []).filter(s => new Date(s.startedAt) >= periodStart);
    }

    // Override generic CRUD since pomodoro shape is non-standard
    async getByUserId(userId) {
        return this.getUserData(userId);
    }
}

module.exports = new PomodoroRepository();
