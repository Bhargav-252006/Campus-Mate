// Chat Service - Conversation & Agent Orchestration
// Handles LLM interactions with multi-agent routing and memory

require('dotenv').config();
const express = require('express');
const OpenAI = require('openai');
const logger = require('../utils/logger');
const {query} = require('../shared/db');
const {cache, pubSub} = require('../shared/redis');
const ServiceClient = require('../shared/ServiceClient');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

// Service clients
const dataService = new ServiceClient(process.env.DATA_SERVICE_URL || 'http://data-service:3003');
const memoryService = new ServiceClient(process.env.MEMORY_SERVICE_URL || 'http://localhost:3005');
const authService = new ServiceClient(process.env.AUTH_SERVICE_URL || 'http://localhost:3001');

// ============ LLM PROVIDER CONFIGURATION ============
const LLM_CONFIG = {
    groq: {
        apiKey: process.env.GROQ_API_KEY,
        model: process.env.GROQ_MODEL || process.env.LLM_MODEL || 'llama-3.3-70b-versatile'
    }
};

if (!LLM_CONFIG.groq.apiKey) {
    throw new Error('GROQ_API_KEY is required for chat-service');
}

const groqClient = new OpenAI({
    apiKey: LLM_CONFIG.groq.apiKey,
    baseURL: 'https://api.groq.com/openai/v1'
});

// ============ LLM SERVICE LAYER ============

/**
 * Groq-only LLM execution.
 */
async function callLLM(prompt, conversationHistory = [], options = {}) {
    const startTime = Date.now();
    const provider = 'groq';

    try {
        const result = await callGroq(prompt, conversationHistory, options);

        await logLLMTrace({
            success: true,
            provider,
            model: LLM_CONFIG.groq.model,
            tokensUsed: result.tokensUsed,
            responseTimeMs: Date.now() - startTime,
            promptLength: prompt.length
        });

        return result;
    } catch (error) {
        throw new Error(`Groq failed: ${error.message}`);
    }
}

/**
 * Call Groq API (OpenAI-compatible)
 */
async function callGroq(prompt, history = [], options = {}) {
    try {
        const response = await groqClient.chat.completions.create({
            model: options.model || LLM_CONFIG.groq.model,
            messages: [
                ...history.map((h) => ({
                    role: h.role === 'assistant' ? 'assistant' : 'user',
                    content: h.content
                })),
                {role: 'user', content: prompt}
            ],
            temperature: typeof options.temperature === 'number' ? options.temperature : 0.7,
            max_tokens: options.maxTokens || 1200
        });

        const responseText = response.choices?.[0]?.message?.content || '';
        const tokensUsed = response.usage?.total_tokens || 0;

        return {
            response: responseText,
            tokensUsed,
            provider: 'groq'
        };
    } catch (error) {
        throw new Error(`Groq failed: ${error.message}`);
    }
}

/**
 * Log LLM usage traces to database
 */
async function logLLMTrace(data) {
    try {
        const userId = data.userId || 'system';
        await query(
            `INSERT INTO llm_traces (user_id, request_type, provider, model_used, tokens_used, response_time_ms, success, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                userId,
                'chat_generation',
                data.provider,
                data.model,
                data.tokensUsed || 0,
                data.responseTimeMs,
                data.success,
                JSON.stringify({
                    primaryFailed: data.primaryFailed,
                    promptLength: data.promptLength
                })
            ]
        );
    } catch (error) {
        logger.error('Failed to log LLM trace:', error);
    }
}

// ============ CHAT ENDPOINTS ============

app.get('/health', (req, res) => {
    res.json({status: 'OK', service: 'Chat Service', version: '2.0'});
});

// POST /chat - Send message and get response
app.post('/', async (req, res) => {
    try {
        const bodyUserId = req.body?.userId;
        const headerUserId = req.headers['x-user-id'];
        const userId = bodyUserId || headerUserId;
        const {message, conversationId} = req.body;

        if (!message) {
            return res.status(400).json({error: 'Message is required'});
        }

        if (!userId) {
            return res.status(400).json({error: 'userId is required'});
        }

        const convId = conversationId || `conv_${userId}_${Date.now()}`;

        // Store user message
        await query(
            `INSERT INTO chat_messages (user_id, conversation_id, role, content, timestamp)
       VALUES ($1, $2, $3, $4, NOW())`,
            [userId, convId, 'user', message]
        );

        logger.info(`Chat message from ${userId}: ${message.substring(0, 50)}...`);

        // Get conversation history
        const history = await query(
            `SELECT role, content FROM chat_messages 
       WHERE user_id = $1 AND conversation_id = $2
       ORDER BY timestamp ASC
       LIMIT 20`,
            [userId, convId]
        );

        // Get user profile from memory service for context
        let userContext = '';
        try {
            const profile = await dataService.get(`/profile/${userId}`);
            userContext = `User: ${profile.name} (${profile.program})`;
        } catch (e) {
            logger.debug('Could not fetch user profile');
        }

        // Build prompt with context
        const systemPrompt = `You are Campus Mate, a personal AI assistant for students. ${userContext}
Help the user with:
- Study planning and scheduling
- Academic advice and explanations
- Emotional support and stress management  
- Productivity tips and focus techniques
- Progress tracking and analytics

Be empathetic, encouraging, and practical. Keep responses concise but helpful.`;

        // Inject system instructions directly into the prompt for Groq chat.
        const finalPrompt = `${systemPrompt}\n\nUser message: ${message}`;

        // Call LLM
        const llmResponse = await callLLM(finalPrompt, history, {temperature: 0.7});

        // Store assistant response
        await query(
            `INSERT INTO chat_messages (user_id, conversation_id, role, content, agent_type, timestamp)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
            [userId, convId, 'assistant', llmResponse.response, 'general']
        );

        res.json({
            conversationId: convId,
            response: llmResponse.response,
            message: llmResponse.response,
            provider: llmResponse.provider,
            timestamp: new Date().toISOString(),
            status: 'success'
        });

    } catch (error) {
        logger.error('Chat error:', error);
        res.status(500).json({
            error: 'Chat processing failed',
            message: error.message
        });
    }
});

// GET /history/:conversationId - Get conversation history
app.get('/history/:conversationId', async (req, res) => {
    try {
        const {conversationId} = req.params;
        const userId = req.headers['x-user-id'];

        const messages = await query(
            `SELECT id, role, content, agent_type, timestamp FROM chat_messages 
       WHERE user_id = $1 AND conversation_id = $2
       ORDER BY timestamp ASC
       LIMIT 100`,
            [userId, conversationId]
        );

        res.json({
            conversationId,
            messages,
            count: messages.length
        });
    } catch (error) {
        logger.error('History fetch error:', error);
        res.status(500).json({error: 'Failed to fetch history'});
    }
});

// GET /history - Backward compatibility route for clients that don't pass conversationId.
app.get('/history', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'] || req.query.userId;
        if (!userId) {
            return res.json([]);
        }

        const selectedConversationId = req.query.conversationId;
        let conversationId = selectedConversationId;

        if (!conversationId) {
            const latestConversation = await query(
                `SELECT conversation_id, MAX(timestamp) as last_message
         FROM chat_messages
         WHERE user_id = $1
         GROUP BY conversation_id
         ORDER BY last_message DESC
         LIMIT 1`,
                [userId]
            );

            conversationId = latestConversation[0]?.conversation_id;
            if (!conversationId) {
                return res.json([]);
            }
        }

        const messages = await query(
            `SELECT id, role, content, agent_type, timestamp FROM chat_messages
       WHERE user_id = $1 AND conversation_id = $2
       ORDER BY timestamp ASC
       LIMIT 100`,
            [userId, conversationId]
        );

        const normalized = messages.map((item) => ({
            id: item.id,
            sender: item.role === 'user' ? 'user' : 'bot',
            text: item.content,
            timestamp: item.timestamp,
            conversationId: conversationId,
            agentType: item.agent_type
        }));

        res.json(normalized);
    } catch (error) {
        logger.error('History fetch error:', error);
        res.status(500).json({error: 'Failed to fetch history'});
    }
});

// GET /conversations - List user's conversations
app.get('/conversations', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'];

        const conversations = await query(
            `SELECT DISTINCT conversation_id, MAX(timestamp) as last_message 
       FROM chat_messages 
       WHERE user_id = $1
       GROUP BY conversation_id
       ORDER BY last_message DESC
       LIMIT 20`,
            [userId]
        );

        res.json({conversations, total: conversations.length});
    } catch (error) {
        logger.error('Conversations fetch error:', error);
        res.status(500).json({error: 'Failed to fetch conversations'});
    }
});

// POST /clear - Clear conversation
app.post('/clear', async (req, res) => {
    try {
        const {userId, conversationId} = req.body;

        if (!userId) {
            return res.status(400).json({error: 'userId is required'});
        }

        if (conversationId) {
            await query(
                'DELETE FROM chat_messages WHERE user_id = $1 AND conversation_id = $2',
                [userId, conversationId]
            );
        } else {
            await query('DELETE FROM chat_messages WHERE user_id = $1', [userId]);
        }

        res.json({message: 'Conversation cleared'});
    } catch (error) {
        logger.error('Clear error:', error);
        res.status(500).json({error: 'Failed to clear conversation'});
    }
});

// DELETE /history - Backward compatibility route to clear all chat history for a user.
app.delete('/history', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'] || req.query.userId;
        if (!userId) {
            return res.status(400).json({error: 'userId is required'});
        }

        await query('DELETE FROM chat_messages WHERE user_id = $1', [userId]);
        res.json({message: 'History cleared'});
    } catch (error) {
        logger.error('History clear error:', error);
        res.status(500).json({error: 'Failed to clear history'});
    }
});

// GET /config - Get service configuration
app.get('/config', (req, res) => {
    res.json({
        provider: process.env.LLM_PROVIDER,
        model: process.env.LLM_MODEL,
        constraints: {
            excludedModels: ['claude-3.5-haiku', 'models-with-0.33x'],
            note: 'Only full-size models allowed'
        },
        version: '2.0'
    });
});

// Listen on startup
app.listen(PORT, () => {
    logger.info(`✨ Chat Service listening on port ${PORT}`);
    logger.info(`🤖 LLM Provider: groq`);
    logger.info(`📊 LLM Model: ${LLM_CONFIG.groq.model}`);
});
