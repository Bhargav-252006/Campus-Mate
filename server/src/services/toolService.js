/**
 * 🔧 TOOL SERVICE - Unified tool execution layer
 *
 * Single entry point: executeTool({ name, args, userId })
 * Handles: validation, logging, error normalization, event emission.
 *
 * Both LLM tool calls and external webhooks go through here.
 */

const registry = require('../tools/registry');
const eventBus = require('../core/eventBus');
const {statsRepo} = require('../repositories');
const logger = require('../utils/logger');

// Map tool names to event names for the event bus
const TOOL_EVENTS = {
    addDeadline: 'deadline.created',
    markDeadlineComplete: 'deadline.completed',
    logMood: 'mood.recorded',
    startPomodoro: 'pomodoro.started',
    endPomodoro: 'pomodoro.completed',
    saveNote: 'note.created',
    setReminder: 'reminder.created',
    createStudyPlan: 'studyPlan.created',
};

class ToolService {
    /**
     * Execute a tool by name.
     * @param {{ name: string, args: object, userId: string }} opts
     * @returns {{ success: boolean, result?: any, error?: string }}
     */
    async executeTool({name, args, userId}) {
        const startTime = Date.now();
        logger.info(`ToolService: executing ${name} for ${userId}`);

        const result = await registry.execute(name, args, userId);
        const latency = Date.now() - startTime;

        // Emit event for subscribers (stats, etc.)
        const eventName = TOOL_EVENTS[name];
        if (eventName && result.success) {
            eventBus.emitEvent(eventName, {userId, tool: name, args, result: result.result});
        }

        // Always emit generic tool.executed
        eventBus.emitEvent('tool.executed', {
            userId, tool: name, success: result.success, latencyMs: latency,
        });

        // Trace logging
        statsRepo.addTrace({
            type: 'tool',
            userId,
            tool: name,
            success: result.success,
            latencyMs: latency,
            error: result.error || null,
        }).catch(() => { });

        return result;
    }

    /** Proxy for registry metadata */
    getAvailableTools() {
        return registry.getAvailableTools();
    }

    getToolsPrompt() {
        return registry.getToolsPrompt();
    }
}

module.exports = new ToolService();
