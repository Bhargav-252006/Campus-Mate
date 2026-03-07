/**
 * 🔄 RESPONSE PIPELINE - Central middleware for all model responses
 *
 * Every LLM response passes through here before reaching the client.
 * Provider-specific quirks (Gemini, Qwen, etc.) are normalized here.
 */

const features = require('../config/features');
const logger = require('../utils/logger');

/**
 * Normalize a raw LLM response string.
 * @param {string} text - Raw LLM output
 * @returns {string} Cleaned text
 */
function normalizeResponse(text) {
    if (!text) return '';

    let out = text;

    // Strip <think>...</think> blocks (Qwen3, DeepSeek, etc.)
    if (features.STRIP_THINK_TAGS) {
        out = out.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    }

    // Enforce max length
    if (out.length > features.MAX_RESPONSE_LENGTH) {
        // Try to cut at a sentence boundary
        const truncated = out.substring(0, features.MAX_RESPONSE_LENGTH);
        const lastPeriod = truncated.lastIndexOf('.');
        out = lastPeriod > features.MAX_RESPONSE_LENGTH * 0.7
            ? truncated.substring(0, lastPeriod + 1)
            : truncated + '…';
    }

    // Normalize whitespace: collapse triple+ newlines into double
    out = out.replace(/\n{3,}/g, '\n\n');

    return out.trim();
}

/**
 * Map [source:ID] tokens to markdown links (future: citation injection).
 */
function injectCitations(text, sourceMap = {}) {
    if (!features.INJECT_CITATIONS || !sourceMap || Object.keys(sourceMap).length === 0) {
        return text;
    }
    return text.replace(/\[source:(\w+)\]/g, (match, id) => {
        const src = sourceMap[id];
        if (src && src.url) {
            return `[${src.title || id}](${src.url})`;
        }
        return match;
    });
}

module.exports = {normalizeResponse, injectCitations};
