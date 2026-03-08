const path = require('path');
require('dotenv').config({path: path.join(__dirname, '../../.env')});
const logger = require('./logger');

/**
 * 🌟 LLM Service - Hybrid Local + Cloud Setup
 *
 * All tasks (chat, routing, tools, summarization, research, empathy)
 * use ONE model per provider. Local Ollama is tried FIRST (fastest, free,
 * no rate limits), then cloud fallbacks.
 *
 * Provider priority: ollama (local) → gemini → bytez → huggingface → openrouter
 */

// ✅ Provider-specific model IDs
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3:8b';         // Local Ollama model (Qwen3 8B)
const GEMINI_MAIN_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_ROUTING_MODEL = process.env.GEMINI_ROUTING_MODEL || 'gemini-2.5-flash-lite';
const SINGLE_MODEL = 'meta-llama/Meta-Llama-3.1-8B-Instruct';       // Bytez ID (cloud fallback)
const HF_MODEL = 'meta-llama/Llama-3.1-8B-Instruct';                // HuggingFace ID (cloud fallback)
const OR_MODEL = 'meta-llama/llama-3.1-8b-instruct:free';           // OpenRouter free tier (cloud fallback)
const OR_HEAVY_REASONING_MODEL = process.env.OPENROUTER_HEAVY_REASONING_MODEL || 'deepseek/deepseek-r1-0528:free';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const DEEPSEEK_HEAVY_MODEL = process.env.DEEPSEEK_HEAVY_MODEL || 'deepseek-reasoner';

const STRUCTURED_TASK_TYPES = new Set(['classification', 'routing', 'summarization', 'evaluation']);
const HEAVY_REASONING_TASK_TYPES = new Set(['heavy_reasoning', 'analysis']);

const selectGeminiModel = (taskType) => (
    STRUCTURED_TASK_TYPES.has(taskType) ? config.gemini.routingModel : config.gemini.model
);

const selectOpenRouterModel = (taskType) => (
    HEAVY_REASONING_TASK_TYPES.has(taskType)
        ? config.openrouter.taskModels.HEAVY_REASONING
        : config.openrouter.model
);

// All task types point to the same model
const TASK_MODELS = {
    MAIN: SINGLE_MODEL,
    ROUTING: SINGLE_MODEL,
    TOOLS: SINGLE_MODEL,
    SUMMARIZATION: SINGLE_MODEL,
    RESEARCH: SINGLE_MODEL,
    CREATIVE: SINGLE_MODEL,
    HEAVY_REASONING: OR_HEAVY_REASONING_MODEL
};

// Fallback if Bytez is unavailable
const FALLBACK_MODELS = [
    'meta-llama/Llama-3.2-3B-Instruct'
];

const config = {
    provider: process.env.LLM_PROVIDER || 'ollama',  // Default: local Ollama (qwen3:8b)

    ollama: {
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        model: OLLAMA_MODEL,
    },

    gemini: {
        apiKey: process.env.GEMINI_API_KEY,
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
        model: GEMINI_MAIN_MODEL,
        routingModel: GEMINI_ROUTING_MODEL
    },

    bytez: {
        apiKey: process.env.BYTEZ_API_KEY,
        baseUrl: 'https://api.bytez.com/v1',
        model: SINGLE_MODEL,          // meta-llama/Meta-Llama-3.1-8B-Instruct
        maxRetries: 3,                // retry on 429 (free tier: 1 req at a time)
        retryDelayMs: 2500            // wait 2.5s before retry
    },

    openrouter: {
        apiKey: process.env.OPENROUTER_API_KEY,
        baseUrl: 'https://openrouter.ai/api/v1',
        model: process.env.OPENROUTER_MODEL || OR_MODEL,
        taskModels: TASK_MODELS,
        freeModels: [...new Set([OR_MODEL, OR_HEAVY_REASONING_MODEL])],
        fallbackModels: FALLBACK_MODELS
    },

    huggingface: {
        apiKey: process.env.HUGGINGFACE_API_KEY,
        baseUrl: 'https://router.huggingface.co/v1',
        model: process.env.HUGGINGFACE_MODEL || HF_MODEL  // Llama (no Meta- prefix)
    },

    deepseek: {
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseUrl: 'https://api.deepseek.com/v1',
        model: DEEPSEEK_MODEL,
        heavyModel: DEEPSEEK_HEAVY_MODEL
    }
};

// Startup logging
logger.separator('LLM SERVICE CONFIGURATION');
logger.info(`Provider: ${config.provider} (normal tasks)`);
logger.info(`Heavy tasks → DeepSeek: ${config.deepseek.apiKey ? `✓ ${config.deepseek.heavyModel}` : '✗ No key'}`);
if (config.provider === 'ollama') {
    logger.info(`Ollama URL: ${config.ollama.baseUrl}`);
    logger.info(`Ollama Model: ${config.ollama.model}`);
    logger.info(`Cloud fallbacks: Gemini → Bytez → HuggingFace → OpenRouter`);
} else if (config.provider === 'gemini') {
    logger.info(`Gemini Key: ${config.gemini.apiKey ? '✓ Configured' : '✗ Not set'}`);
    logger.info(`Gemini Main Model: ${config.gemini.model}`);
    logger.info(`Gemini Routing Model: ${config.gemini.routingModel}`);
} else {
    logger.info(`Model (all tasks): ${SINGLE_MODEL}`);
}
if (config.provider === 'gemini' && !config.gemini.apiKey) {
    logger.warn('No Gemini API key! Set GEMINI_API_KEY in server/.env');
} else if (config.provider === 'bytez') {
    logger.info(`Bytez Key: ${config.bytez.apiKey ? '✓ Configured' : '✗ Not set'}`);
    if (!config.bytez.apiKey) {
        logger.warn('No Bytez API key! Set BYTEZ_API_KEY in server/.env');
    }
} else if (config.provider === 'openrouter') {
    logger.info(`OpenRouter Key: ${config.openrouter.apiKey ? '✓ Configured' : '✗ Not set'}`);
    if (!config.openrouter.apiKey) {
        logger.warn('No API key! Get FREE key at: https://openrouter.ai/keys');
    }
} else if (config.provider === 'huggingface') {
    logger.info(`Hugging Face Key: ${config.huggingface.apiKey ? '✓ Configured' : '✗ Not set'}`);
    if (!config.huggingface.apiKey) {
        logger.warn('No API key! Get FREE key at: https://huggingface.co/settings/tokens');
    }
} else if (config.provider === 'deepseek') {
    if (!config.deepseek.apiKey) {
        logger.warn('No DeepSeek API key! Set DEEPSEEK_API_KEY in server/.env');
    }
}

/**
 * 🎯 Select model — always returns SINGLE_MODEL (all tasks unified)
 */
const selectModel = (taskType) => {
    if (config.provider === 'gemini') {
        const model = selectGeminiModel(taskType);
        if (taskType && taskType !== 'default') {
            logger.debug(`Task: ${taskType} → Gemini Model: ${model}`);
        }
        return model;
    }

    if (config.provider === 'openrouter') {
        const model = selectOpenRouterModel(taskType);
        if (taskType && taskType !== 'default') {
            logger.debug(`Task: ${taskType} → OpenRouter Model: ${model}`);
        }
        return model;
    }

    if (taskType && taskType !== 'default') {
        logger.debug(`Task: ${taskType} → Model: ${SINGLE_MODEL.split('/')[1]}`);
    }
    return SINGLE_MODEL;
};

/**
 * Main LLM call function — routes to Bytez first, then HF, then OpenRouter
 */
const callLLM = async (systemPrompt, userMessage, options = {}, conversationHistory = []) => {
    const startTime = Date.now();
    const toolSchemas = options.toolSchemas || null;
    const isHeavyTask = HEAVY_REASONING_TASK_TYPES.has(options.taskType);
    const shouldPreferOpenRouter = isHeavyTask && !!config.openrouter.apiKey && config.provider !== 'deepseek' && config.provider !== 'gemini';
    const preferredOpenRouterModel = options.model || selectOpenRouterModel(options.taskType);
    const activeModel = isHeavyTask && config.deepseek?.apiKey
        ? config.deepseek.heavyModel
        : shouldPreferOpenRouter
            ? preferredOpenRouterModel
            : config.provider === 'ollama'
                ? config.ollama.model
                : (options.model || selectModel(options.taskType));
    logger.debug('callLLM invoked', {
        provider: config.provider,
        model: activeModel,
        messageLength: userMessage.length
    });

    let usedProvider = null;
    let result = null;

    // 0️⃣ Try DeepSeek for heavy reasoning tasks (always, regardless of provider)
    if (!result && isHeavyTask && config.deepseek?.apiKey) {
        logger.llm('DeepSeek', 'attempting', `Calling ${config.deepseek.heavyModel} for heavy task...`);
        result = await callDeepSeek(systemPrompt, userMessage, {...options, model: config.deepseek.heavyModel}, conversationHistory);
        if (result) { usedProvider = 'deepseek'; }
        else { logger.warn('DeepSeek heavy reasoning failed — falling back'); }
    }

    // 1️⃣ Try Ollama (local — fastest, free, no rate limits)
    if (config.provider === 'ollama' && !shouldPreferOpenRouter && !result) {
        logger.llm('Ollama', 'attempting', `Calling local ${config.ollama.model}...`);
        result = await callOllama(systemPrompt, userMessage, options, conversationHistory);
        if (result) {usedProvider = 'ollama';}
        else {logger.warn('Ollama failed — falling back to cloud providers');}
    }

    if (!result && shouldPreferOpenRouter) {
        const openRouterOptions = {
            ...options,
            model: preferredOpenRouterModel,
            skipFallback: true
        };
        logger.llm('OpenRouter', 'attempting', `Calling preferred heavy reasoning model ${preferredOpenRouterModel}...`);
        result = await callOpenRouter(systemPrompt, userMessage, openRouterOptions, conversationHistory);
        if (result) {
            usedProvider = 'openrouter';
        } else {
            logger.warn('Preferred OpenRouter heavy reasoning model failed — falling back to the standard provider chain');
        }
    }

    // 1.5️⃣ (DeepSeek for heavy tasks already handled in step 0)

    // 2️⃣ Try Gemini (cloud primary)
    if (!result && config.gemini.apiKey) {
        const geminiOptions = {
            ...options,
            model: options.model || selectGeminiModel(options.taskType)
        };
        // If tool schemas are provided, use native function calling
        if (toolSchemas && toolSchemas.length > 0) {
            logger.llm('Gemini', 'attempting', `Calling ${geminiOptions.model} with ${toolSchemas.length} tool schemas...`);
            const toolResult = await callGeminiWithTools(systemPrompt, userMessage, geminiOptions, conversationHistory, toolSchemas);
            if (toolResult) {
                usedProvider = 'gemini';
                // Attach structured result as metadata on the string for the caller
                if (toolResult.type === 'tool_calls') {
                    result = JSON.stringify({__toolCalls: true, toolCalls: toolResult.toolCalls, content: toolResult.content, model: toolResult.model});
                } else {
                    result = toolResult.content;
                }
            } else {
                logger.warn('Gemini (tools) failed — falling back to plain Gemini');
                // Fall through to plain Gemini below
            }
        }
        if (!result) {
            logger.llm('Gemini', 'attempting', `Calling ${geminiOptions.model}...`);
            result = await callGemini(systemPrompt, userMessage, geminiOptions, conversationHistory);
            if (result) {usedProvider = 'gemini';}
            else {logger.warn('Gemini failed — falling back to next provider');}
        }
    }

    // Always use the single model for cloud providers
    if (!result) options.model = SINGLE_MODEL;

    // 3️⃣ Try Bytez (cloud fallback)
    if (!result && config.bytez.apiKey) {
        logger.llm('Bytez', 'attempting', `Calling ${SINGLE_MODEL}...`);
        result = await callBytez(systemPrompt, userMessage, options, conversationHistory);
        if (result) {usedProvider = 'bytez';}
        else {logger.warn('Bytez failed — falling back to next provider');}
    }

    // 4️⃣ Try HuggingFace (fallback)
    if (!result && config.huggingface.apiKey) {
        logger.llm('HuggingFace', 'attempting', `Calling ${HF_MODEL}...`);
        result = await callHuggingFace(systemPrompt, userMessage, options);
        if (result) {usedProvider = 'huggingface';}
        else {logger.warn('HuggingFace failed — falling back to OpenRouter');}
    }

    // 5️⃣ Try OpenRouter (last fallback)
    if (!result && config.openrouter.apiKey) {
        logger.llm('OpenRouter', 'attempting', `Calling ${OR_MODEL}...`);
        result = await callOpenRouter(systemPrompt, userMessage, options, conversationHistory);
        if (result) {usedProvider = 'openrouter';}
    }

    const latency = Date.now() - startTime;

    // LLM trace logging
    try {
        const features = require('../config/features');
        if (features.ENABLE_LLM_TRACING) {
            const {statsRepo} = require('../repositories');
            statsRepo.addTrace({
                type: 'llm_call',
                provider: usedProvider || 'none',
                model: activeModel,
                taskType: options.taskType || 'default',
                promptLength: systemPrompt.length + userMessage.length,
                responseLength: result ? result.length : 0,
                latencyMs: latency,
                success: !!result,
            }).catch(() => { });
        }
    } catch (_) { /* config not loaded yet on first call — ignore */}

    if (!result) {
        logger.warn('All providers (local + cloud) unavailable — returning null');
    }

    return result;
};

/**
 * Call Ollama local LLM (OpenAI-compatible endpoint)
 * No API key needed, no rate limits, fastest latency
 */
const callOllama = async (systemPrompt, userMessage, options = {}, conversationHistory = []) => {
    const startTime = Date.now();
    const model = options.ollamaModel || config.ollama.model;

    const messages = [{role: 'system', content: systemPrompt}];
    conversationHistory.forEach(msg => {
        const content = (msg.text || '').trim();
        const role = msg.sender === 'user' ? 'user' : 'assistant';
        if (content.length > 0) messages.push({role, content});
    });
    messages.push({role: 'user', content: userMessage});

    logger.debug('Ollama request', {model, messagesCount: messages.length});

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout for local

        // For structured output tasks (classification, evaluation, summarization)
        // disable Qwen3 thinking mode to avoid empty responses
        const isStructuredTask = ['classification', 'routing', 'summarization', 'evaluation'].includes(options.taskType);

        const response = await fetch(`${config.ollama.baseUrl}/api/chat`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                model,
                messages,
                stream: false,
                think: isStructuredTask ? false : undefined,  // Disable Qwen3 thinking for structured tasks
                options: {
                    temperature: options.temperature || 0.7,
                    num_predict: -1  // -1 = no limit; let the model stop naturally (local Ollama only)
                }
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            const errorText = await response.text();
            logger.error(`Ollama Error (${response.status})`, new Error(errorText));
            return null;
        }

        const data = await response.json();
        const duration = Date.now() - startTime;
        let content = data?.message?.content;

        if (!content || content.trim() === '') {
            logger.warn('Ollama returned empty response');
            return null;
        }

        // ─── Strip Qwen3 <think>...</think> reasoning blocks ───────────────────
        // Qwen3 8B is a "thinking" model that outputs <think>reasoning</think>
        // before its final answer. We strip it but use it as fallback for
        // structured output tasks (classification, evaluation) where the model
        // sometimes only produces a think block with no trailing answer.
        const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/i);
        const thinkingContent = thinkMatch ? thinkMatch[1] : '';
        content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

        if (!content && thinkingContent) {
            // Try extracting JSON from within the thinking block (Qwen3 sometimes
            // puts the final JSON answer inside <think> for structured prompts)
            const jsonMatch = thinkingContent.match(/\{[\s\S]*?\}/s);
            if (jsonMatch) {
                content = jsonMatch[0].trim();
                logger.debug('Extracted JSON from Qwen3 <think> block as fallback');
            }
        }

        if (!content || content.trim() === '') {
            logger.warn('Ollama response was empty after stripping <think> blocks');
            return null;
        }

        const evalCount = data?.eval_count || 0;
        const promptEvalCount = data?.prompt_eval_count || 0;

        logger.llm('Ollama', 'success', `Response in ${duration}ms from local ${model}`);

        console.log(`\n${'='.repeat(70)}`);
        console.log(`📊 OLLAMA LOCAL RESPONSE`);
        console.log(`${'='.repeat(70)}`);
        console.log(`🤖 Model: ${model} (LOCAL)`);
        console.log(`📥 Prompt Tokens: ${promptEvalCount}`);
        console.log(`📤 Response Tokens: ${evalCount}`);
        console.log(`⏱️  Duration: ${duration}ms`);
        console.log(`📝 Response Preview: ${content.trim().substring(0, 100)}...`);
        console.log(`${'='.repeat(70)}\n`);

        return content.trim();

    } catch (error) {
        if (error.name === 'AbortError') {
            logger.warn('Ollama request timed out (60s)');
        } else {
            logger.error('Ollama request failed (is Ollama running?)', error);
        }
        return null;
    }
};

/**
 * Call Gemini API via OpenAI-compatible endpoint
 */
const callGemini = async (systemPrompt, userMessage, options = {}, conversationHistory = []) => {
    const startTime = Date.now();
    const model = options.model || selectGeminiModel(options.taskType);

    const messages = [{role: 'system', content: systemPrompt}];
    conversationHistory.forEach(msg => {
        const content = (msg.text || '').trim();
        const role = msg.sender === 'user' ? 'user' : 'assistant';
        if (content.length > 0) messages.push({role, content});
    });
    messages.push({role: 'user', content: userMessage});

    const cleanedMessages = messages.filter(m => m.role !== 'assistant' || (m.content && m.content.trim()));
    logger.debug('Gemini request', {model, messagesCount: cleanedMessages.length});

    try {
        const body = {
            model,
            messages: cleanedMessages,
            max_tokens: options.maxTokens || 500,
            temperature: options.temperature || 0.7
        };

        if (model.startsWith('gemini-2.5')) {
            body.reasoning_effort = options.reasoningEffort || (STRUCTURED_TASK_TYPES.has(options.taskType) ? 'none' : 'low');
        }

        const response = await fetch(`${config.gemini.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.gemini.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            logger.error(`Gemini API Error (${response.status})`, new Error(errorText));
            return null;
        }

        const data = await response.json();
        const duration = Date.now() - startTime;
        const content = data?.choices?.[0]?.message?.content;

        if (!content || content.trim() === '') {
            logger.warn('Gemini returned empty response');
            return null;
        }

        const usage = data?.usage || {};
        logger.llm('Gemini', 'success', `Response in ${duration}ms from ${model}`);

        console.log(`\n${'='.repeat(70)}`);
        console.log(`📊 GEMINI RESPONSE`);
        console.log(`${'='.repeat(70)}`);
        console.log(`🤖 Model: ${model}`);
        console.log(`📥 Input Tokens: ${usage.prompt_tokens || 0}`);
        console.log(`📤 Output Tokens: ${usage.completion_tokens || 0}`);
        console.log(`⏱️  Duration: ${duration}ms`);
        console.log(`📝 Response Preview: ${content.trim().substring(0, 100)}...`);
        console.log(`${'='.repeat(70)}\n`);

        return content.trim();
    } catch (error) {
        logger.error('Gemini request failed', error);
        return null;
    }
};

/**
 * Call Gemini with native function calling (tools array).
 * Returns an object: { type: 'text'|'tool_calls', content, toolCalls }
 */
const callGeminiWithTools = async (systemPrompt, userMessage, options = {}, conversationHistory = [], toolSchemas = []) => {
    const startTime = Date.now();
    const model = options.model || selectGeminiModel(options.taskType);

    const messages = [{role: 'system', content: systemPrompt}];
    conversationHistory.forEach(msg => {
        const content = (msg.text || '').trim();
        const role = msg.sender === 'user' ? 'user' : 'assistant';
        if (content.length > 0) messages.push({role, content});
    });
    messages.push({role: 'user', content: userMessage});

    const cleanedMessages = messages.filter(m => m.role !== 'assistant' || (m.content && m.content.trim()));
    logger.debug('Gemini (with tools) request', {model, messagesCount: cleanedMessages.length, toolCount: toolSchemas.length});

    try {
        const body = {
            model,
            messages: cleanedMessages,
            max_tokens: options.maxTokens || 800,
            temperature: options.temperature || 0.7,
            tools: toolSchemas,
            tool_choice: 'auto'
        };

        if (model.startsWith('gemini-2.5')) {
            body.reasoning_effort = options.reasoningEffort || 'low';
        }

        const response = await fetch(`${config.gemini.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.gemini.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            logger.error(`Gemini (tools) API Error (${response.status})`, new Error(errorText));
            return null;
        }

        const data = await response.json();
        const duration = Date.now() - startTime;
        const choice = data?.choices?.[0]?.message;
        const usage = data?.usage || {};

        console.log(`\n${'='.repeat(70)}`);
        console.log(`🔧 GEMINI FUNCTION CALLING RESPONSE`);
        console.log(`${'='.repeat(70)}`);
        console.log(`🤖 Model: ${model}`);
        console.log(`📥 Input Tokens: ${usage.prompt_tokens || 0}`);
        console.log(`📤 Output Tokens: ${usage.completion_tokens || 0}`);
        console.log(`⏱️  Duration: ${duration}ms`);

        if (choice?.tool_calls && choice.tool_calls.length > 0) {
            const toolCalls = choice.tool_calls.map(tc => ({
                id: tc.id,
                name: tc.function.name,
                args: JSON.parse(tc.function.arguments || '{}')
            }));
            console.log(`🔧 Tool Calls: ${toolCalls.map(t => t.name).join(', ')}`);
            console.log(`${'='.repeat(70)}\n`);
            return {
                type: 'tool_calls',
                content: choice.content || '',
                toolCalls,
                model
            };
        }

        const content = choice?.content;
        if (!content || content.trim() === '') {
            logger.warn('Gemini (tools) returned empty response');
            return null;
        }

        console.log(`📝 Response Preview: ${content.trim().substring(0, 100)}...`);
        console.log(`${'='.repeat(70)}\n`);
        return {type: 'text', content: content.trim(), toolCalls: [], model};
    } catch (error) {
        logger.error('Gemini (tools) request failed', error);
        return null;
    }
};

/**
 * Call DeepSeek API (OpenAI-compatible endpoint)
 * Models: deepseek-chat (general), deepseek-reasoner (heavy reasoning)
 */
const callDeepSeek = async (systemPrompt, userMessage, options = {}, conversationHistory = []) => {
    const startTime = Date.now();
    const model = options.model || config.deepseek.model;

    const messages = [{role: 'system', content: systemPrompt}];
    conversationHistory.forEach(msg => {
        const content = (msg.text || '').trim();
        const role = msg.sender === 'user' ? 'user' : 'assistant';
        if (content.length > 0) messages.push({role, content});
    });
    messages.push({role: 'user', content: userMessage});
    const cleanedMessages = messages.filter(m => m.role !== 'assistant' || (m.content && m.content.trim()));

    logger.debug('DeepSeek request', {model, messagesCount: cleanedMessages.length});

    try {
        const response = await fetch(`${config.deepseek.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.deepseek.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model,
                messages: cleanedMessages,
                max_tokens: options.maxTokens || 500,
                temperature: options.temperature || 0.7
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            logger.error(`DeepSeek API Error (${response.status})`, new Error(errorText));
            return null;
        }

        const data = await response.json();
        const duration = Date.now() - startTime;

        // deepseek-reasoner uses reasoning_content; deepseek-chat uses content
        const message = data?.choices?.[0]?.message;
        let content = message?.content;
        if ((!content || content.trim() === '') && message?.reasoning_content) {
            content = message.reasoning_content;
        }

        if (!content || content.trim() === '') {
            logger.warn('DeepSeek returned empty response');
            return null;
        }

        const usage = data?.usage || {};
        logger.llm('DeepSeek', 'success', `Response in ${duration}ms from ${model}`);

        console.log(`\n${'='.repeat(70)}`);
        console.log(`📊 DEEPSEEK RESPONSE`);
        console.log(`${'='.repeat(70)}`);
        console.log(`🤖 Model: ${model}`);
        console.log(`📥 Input Tokens: ${usage.prompt_tokens || 0}`);
        console.log(`📤 Output Tokens: ${usage.completion_tokens || 0}`);
        console.log(`⏱️  Duration: ${duration}ms`);
        console.log(`📝 Response Preview: ${content.trim().substring(0, 100)}...`);
        console.log(`${'='.repeat(70)}\n`);

        return content.trim();
    } catch (error) {
        logger.error('DeepSeek request failed', error);
        return null;
    }
};

/**
 * Call Bytez API (OpenAI-compatible REST endpoint)
 * Model: meta-llama/Meta-Llama-3.1-8B-Instruct (confirmed free tier)
 */
const callBytez = async (systemPrompt, userMessage, options = {}, conversationHistory = []) => {
    const startTime = Date.now();
    const model = options.model || config.bytez.model;

    // Build messages once (outside retry loop)
    const messages = [{role: 'system', content: systemPrompt}];
    conversationHistory.forEach(msg => {
        const content = (msg.text || '').trim();
        const role = msg.sender === 'user' ? 'user' : 'assistant';
        if (content.length > 0) messages.push({role, content});
    });
    messages.push({role: 'user', content: userMessage});
    const cleanedMessages = messages.filter(m => m.role !== 'assistant' || (m.content && m.content.trim()));

    logger.debug('Bytez request', {model, messagesCount: cleanedMessages.length});

    let attempt = 1;
    while (attempt <= config.bytez.maxRetries) {
        try {
            const response = await fetch(`${config.bytez.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.bytez.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model,
                    messages: cleanedMessages,
                    max_tokens: options.maxTokens || 500,
                    temperature: options.temperature || 0.7
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                // 429 = free tier rate limit (1 req at a time) — wait and retry
                if (response.status === 429 && attempt < config.bytez.maxRetries) {
                    const wait = config.bytez.retryDelayMs * attempt;
                    logger.warn(`Bytez 429 rate limit — retrying in ${wait}ms (attempt ${attempt}/${config.bytez.maxRetries})`);
                    await new Promise(r => setTimeout(r, wait));
                    attempt++;
                    continue;
                }
                logger.error(`Bytez API Error (${response.status})`, new Error(errorText));
                return null;
            }

            const data = await response.json();
            const duration = Date.now() - startTime;
            const content = data?.choices?.[0]?.message?.content;

            if (!content || content.trim() === '') {
                logger.warn('Bytez returned empty response');
                return null;
            }

            const usage = data?.usage || {};
            logger.llm('Bytez', 'success', `Response in ${duration}ms from ${model}`);

            console.log(`\n${'='.repeat(70)}`);
            console.log(`📊 BYTEZ RESPONSE`);
            console.log(`${'='.repeat(70)}`);
            console.log(`🤖 Model: ${model}`);
            console.log(`📥 Input Tokens: ${usage.prompt_tokens || 0}`);
            console.log(`📤 Output Tokens: ${usage.completion_tokens || 0}`);
            console.log(`⏱️  Duration: ${duration}ms`);
            console.log(`📝 Response Preview: ${content.trim().substring(0, 100)}...`);
            console.log(`${'='.repeat(70)}\n`);

            return content.trim();

        } catch (error) {
            logger.error('Bytez request failed', error);
            return null;
        }
        break; // success — exit while loop
    } // end while

    return null;
};

/**
 * Call OpenRouter API (FREE models) with automatic fallback
 */
const callOpenRouter = async (systemPrompt, userMessage, options = {}, conversationHistory = []) => {
    // Build list of models to try (primary + fallbacks)
    const primaryModel = options.model || config.openrouter.model;
    const modelsToTry = options.skipFallback ? [primaryModel] : [primaryModel, ...FALLBACK_MODELS.filter(m => m !== primaryModel)];

    let lastError = null;

    // Try each model in sequence
    for (let i = 0; i < modelsToTry.length; i++) {
        const currentModel = modelsToTry[i];
        const isFallback = i > 0;

        if (isFallback) {
            logger.info(`Trying fallback model ${i}/${modelsToTry.length - 1}: ${currentModel}`);
        }

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

            logger.debug(`OpenRouter request`, {model: currentModel, messagesCount: messages.length});

            const response = await fetch(config.openrouter.baseUrl + '/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.openrouter.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'http://localhost:5000',
                    'X-Title': 'Student Mate AI'
                },
                body: JSON.stringify({
                    model: currentModel,
                    messages,
                    max_tokens: options.maxTokens || 500,
                    temperature: options.temperature || 0.7
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                lastError = {status: response.status, text: errorText, model: currentModel};

                // If rate-limited, try next fallback
                if (response.status === 429) {
                    logger.warn(`⚠️ Rate limited on ${currentModel} (${response.status})`);
                    if (i < modelsToTry.length - 1) {
                        continue; // Try next model
                    } else {
                        logger.error('❌ All models rate-limited (tried ' + modelsToTry.length + ' models)');
                    }
                } else {
                    // Non-429 error, don't try fallbacks
                    logger.error(`OpenRouter API Error (${response.status}) on ${currentModel}`, new Error(errorText));
                    return null;
                }

                continue; // Try next model
            }

            // Success! Process the response
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
                logger.warn(`OpenRouter returned empty response from ${currentModel}`, {data});
                // Try next fallback if available
                if (i < modelsToTry.length - 1) {
                    continue;
                }
                return null;
            }

            // Log token usage
            const usage = data?.usage || {};
            const inputTokens = usage.prompt_tokens || 0;
            const outputTokens = usage.completion_tokens || 0;
            const totalTokens = usage.total_tokens || 0;

            const modelUsed = data.model || currentModel;
            logger.llm('OpenRouter', 'success', `Response in ${duration}ms from ${modelUsed}`);

            if (isFallback) {
                console.log(`\n✅ FALLBACK SUCCESS! Used ${modelUsed} instead of ${primaryModel}\n`);
            }

            console.log(`\n${'='.repeat(70)}`);
            console.log(`📊 LLM RESPONSE METRICS`);
            console.log(`${'='.repeat(70)}`);
            console.log(`🤖 Model: ${modelUsed}`);
            console.log(`📥 Input Tokens: ${inputTokens}`);
            console.log(`📤 Output Tokens: ${outputTokens}`);
            console.log(`📊 Total Tokens: ${totalTokens}`);
            console.log(`⏱️  Duration: ${duration}ms`);
            console.log(`📝 Response Preview: ${content.trim().substring(0, 100)}...`);
            console.log(`${'='.repeat(70)}\n`);

            return content.trim();

        } catch (error) {
            logger.error(`Error with model ${currentModel}:`, error);
            lastError = {status: 'error', text: error.message, model: currentModel};
            // Try next fallback if available
            if (i < modelsToTry.length - 1) {
                continue;
            }
        }
    }

    // All models failed
    if (lastError) {
        logger.error(`All ${modelsToTry.length} models failed. Last error from ${lastError.model}:`, new Error(lastError.text));
    }
    return null;
};

const estimateTokens = (text) => Math.ceil(text.length / 4);

const truncateToTokenBudget = (text, maxTokens) => {
    const estimatedChars = maxTokens * 4;
    return text.length <= estimatedChars ? text : text.substring(0, estimatedChars) + '... [truncated]';
};

/**
 * Call Hugging Face Router API (OpenAI-compatible, FREE tier available)
 */
const callHuggingFace = async (systemPrompt, userMessage, options = {}) => {
    const startTime = Date.now();
    try {
        const model = options.model || config.huggingface.model;

        // New router uses OpenAI chat format
        const messages = [
            {role: 'system', content: systemPrompt},
            {role: 'user', content: userMessage}
        ];

        logger.debug(`HuggingFace request`, {model});

        const response = await fetch(`${config.huggingface.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.huggingface.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                max_tokens: options.maxTokens || 500,
                temperature: options.temperature || 0.7
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            logger.error(`HuggingFace API Error (${response.status})`, new Error(errorText));
            return null;
        }

        const data = await response.json();
        const duration = Date.now() - startTime;

        // OpenAI-compatible format
        const content = data?.choices?.[0]?.message?.content;

        if (!content || content.trim() === '') {
            logger.warn('HuggingFace returned empty response');
            return null;
        }

        logger.llm('HuggingFace', 'success', `Response in ${duration}ms from ${model}`);

        console.log(`\n${'='.repeat(70)}`);
        console.log(`📊 HUGGING FACE RESPONSE`);
        console.log(`${'='.repeat(70)}`);
        console.log(`🤖 Model: ${model}`);
        console.log(`⏱️  Duration: ${duration}ms`);
        console.log(`📝 Response Preview: ${content.trim().substring(0, 100)}...`);
        console.log(`${'='.repeat(70)}\n`);

        return content.trim();  // ✅ FIX: was missing, causing all HF calls to return undefined

    } catch (error) {
        logger.error('HuggingFace request failed', error);
        return null;
    }
};

const getFreeModels = () => {
    if (config.provider === 'gemini') {
        return [...new Set([config.gemini.model, config.gemini.routingModel])];
    }
    return config.openrouter.freeModels;
};

const getTaskModels = () => TASK_MODELS;

module.exports = {
    callLLM,
    callOllama,
    callGemini,
    callGeminiWithTools,
    callDeepSeek,
    callBytez,
    callOpenRouter,
    callHuggingFace,
    estimateTokens,
    truncateToTokenBudget,
    getFreeModels,
    getTaskModels,
    selectModel,
    TASK_MODELS,
    FALLBACK_MODELS,
    SINGLE_MODEL,
    OLLAMA_MODEL,
    GEMINI_MAIN_MODEL,
    GEMINI_ROUTING_MODEL,
    OR_HEAVY_REASONING_MODEL,
    config
};
