/**
 * POST-PROCESSOR - Response quality pipeline
 *
 * Extracted from agentRouter.js processRequest() steps 4.5a-4.5e.
 *
 * Runs five checks on every sub-agent response:
 *   a) Self-Evaluation  -- quality gate (with retry on failure)
 *   b) Confidence Score  -- certainty metric
 *   c) Tool-Call Parser  -- [TOOL_CALL: ...] execution
 *   d) Stall Detector    -- loop recovery
 *   e) Progress Ledger   -- step logging
 */

const selfEvaluator = require('../utils/selfEvaluator');
const confidenceScorer = require('../utils/confidenceScorer');
const stallDetector = require('../utils/stallDetector');
const progressLedger = require('../utils/progressLedger');
const toolService = require('../services/toolService');
const {normalizeResponse} = require('../services/responsePipeline');
const {parseToolCalls} = require('./toolCallParser');
const {callLLM, config: llmConfig} = require('../utils/llmService');
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
 * IMPORTANT: This function MUTATES the response object in-place.
 * After this call, response will have additional properties:
 *   - response.confidence     {number}  - confidence score 0-1
 *   - response.confidenceLevel {string} - 'high'|'medium'|'low'
 *   - response._toolsExecuted {Array}   - tools that were executed
 *   - response._evalIssues    {Array}   - self-evaluation issues (if any)
 *   - response._recovered     {boolean} - true if stall recovery was applied
 *
 * @param {object} response  - {text, agent, ...} from sub-agent (MUTATED)
 * @param {object} opts
 * @param {string} opts.agentType       - classification agent name
 * @param {string} opts.userId
 * @param {string} opts.message         - original user message
 * @param {object} opts.profile
 * @param {object} opts.context         - memory context string
 * @param {Array}  opts.recentMessages
 * @param {string} opts.summary
 * @returns {object} the same (mutated) response object
 */
async function runPostProcessing(response, opts) {
    const {agentType, userId, message, profile, context, recentMessages, summary} = opts;

    // Step 0: Normalize response (strip <think>, enforce length, etc.)
    response.text = normalizeResponse(response.text);

    // Step 4.5a: Self-Evaluation (with retry on failure - Fix #5)
    if (features.ENABLE_SELF_EVAL) {
        const evalResult = await selfEvaluator.evaluate(
            message, response.text, agentType, {userId, profile}
        );
        if (!evalResult.passed && evalResult.issues?.length > 0) {
            logger.warn('Self-evaluation flagged issues', {agent: agentType, issues: evalResult.issues});
            response._evalIssues = evalResult.issues;

            // Attempt regeneration if evaluation says we should retry
            if (evalResult.shouldRetry && opts.llmOptions) {
                logger.info('Self-eval triggered response regeneration');
                try {
                    const improvedPrompt = `The previous response had these issues: ${evalResult.issues.join(', ')}. ${evalResult.suggestion || 'Please provide a better response.'}`;
                    const regenerated = await callLLM(
                        opts.systemPrompt || '',
                        `Original question: ${message}\n\nImprovement guidance: ${improvedPrompt}`,
                        {
                            maxTokens: opts.llmOptions.maxTokens || 2000,
                            temperature: Math.max(0.3, (opts.llmOptions.temperature || 0.7) - 0.2),
                            taskType: opts.llmOptions.taskType || 'heavy_reasoning'
                        }
                    );
                    if (regenerated) {
                        response.text = normalizeResponse(regenerated);
                        response._regenerated = true;
                        logger.info('Response regenerated after self-eval failure');
                    }
                } catch (regenError) {
                    logger.error('Regeneration failed, keeping original response', regenError);
                }
            }
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
    // First try native Gemini function calls (JSON with __toolCalls)
    const nativeResult = await handleNativeToolCalls(
        response.text, userId,
        opts.systemPrompt || '', opts.message,
        opts.conversationHistory || [], opts.llmOptions || {}
    );
    if (nativeResult) {
        response.text = nativeResult.text;
        response._toolsExecuted = nativeResult.toolsExecuted;
        logger.info(`🔧 Executed ${nativeResult.toolsExecuted.length} native tool(s)`);
    } else {
        // Fallback: regex-based [TOOL_CALL:...] parsing (for DeepSeek / non-Gemini)
        const toolResult = await parseAndExecuteToolCalls(response.text, userId);
        if (toolResult.toolsExecuted.length > 0) {
            response.text = toolResult.text;
            response._toolsExecuted = toolResult.toolsExecuted;
            logger.info(`🔧 Executed ${toolResult.toolsExecuted.length} tool(s) from LLM response`);
        }
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
 * Handle native Gemini function calling results.
 * Detects `__toolCalls` JSON from callLLM, executes tools, then does
 * a follow-up LLM call with tool results (up to 3 iterations).
 */
async function handleNativeToolCalls(responseText, userId, systemPrompt, userMessage, conversationHistory, options) {
    let parsed;
    try {
        parsed = JSON.parse(responseText);
    } catch { return null; }

    if (!parsed?.__toolCalls || !parsed.toolCalls?.length) return null;

    const MAX_ITERATIONS = 3;
    let toolCalls = parsed.toolCalls;
    let assistantContent = parsed.content || '';
    let model = parsed.model || '';
    const allToolsExecuted = [];

    // Build full message history for follow-up calls
    const messages = [{role: 'system', content: systemPrompt}];
    (conversationHistory || []).forEach(msg => {
        const content = (msg.text || '').trim();
        const role = msg.sender === 'user' ? 'user' : 'assistant';
        if (content.length > 0) messages.push({role, content});
    });
    messages.push({role: 'user', content: userMessage});

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
        logger.info(`🔧 Native tool call iteration ${iteration + 1}: ${toolCalls.map(t => t.name).join(', ')}`);

        // Add the assistant message with tool_calls
        const assistantMsg = {role: 'assistant', content: assistantContent || null};
        assistantMsg.tool_calls = toolCalls.map(tc => ({
            id: tc.id,
            type: 'function',
            function: {name: tc.name, arguments: JSON.stringify(tc.args)}
        }));
        messages.push(assistantMsg);

        // Execute each tool and add tool result messages
        for (const tc of toolCalls) {
            const result = await toolService.executeTool({name: tc.name, args: tc.args, userId});
            allToolsExecuted.push({tool: tc.name, params: tc.args, success: result.success});

            let resultContent;
            if (result.success) {
                logger.info(`✅ Native tool ${tc.name} executed successfully`);
                const r = result.result;
                resultContent = typeof r === 'string' ? r : (r?.message || JSON.stringify(r, null, 2));
            } else {
                logger.warn(`❌ Native tool ${tc.name} failed: ${result.error}`);
                resultContent = JSON.stringify({error: result.error || 'Tool execution failed'});
            }

            messages.push({role: 'tool', tool_call_id: tc.id, content: resultContent});
        }

        // Follow-up call — pass tool results back to Gemini WITHOUT tool schemas
        // (so it generates a natural language summary, not another tool call loop)
        const followUpOptions = {...options, toolSchemas: null, maxTokens: options.maxTokens || 800};
        delete followUpOptions.toolSchemas;

        try {
            const body = {
                model: model || options.model || 'gemini-2.5-flash',
                messages,
                max_tokens: followUpOptions.maxTokens,
                temperature: followUpOptions.temperature || 0.7
            };
            if (body.model.startsWith('gemini-2.5')) {
                body.reasoning_effort = 'low';
            }

            const response = await fetch(`${llmConfig.gemini.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${llmConfig.gemini.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorText = await response.text();
                logger.error(`Gemini follow-up API Error (${response.status})`, new Error(errorText));
                break;
            }

            const data = await response.json();
            const choice = data?.choices?.[0]?.message;

            // If the model wants to call more tools, loop
            if (choice?.tool_calls && choice.tool_calls.length > 0) {
                toolCalls = choice.tool_calls.map(tc => ({
                    id: tc.id,
                    name: tc.function.name,
                    args: JSON.parse(tc.function.arguments || '{}')
                }));
                assistantContent = choice.content || '';
                continue;
            }

            // Final text response
            const finalText = choice?.content?.trim();
            if (finalText) {
                return {text: finalText, toolsExecuted: allToolsExecuted};
            }
        } catch (error) {
            logger.error('Native tool follow-up failed', error);
        }
        break;
    }

    // If we get here, build a fallback from tool results
    if (allToolsExecuted.length > 0) {
        const fallback = assistantContent || 'I executed the requested action.';
        return {text: fallback, toolsExecuted: allToolsExecuted};
    }
    return null;
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
    handleNativeToolCalls,
    AGENT_TOOLS
};
