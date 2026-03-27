/**
 * 📡 EVENT BUS - Internal pub/sub for cross-cutting concerns
 *
 * Events emitted:
 *   deadline.created, deadline.updated, deadline.completed
 *   mood.recorded
 *   pomodoro.started, pomodoro.completed
 *   note.created
 *   chat.messageHandled
 *   tool.executed
 *
 * Subscribers: stats updater, webhook bridge, notifications
 */

const EventEmitter = require('events');
const features = require('../config/features');
const logger = require('../utils/logger');

class AppEventBus extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(20);
        this._enabled = features.ENABLE_EVENT_BUS;
    }

    /** Emit only when enabled */
    emitEvent(eventName, payload) {
        if (!this._enabled) return;
        logger.debug(`Event: ${eventName}`);
        this.emit(eventName, payload);
    }
}

// Singleton
const eventBus = new AppEventBus();

module.exports = eventBus;
