const path = require('path');
require('dotenv').config({path: path.join(__dirname, '../../.env')});
const logger = require('./logger');

/**
 * 🌟 LLM Service - OpenRouter FREE models only
 * 
 * OpenRouter FREE models available:
 * - mistralai/mistral-7b-instruct:free
 * - google/gemma-7b-it:free
 * - meta-llama/llama-3-8b-instruct:free
 * - openchat/openchat-7b:free
 * - huggingfaceh4/zephyr-7b-beta:free
 * 
 * Get your FREE key at: https://openrouter.ai/keys
 */

const config = {
    provider: 'openrouter',

    openrouter: {
        apiKey: process.env.OPENROUTER_API_KEY,
        baseUrl: 'https://openrouter.ai/api/v1',
        model: process.env.OPENROUTER_MODEL || 'mistralai/mistral-7b-instruct:free',
        freeModels: [
            'mistralai/mistral-7b-instruct:free',
            'google/gemma-7b-it:free',
            'meta-llama/llama-3-8b-instruct:free',
            'openchat/openchat-7b:free',
            'huggingfaceh4/zephyr-7b-beta:free'
        ]
    }
};

// Startup logging
logger.separator('LLM SERVICE CONFIGURATION');
logger.info(`Provider: OpenRouter (FREE)`);
logger.info(`OpenRouter Key: ${config.openrouter.apiKey ? '✓ Configured' : '✗ Not set'}`);
if (!config.openrouter.apiKey) {
    logger.warn('No API key configured! LLM features will use fallback responses.');
    logger.info('Get FREE API key at: https://openrouter.ai/keys');
}

/**
 * Main LLM call function - OpenRouter only
 */
const callLLM = async (systemPrompt, userMessage, options = {}, conversationHistory = []) => {
    logger.debug('callLLM invoked', {provider: 'openrouter', messageLength: userMessage.length});

    if (config.openrouter.apiKey) {
        logger.llm('OpenRouter', 'attempting', 'Calling free model...');
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

        // Include conversation history for memory
        conversationHistory.forEach(msg => {
            messages.push({
                role: msg.sender === 'user' ? 'user' : 'assistant',
                content: msg.text
            });
        });

        messages.push({role: 'user', content: userMessage});

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

        // Validate response has content
        const content = data?.choices?.[0]?.message?.content;
        if (!content || content.trim() === '') {
            logger.warn('OpenRouter returned empty response', {data});
            return null;
        }

        logger.llm('OpenRouter', 'success', `Response in ${duration}ms from ${data.model || model}`);

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

module.exports = {
    callLLM,
    callOpenRouter,
    estimateTokens,
    truncateToTokenBudget,
    getFreeModels,
    config
};
