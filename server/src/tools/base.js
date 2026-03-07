/**
 * 🔧 TOOL BASE - Shared utilities for all tool modules
 *
 * Provides JSON storage, ID generation, and data directory setup.
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const DATA_DIR = path.join(__dirname, '../../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, {recursive: true});
}

function loadJSON(filePath, defaultValue) {
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        }
    } catch (error) {
        logger.error(`Failed to load ${filePath}`, error);
    }
    return defaultValue;
}

function saveJSON(filePath, data) {
    try {
        fs.promises.writeFile(filePath, JSON.stringify(data, null, 2))
            .catch(err => logger.error(`Failed to save ${filePath}`, err));
    } catch (error) {
        logger.error(`Failed to save ${filePath}`, error);
    }
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function dataPath(filename) {
    return path.join(DATA_DIR, filename);
}

module.exports = {DATA_DIR, loadJSON, saveJSON, generateId, dataPath, logger};
