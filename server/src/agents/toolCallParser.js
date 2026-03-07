/**
 * 🔍 TOOL CALL PARSER
 *
 * Parses [TOOL_CALL: toolName(param="value")] markers from LLM text.
 * Pure function — no side effects; returns structured data.
 */

const logger = require('../utils/logger');

/**
 * @param {string} text - Raw LLM response text
 * @returns {{ cleanedText: string, toolCalls: Array<{ full: string, toolName: string, params: object }> }}
 */
function parseToolCalls(text) {
    const toolCallPattern = /\[TOOL_CALL:\s*(\w+)\(([^)]*)\)\]/g;
    const toolCalls = [];
    let match;

    while ((match = toolCallPattern.exec(text)) !== null) {
        const rawParams = match[2];
        const params = {};
        const paramPattern = /(\w+)\s*=\s*(?:"([^"]*)"|([\w.-]+))/g;
        let pm;
        while ((pm = paramPattern.exec(rawParams)) !== null) {
            const key = pm[1];
            const val = pm[2] !== undefined ? pm[2] : pm[3];
            params[key] = isNaN(val) ? val : Number(val);
        }

        toolCalls.push({full: match[0], toolName: match[1], params});
    }

    return {cleanedText: text, toolCalls};
}

module.exports = {parseToolCalls};
