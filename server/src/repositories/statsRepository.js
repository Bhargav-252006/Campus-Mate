/**
 * 📊 STATS REPOSITORY - LLM run traces + aggregated stats
 */
const {BaseRepository} = require('./BaseRepository');

class StatsRepository extends BaseRepository {
    constructor() {
        super('stats.json', {traces: [], snapshots: {}});
    }

    /** Log a single LLM request trace */
    async addTrace(trace) {
        if (!this.data.traces) this.data.traces = [];
        this.data.traces.push({
            ...trace,
            timestamp: trace.timestamp || new Date().toISOString(),
        });
        // Keep last 500 traces in memory
        if (this.data.traces.length > 500) {
            this.data.traces = this.data.traces.slice(-500);
        }
        this._scheduleSave();
    }

    /** Get traces optionally filtered */
    async getTraces({userId, limit = 50} = {}) {
        let traces = this.data.traces || [];
        if (userId) traces = traces.filter(t => t.userId === userId);
        return traces.slice(-limit);
    }

    /** Snapshot aggregated stats for a user */
    async saveSnapshot(userId, snapshot) {
        if (!this.data.snapshots) this.data.snapshots = {};
        this.data.snapshots[userId] = {
            ...snapshot,
            savedAt: new Date().toISOString(),
        };
        this._scheduleSave();
    }

    async getSnapshot(userId) {
        return this.data.snapshots?.[userId] || null;
    }
}

module.exports = new StatsRepository();
