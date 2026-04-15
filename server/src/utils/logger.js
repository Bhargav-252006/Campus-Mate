/**
 * 📋 LOGGER - Enhanced logging for Student Mate AI
 * Color-coded console logs for easy error detection
 */

const fs = require('fs');
const path = require('path');

// Log file path
const LOG_DIR = path.join(__dirname, '../../logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');
const ERROR_LOG_FILE = path.join(LOG_DIR, 'error.log');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, {recursive: true});
}

// ANSI color codes for terminal
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bgRed: '\x1b[41m',
    bgYellow: '\x1b[43m'
};

// Emoji indicators
const icons = {
    info: 'ℹ️ ',
    success: '✅',
    warning: '⚠️ ',
    error: '❌',
    debug: '🔍',
    api: '🌐',
    memory: '🧠',
    agent: '🤖',
    llm: '💬',
    user: '👤'
};

/**
 * Format timestamp
 */
const getTimestamp = () => {
    return new Date().toISOString();
};

/**
 * Write to log file (async, non-blocking)
 */
const writeToFile = (level, message, data = null) => {
    const logEntry = {
        timestamp: getTimestamp(),
        level,
        message,
        data
    };

    const logLine = JSON.stringify(logEntry) + '\n';

    // Async append — fire-and-forget, don't block event loop
    fs.promises.appendFile(LOG_FILE, logLine).catch(() => {});

    // Also write errors to error log
    if (level === 'ERROR') {
        fs.promises.appendFile(ERROR_LOG_FILE, logLine).catch(() => {});
    }
};

/**
 * Logger object with different log levels
 */
const logger = {
    /**
     * Info - General information
     */
    info: (message, data = null) => {
        const timestamp = getTimestamp();
        console.log(`${colors.blue}[${timestamp}]${colors.reset} ${icons.info} ${message}`);
        if (data) console.log(`   └─ ${colors.cyan}${JSON.stringify(data)}${colors.reset}`);
        writeToFile('INFO', message, data);
    },

    /**
     * Success - Operation completed successfully
     */
    success: (message, data = null) => {
        const timestamp = getTimestamp();
        console.log(`${colors.green}[${timestamp}]${colors.reset} ${icons.success} ${colors.green}${message}${colors.reset}`);
        if (data) console.log(`   └─ ${colors.cyan}${JSON.stringify(data)}${colors.reset}`);
        writeToFile('SUCCESS', message, data);
    },

    /**
     * Warning - Something to be aware of
     */
    warn: (message, data = null) => {
        const timestamp = getTimestamp();
        console.log(`${colors.yellow}[${timestamp}]${colors.reset} ${icons.warning} ${colors.yellow}${message}${colors.reset}`);
        if (data) console.log(`   └─ ${colors.yellow}${JSON.stringify(data)}${colors.reset}`);
        writeToFile('WARN', message, data);
    },

    /**
     * Error - Something went wrong (HIGHLY VISIBLE)
     */
    error: (message, error = null) => {
        const timestamp = getTimestamp();
        console.log('\n' + '!'.repeat(60));
        console.log(`${colors.bgRed}${colors.white}[${timestamp}] ${icons.error} ERROR: ${message}${colors.reset}`);
        if (error) {
            console.log(`${colors.red}   └─ Message: ${error.message || error}${colors.reset}`);
            if (error.stack) {
                console.log(`${colors.red}   └─ Stack: ${error.stack.split('\n')[1]}${colors.reset}`);
            }
        }
        console.log('!'.repeat(60) + '\n');
        writeToFile('ERROR', message, error ? {message: error.message, stack: error.stack} : null);
    },

    /**
     * Debug - Development debugging
     */
    debug: (message, data = null) => {
        if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
            const timestamp = getTimestamp();
            console.log(`${colors.magenta}[${timestamp}]${colors.reset} ${icons.debug} ${colors.magenta}${message}${colors.reset}`);
            if (data) console.log(`   └─ ${JSON.stringify(data, null, 2)}`);
        }
    },

    /**
     * API - API call logging
     */
    api: (method, path, status = null) => {
        const timestamp = getTimestamp();
        const statusColor = status >= 400 ? colors.red : colors.green;
        const statusText = status ? ` → ${statusColor}${status}${colors.reset}` : '';
        console.log(`${colors.cyan}[${timestamp}]${colors.reset} ${icons.api} ${method} ${path}${statusText}`);
        writeToFile('API', `${method} ${path}`, status ? {status} : null);
    },

    /**
     * LLM - LLM service logging
     */
    llm: (provider, status, details = null) => {
        const timestamp = getTimestamp();
        const icon = status === 'success' ? icons.success : status === 'error' ? icons.error : icons.llm;
        const color = status === 'success' ? colors.green : status === 'error' ? colors.red : colors.blue;
        console.log(`${color}[${timestamp}]${colors.reset} ${icon} [LLM/${provider}] ${details || status}`);
        writeToFile('LLM', `[${provider}] ${details || status}`);
    },

    /**
     * Agent - Agent activity logging
     */
    agent: (agentName, action, details = null) => {
        const timestamp = getTimestamp();
        console.log(`${colors.magenta}[${timestamp}]${colors.reset} ${icons.agent} [${agentName}] ${action}`);
        if (details) console.log(`   └─ ${colors.cyan}${details}${colors.reset}`);
        writeToFile('AGENT', `[${agentName}] ${action}`, details || null);
    },

    /**
     * Memory - Memory operations logging
     */
    memory: (action, details = null) => {
        const timestamp = getTimestamp();
        console.log(`${colors.cyan}[${timestamp}]${colors.reset} ${icons.memory} [Memory] ${action}`);
        if (details) console.log(`   └─ ${colors.cyan}${details}${colors.reset}`);
        writeToFile('MEMORY', action, details || null);
    },

    /**
     * User - User activity logging
     */
    user: (userId, action, details = null) => {
        const timestamp = getTimestamp();
        console.log(`${colors.blue}[${timestamp}]${colors.reset} ${icons.user} [User:${userId}] ${action}`);
        if (details) console.log(`   └─ ${details}`);
        writeToFile('USER', `[${userId}] ${action}`, details || null);
    },

    /**
     * Separator for visual clarity
     */
    separator: (title = '') => {
        const line = '═'.repeat(60);
        if (title) {
            // Truncate title if too long to prevent negative repeat
            const safeTitle = title.length > 54 ? title.substring(0, 54) : title;
            const padding = Math.max(0, Math.floor((58 - safeTitle.length) / 2));
            const rightPad = Math.max(0, 58 - padding - safeTitle.length);
            console.log(`\n╔${line}╗`);
            console.log(`║${' '.repeat(padding)}${safeTitle}${' '.repeat(rightPad)}║`);
            console.log(`╚${line}╝`);
        } else {
            console.log(`\n${'─'.repeat(60)}\n`);
        }
    }
};

module.exports = logger;
