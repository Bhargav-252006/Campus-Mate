const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, {recursive: true});
}

class DataStore {
    constructor(filename) {
        this.filepath = path.join(DATA_DIR, filename);
        this.data = this.load();
    }

    load() {
        try {
            if (fs.existsSync(this.filepath)) {
                const content = fs.readFileSync(this.filepath, 'utf-8');
                return JSON.parse(content);
            }
        } catch (error) {
            console.error(`Error loading ${this.filepath}:`, error);
        }
        return {};
    }

    save() {
        try {
            fs.writeFileSync(this.filepath, JSON.stringify(this.data, null, 2));
        } catch (error) {
            console.error(`Error saving ${this.filepath}:`, error);
        }
    }

    // Get all items for a user
    getAll(userId) {
        return this.data[userId] || [];
    }

    // Get single item by ID
    getById(userId, id) {
        const items = this.getAll(userId);
        return items.find(item => item.id === id);
    }

    // Add new item
    add(userId, item) {
        if (!this.data[userId]) {
            this.data[userId] = [];
        }
        const newItem = {
            ...item,
            id: Date.now().toString(),
            createdAt: new Date().toISOString()
        };
        this.data[userId].push(newItem);
        this.save();
        return newItem;
    }

    // Update existing item
    update(userId, id, updates) {
        const items = this.getAll(userId);
        const index = items.findIndex(item => item.id === id);
        if (index !== -1) {
            items[index] = {
                ...items[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            this.data[userId] = items;
            this.save();
            return items[index];
        }
        return null;
    }

    // Delete item
    delete(userId, id) {
        const items = this.getAll(userId);
        const index = items.findIndex(item => item.id === id);
        if (index !== -1) {
            items.splice(index, 1);
            this.data[userId] = items;
            this.save();
            return true;
        }
        return false;
    }

    // Clear all items for a user
    clear(userId) {
        this.data[userId] = [];
        this.save();
    }
}

// Create stores for each data type
const timetableStore = new DataStore('timetable.json');
const examsStore = new DataStore('exams.json');
const scheduleStore = new DataStore('schedule.json');
const chatHistoryStore = new DataStore('chat-history.json');

module.exports = {
    timetableStore,
    examsStore,
    scheduleStore,
    chatHistoryStore
};
