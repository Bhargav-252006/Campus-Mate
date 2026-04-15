/**
 * 🗄️ BASE REPOSITORY - Thin async wrapper for JSON storage
 *
 * All domain repositories extend this. Today it reads/writes JSON files;
 * tomorrow you swap the internals to SQLite / Mongo without touching
 * business logic in tools or services.
 *
 * P6 fix: Added prune() / pruneAll() to cap unbounded data growth.
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const DATA_DIR = path.join(__dirname, '../../data');

// P6: Default max items per user. Repos can override via this.maxItemsPerUser.
const DEFAULT_MAX_ITEMS_PER_USER = 500;

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, {recursive: true});
}

class BaseRepository {
    /**
     * @param {string} filename - JSON file name inside data/
     * @param {*} defaultData - default shape when file doesn't exist
     */
    constructor(filename, defaultData = {}) {
        this.filepath = path.join(DATA_DIR, filename);
        this.data = this._loadSync(defaultData);
        this._saveTimeout = null;
        this._dirty = false;
        this.maxItemsPerUser = DEFAULT_MAX_ITEMS_PER_USER;
    }

    // ── Read ─────────────────────────────────────────────────

    _loadSync(defaultData) {
        try {
            if (fs.existsSync(this.filepath)) {
                return JSON.parse(fs.readFileSync(this.filepath, 'utf-8'));
            }
        } catch (err) {
            logger.error(`BaseRepository: failed loading ${this.filepath}`, err);
        }
        return defaultData;
    }

    // ── Write (debounced) ────────────────────────────────────

    _scheduleSave() {
        this._dirty = true;
        if (this._saveTimeout) return;
        this._saveTimeout = setTimeout(() => {
            this._performSave();
            this._saveTimeout = null;
        }, 500);
    }

    _performSave() {
        if (!this._dirty) return;
        fs.promises
            .writeFile(this.filepath, JSON.stringify(this.data, null, 2))
            .then(() => {this._dirty = false;})
            .catch(err => logger.error(`BaseRepository: save failed ${this.filepath}`, err));
    }

    forceSave() {
        if (this._saveTimeout) {
            clearTimeout(this._saveTimeout);
            this._saveTimeout = null;
        }
        if (!this._dirty) return;
        try {
            fs.writeFileSync(this.filepath, JSON.stringify(this.data, null, 2));
            this._dirty = false;
        } catch (err) {
            logger.error(`BaseRepository: forceSave failed ${this.filepath}`, err);
        }
    }

    // ── Generic CRUD helpers (userId-keyed arrays) ───────────

    _ensureUser(userId) {
        if (!this.data[userId]) this.data[userId] = [];
    }

    async getByUserId(userId) {
        this._ensureUser(userId);
        return this.data[userId];
    }

    async getById(userId, id) {
        const items = await this.getByUserId(userId);
        return items.find(item => item.id === id) || null;
    }

    async add(userId, item) {
        this._ensureUser(userId);
        const newItem = {
            ...item,
            id: item.id || this._generateId(),
            createdAt: item.createdAt || new Date().toISOString(),
        };
        this.data[userId].push(newItem);
        this._scheduleSave();
        return newItem;
    }

    async update(userId, id, updates) {
        const items = await this.getByUserId(userId);
        const idx = items.findIndex(i => i.id === id);
        if (idx === -1) return null;
        items[idx] = {...items[idx], ...updates, updatedAt: new Date().toISOString()};
        this._scheduleSave();
        return items[idx];
    }

    async remove(userId, id) {
        const items = await this.getByUserId(userId);
        const idx = items.findIndex(i => i.id === id);
        if (idx === -1) return false;
        items.splice(idx, 1);
        this._scheduleSave();
        return true;
    }

    async clear(userId) {
        this.data[userId] = [];
        this._scheduleSave();
    }

    async listRecentlyUpdated(userId, limit = 10) {
        const items = await this.getByUserId(userId);
        return [...items]
            .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
            .slice(0, limit);
    }

    // ── P6: Pruning ─────────────────────────────────────────

    /**
     * Trim items for a single user to maxItemsPerUser, keeping the newest.
     * Sorts by createdAt descending and drops the oldest overflow.
     * @returns {number} Number of items pruned
     */
    async prune(userId) {
        if (!Array.isArray(this.data[userId])) return 0;
        const items = this.data[userId];
        if (items.length <= this.maxItemsPerUser) return 0;

        items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        const pruned = items.length - this.maxItemsPerUser;
        this.data[userId] = items.slice(0, this.maxItemsPerUser);
        this._scheduleSave();
        logger.info(`Pruned ${pruned} old items for user ${userId} in ${path.basename(this.filepath)}`);
        return pruned;
    }

    /**
     * Prune all users in this repository.
     * @returns {number} Total items pruned across all users
     */
    async pruneAll() {
        let total = 0;
        for (const userId of Object.keys(this.data)) {
            if (Array.isArray(this.data[userId])) {
                total += await this.prune(userId);
            }
        }
        return total;
    }

    // ── Helpers ──────────────────────────────────────────────

    _generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }
}

module.exports = {BaseRepository, DATA_DIR};
