/**
 * 📊 POST-PROCESSOR - Response quality pipeline
 *
 * Extracted from agentRouter.js processRequest() steps 4.5a–4.5e.
 *
 * Runs five checks on every sub-agent response:
 *   a) Self-Evaluation  — quality gate
 *   b) Confidence Score  — certainty metric
 *   c) Tool-Call Parser  — [TOOL_CALL: …] execution
 *   d) Stall Detector    — loop recovery
 *   e) Progress Ledger   — step logging
 */

const selfEvaluator = require('../utils/selfEvaluator');
const confidenceScorer = require('../utils/confidenceScorer');
const stallDetector = require('../utils/stallDetector');
const progressLedger = require('../utils/progressLedger');
const toolService = require('../services/toolService');
const {normalizeResponse} = require('../services/responsePipeline');
const {parseToolCalls} = require('./toolCallParser');
const features = require('../config/features');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════
//                    AGENT → TOOL MAPPING
// ═══════════════════════════════════════════════════════════════

const AGENT_TOOLS = {
    COGNITIVE: ['startPomodoro', 'endPomodoro', 'getPomodoroStats', 'addDeadline', 'getDeadlines',
        'getUpcomingDeadlines', 'markDeadlineComplete', 'setReminder', 'getReminders',
        'createStudyPlan', 'getStudyPlan', 'getTodaysTasks', 'markTaskComplete'],
    EMOTIONAL: ['logMood', 'getMoodHistory', 'getMoodTrends'],
    ACADEMIC: ['generateQuiz', 'getQuizzes', 'saveQuizResult', 'webSearch', 'wikipediaSummary',
        'youtubeSearch', 'saveNote', 'getNotes', 'searchNotes'],
    GENERAL: ['setReminder', 'getReminders', 'getTodaysTasks', 'getUpcomingDeadlines']
};

/**
 * Run the full post-processing pipeline on a response.
 *
 * @param {object} response  - {text, agent, ...} from sub-agent
 * @param {object} opts
 * @param {string} opts.agentType       - classification agent name
 * @param {string} opts.userId
 * @param {string} opts.message         - original user message
 * @param {object} opts.profile
 * @param {object} opts.context         - memory context string
 * @param {Array}  opts.recentMessages
 * @param {string} opts.summary
 * @returns {object} mutated response with confidence, tools, etc.
 */
async function runPostProcessing(response, opts) {
    const {agentType, userId, message, profile, context, recentMessages, summary} = opts;

    // Step 0: Normalize response (strip <think>, enforce length, etc.)
    response.text = normalizeResponse(response.text);

    // Step 4.5a: Self-Evaluation
    if (features.ENABLE_SELF_EVAL) {
        const evalResult = await selfEvaluator.evaluate(
            message, response.text, agentType, {userId, profile}
        );
        if (!evalResult.passed && evalResult.issues?.length > 0) {
            logger.warn('Self-evaluation flagged issues', {agent: agentType, issues: evalResult.issues});
            response._evalIssues = evalResult.issues;
        }
    }

    // Step 4.5b: Confidence Scorer
    if (features.ENABLE_CONFIDENCE_SCORING) {
        const confidenceResult = confidenceScorer.calculateConfidence(
            response.text,
            {
                agentType,
                hasProfile: !!profile,
                hasHistory: (recentMessages || []).length > 0,
                hasFacts: !!(summary && summary.length > 0),
                userMessage: message
            }
        );
        response.confidence = confidenceResult.score;
        response.confidenceLevel = confidenceResult.level;
        if (confidenceResult.score < 0.5) {
            logger.warn(`Low confidence response (${confidenceResult.score.toFixed(2)})`, {agent: agentType});
        }
    }

    // Step 4.5c: Tool-Call Post-Processor
    const toolResult = await parseAndExecuteToolCalls(response.text, userId);
    if (toolResult.toolsExecuted.length > 0) {
        response.text = toolResult.text;
        response._toolsExecuted = toolResult.toolsExecuted;
        logger.info(`🔧 Executed ${toolResult.toolsExecuted.length} tool(s) from LLM response`);
    }

    // Step 4.5d: Stall Detector
    if (features.ENABLE_STALL_DETECTION) {
        const stalled = stallDetector.isStalled(response.text, userId);
        if (stalled) {
            logger.warn(`Stall detected for user ${userId}`);
            if (stallDetector.needsRecovery(userId)) {
                const recovered = await stallDetector.executeRecovery(userId, agentType, message, context);
                if (recovered) {
                    const recoveryText = recovered.response || recovered.hint || null;
                    if (recoveryText) {
                        response.text = recoveryText;
                        response._recovered = true;
                    }
                }
            }
        }
    }

    // Step 4.5e: Progress Ledger
    if (features.ENABLE_PROGRESS_LEDGER) {
        progressLedger.updateProgress(
            userId,
            `${agentType} responded`,
            {agentType, confidence: response.confidence}
        );
    }

    return response;
}

// ═══════════════════════════════════════════════════════════════
//             TOOL PROMPT & CALL PARSER
// ═══════════════════════════════════════════════════════════════

/**
 * Get a filtered tools prompt for a specific agent type.
 */
function getToolsPromptForAgent(agentType) {
    const allowedTools = AGENT_TOOLS[agentType];
    if (!allowedTools || allowedTools.length === 0) return '';

    const allTools = toolService.getAvailableTools();
    const filtered = allTools.filter(t => allowedTools.includes(t.name));
    if (filtered.length === 0) return '';

    let prompt = '\n\n═══ AVAILABLE TOOLS ═══\nYou can call tools by including this syntax in your response:\n[TOOL_CALL: toolName(param1="value1", param2="value2")]\n\nTools you can use:\n';
    for (const tool of filtered) {
        prompt += `- ${tool.name}(${tool.params.join(', ')}) — ${tool.description}\n`;
    }
    prompt += '\nIMPORTANT: Only include a TOOL_CALL when the user explicitly asks for an action (set reminder, log mood, start pomodoro, etc). Do NOT call tools for general questions.\n';
    return prompt;
}

/**
 * Parse [TOOL_CALL: ...] markers from LLM response, execute them,
 * and replace each marker with the tool result.
 */
async function parseAndExecuteToolCalls(responseText, userId) {
    const toolCallPattern = /\[TOOL_CALL:\s*(\w+)\(([^)]*)\)\]/g;
    let match;
    let processedText = responseText;
    const toolsExecuted = [];

    const matches = [];
    while ((match = toolCallPattern.exec(responseText)) !== null) {
        matches.push({full: match[0], toolName: match[1], rawParams: match[2]});
    }

    if (matches.length === 0) return {text: responseText, toolsExecuted: []};

    for (const m of matches) {
        const {full, toolName, rawParams} = m;
        logger.info(`🔧 Parsing TOOL_CALL: ${toolName}(${rawParams})`);

        const params = {};
        const paramPattern = /(\w+)\s*=\s*(?:"([^"]*)"|([\w.-]+))/g;
        let pm;
        while ((pm = paramPattern.exec(rawParams)) !== null) {
            const key = pm[1];
            const val = pm[2] !== undefined ? pm[2] : pm[3];
            params[key] = isNaN(val) ? val : Number(val);
        }

        const result = await toolService.executeTool({name: toolName, args: params, userId});
        toolsExecuted.push({tool: toolName, params, success: result.success});

        if (result.success) {
            logger.info(`✅ Tool ${toolName} executed successfully`);
            let resultText = '';
            const r = result.result;
            if (typeof r === 'string') {
                resultText = r;
            } else if (r && r.message) {
                resultText = r.message;
            } else if (r) {
                resultText = JSON.stringify(r, null, 2);
            }
            processedText = processedText.replace(full, resultText);
        } else {
            logger.warn(`❌ Tool ${toolName} failed: ${result.error}`);
            processedText = processedText.replace(full, `(Tool ${toolName} unavailable right now)`);
        }
    }

    return {text: processedText, toolsExecuted};
}

module.exports = {
    runPostProcessing,
    getToolsPromptForAgent,
    parseAndExecuteToolCalls,
    AGENT_TOOLS
};
