const path = require('path');
require('dotenv').config({path: path.join(__dirname, '../../.env')});
const logger = require('./logger');

/**
 * 🌟 LLM Service - Multi-Model Routing for Optimal Performance
 * 
 * Task-Specific Model Selection:
 * - MAIN: Qwen 80B (conversation, teaching, empathy)
 * - ROUTING: Trinity Mini (fast classification)
 * - TOOLS: Devstral (structured outputs, code)
 * - SUMMARIZATION: MiMo Flash (memory compression)
 * - RESEARCH: Nemotron (quick facts)
 * 
 * Get your FREE key at: https://openrouter.ai/keys
 */

const TASK_MODELS = {
    // Main conversation (default) - Best for education, empathy, teaching
    MAIN: 'qwen/qwen3-next-80b-a3b-instruct:free',

    // Fast classification & routing
    ROUTING: 'arcee-ai/trinity-mini:free',

    // Structured outputs (JSON, code, plans)
    TOOLS: 'mistralai/devstral-2512:free',

    // Memory compression & summarization
    SUMMARIZATION: 'xiaomi/mimo-v2-flash:free',

    // Quick research & facts
    RESEARCH: 'nvidia/nemotron-3-nano-30b-a3b:free',

    // Creative teaching & empathy
    CREATIVE: 'tngtech/tng-r1t-chimera:free'
};

const config = {
    provider: 'openrouter',

    openrouter: {
        apiKey: process.env.OPENROUTER_API_KEY,
        baseUrl: 'https://openrouter.ai/api/v1',
        model: process.env.OPENROUTER_MODEL || TASK_MODELS.MAIN,
        taskModels: TASK_MODELS,
        freeModels: Object.values(TASK_MODELS)
    }
};

// Startup logging
logger.separator('LLM SERVICE CONFIGURATION');
logger.info(`Provider: OpenRouter (Multi-Model Routing)`);
logger.info(`OpenRouter Key: ${config.openrouter.apiKey ? '✓ Configured' : '✗ Not set'}`);
logger.info(`Default Model: ${config.openrouter.model}`);
logger.info(`Task Models: ${Object.keys(TASK_MODELS).length} specialized models loaded`);
if (!config.openrouter.apiKey) {
    logger.warn('No API key configured! LLM features will use fallback responses.');
    logger.info('Get FREE API key at: https://openrouter.ai/keys');
}

/**
 * 🎯 Select optimal model based on task type
 * 
 * Note: Routing models (Trinity Mini) use reasoning tokens, so they need higher token limits
 */
const selectModel = (taskType) => {
    const modelMap = {
        'classification': TASK_MODELS.ROUTING,
        'routing': TASK_MODELS.ROUTING,
        'intent_detection': TASK_MODELS.ROUTING,

        'tool_execution': TASK_MODELS.TOOLS,
        'structured_output': TASK_MODELS.TOOLS,
        'code_generation': TASK_MODELS.TOOLS,
        'quiz_generation': TASK_MODELS.TOOLS,

        'summarization': TASK_MODELS.SUMMARIZATION,
        'memory_compression': TASK_MODELS.SUMMARIZATION,
        'episodic_summary': TASK_MODELS.SUMMARIZATION,

        'research': TASK_MODELS.RESEARCH,
        'wikipedia': TASK_MODELS.RESEARCH,
        'fact_lookup': TASK_MODELS.RESEARCH,

        'creative': TASK_MODELS.CREATIVE,
        'failure_pattern': TASK_MODELS.CREATIVE,
        'empathy': TASK_MODELS.CREATIVE,

        'conversation': TASK_MODELS.MAIN,
        'teaching': TASK_MODELS.MAIN,
        'explanation': TASK_MODELS.MAIN,
        'default': TASK_MODELS.MAIN
    };

    const selected = modelMap[taskType] || TASK_MODELS.MAIN;
    if (taskType && taskType !== 'default') {
        logger.debug(`Task: ${taskType} → Model: ${selected.split('/')[1]}`);
    }
    return selected;
};

/**
 * Main LLM call function - with task-based model selection
 */
const callLLM = async (systemPrompt, userMessage, options = {}, conversationHistory = []) => {
    logger.debug('callLLM invoked', {
        provider: 'openrouter',
        taskType: options.taskType || 'default',
        messageLength: userMessage.length
    });

    if (config.openrouter.apiKey) {
        // Auto-select model based on task type
        if (!options.model && options.taskType) {
            options.model = selectModel(options.taskType);
        }

        logger.llm('OpenRouter', 'attempting', `Calling ${options.model ? options.model.split('/')[1] : 'default model'}...`);
        const result = await callOpenRouter(systemPrompt, userMessage, options, conversationHistory);
        if (result) return result;
    }

    logger.warn('OpenRouter unavailable - returning null (will use fallback)');
    return null;
};

/**
 * Call OpenRouter API (FREE models)
 */
const callOpenRouter = async (systemPrompt, userMessage, options = {}, conversationHistory = []) => {
    const startTime = Date.now();
    try {
        const messages = [{role: 'system', content: systemPrompt}];

        // Include conversation history for memory (filter out empty messages)
        conversationHistory.forEach(msg => {
            const content = (msg.text || '').trim();
            const role = msg.sender === 'user' ? 'user' : 'assistant';

            // CRITICAL: Skip messages with no content (especially assistant messages)
            // Provider requires assistant messages to have content or tool_calls
            if (content.length > 0) {
                messages.push({role, content});
            } else {
                logger.debug(`Skipping empty ${role} message in history`);
            }
        });

        messages.push({role: 'user', content: userMessage});

        // Final validation: ensure no empty assistant messages
        const hasEmptyAssistant = messages.some(m => m.role === 'assistant' && (!m.content || m.content.trim() === ''));
        if (hasEmptyAssistant) {
            logger.warn('Detected empty assistant message, cleaning...');
            const cleaned = messages.filter(m => m.role !== 'assistant' || (m.content && m.content.trim()));
            messages.length = 0;
            messages.push(...cleaned);
        }

        const model = options.model || config.openrouter.model;
        logger.debug(`OpenRouter request`, {model, messagesCount: messages.length});

        const response = await fetch(config.openrouter.baseUrl + '/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.openrouter.apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'http://localhost:5000',
                'X-Title': 'Student Mate AI'
            },
            body: JSON.stringify({
                model,
                messages,
                max_tokens: options.maxTokens || 500,
                temperature: options.temperature || 0.7
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            logger.error(`OpenRouter API Error (${response.status})`, new Error(errorText));
            return null;
        }

        const data = await response.json();
        const duration = Date.now() - startTime;

        // Validate response has content (check both content and reasoning fields)
        const message = data?.choices?.[0]?.message;
        let content = message?.content;

        // For reasoning models (like Trinity Mini), check reasoning field if content is empty
        if ((!content || content.trim() === '') && message?.reasoning) {
            content = message.reasoning;
            logger.debug('Using reasoning field as content for reasoning model');
        }

        if (!content || content.trim() === '') {
            logger.warn('OpenRouter returned empty response', {data});
            return null;
        }

        // Log token usage
        const usage = data?.usage || {};
        const inputTokens = usage.prompt_tokens || 0;
        const outputTokens = usage.completion_tokens || 0;
        const totalTokens = usage.total_tokens || 0;

        logger.llm('OpenRouter', 'success', `Response in ${duration}ms from ${data.model || model}`);
        console.log(`\n${'='.repeat(70)}`);
        console.log(`📊 LLM RESPONSE METRICS`);
        console.log(`${'='.repeat(70)}`);
        console.log(`🤖 Model: ${data.model || model}`);
        console.log(`📥 Input Tokens: ${inputTokens}`);
        console.log(`📤 Output Tokens: ${outputTokens}`);
        console.log(`📊 Total Tokens: ${totalTokens}`);
        console.log(`⏱️  Duration: ${duration}ms`);
        console.log(`📝 Response Preview: ${content.trim().substring(0, 100)}...`);
        console.log(`${'='.repeat(70)}\n`);

        return content.trim();
    } catch (error) {
        logger.error('OpenRouter request failed', error);
        return null;
    }
};

const estimateTokens = (text) => Math.ceil(text.length / 4);

const truncateToTokenBudget = (text, maxTokens) => {
    const estimatedChars = maxTokens * 4;
    return text.length <= estimatedChars ? text : text.substring(0, estimatedChars) + '... [truncated]';
};

const getFreeModels = () => config.openrouter.freeModels;

const getTaskModels = () => TASK_MODELS;

module.exports = {
    callLLM,
    callOpenRouter,
    estimateTokens,
    truncateToTokenBudget,
    getFreeModels,
    getTaskModels,
    selectModel,
    TASK_MODELS,
    config
};
