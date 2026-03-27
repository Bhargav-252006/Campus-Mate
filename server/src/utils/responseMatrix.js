/**
 * Response Matrix
 * Keeps responses constructive while preserving safety escalation.
 */

const LEVELS = {
    CONTENT: 'content',
    CONCERNED: 'concerned',
    DISTRESSED: 'distressed',
    CRISIS: 'crisis'
};

const PATTERNS = {
    crisis: /\b(suicide|kill myself|end it all|want to die|self\s*harm|hurt myself|cutting|no reason to live|better off dead|end my life)\b/i,
    distressed: /\b(hopeless|overwhelmed|cannot handle|can't handle|depressed|panic|intense anxiety|worthless)\b/i,
    concerned: /\b(stressed|anxious|worried|frustrated|burnout|tired|confused|struggling)\b/i
};

const UNSAFE_NEGATIVE_PATTERNS = [
    /\byou are hopeless\b/gi,
    /\byou should give up\b/gi,
    /\bnothing can help\b/gi,
    /\bthere is no point\b/gi
];

function detectLevel(message = '') {
    if (PATTERNS.crisis.test(message)) return LEVELS.CRISIS;
    if (PATTERNS.distressed.test(message)) return LEVELS.DISTRESSED;
    if (PATTERNS.concerned.test(message)) return LEVELS.CONCERNED;
    return LEVELS.CONTENT;
}

function getInstructionForLevel(level) {
    if (level === LEVELS.CONCERNED) {
        return 'Respond with calm encouragement. Validate the feeling first, then give short practical steps.';
    }
    if (level === LEVELS.DISTRESSED) {
        return 'Respond with stronger empathy, avoid toxic positivity, and include a gentle suggestion to contact trusted support.';
    }
    if (level === LEVELS.CRISIS) {
        return 'Crisis detected: do not generate normal advice. Provide immediate safety and helpline guidance only.';
    }
    return 'Respond positively, concise, and practical.';
}

function sanitizeNegativePhrases(text = '') {
    let cleaned = text;
    UNSAFE_NEGATIVE_PATTERNS.forEach((pattern) => {
        cleaned = cleaned.replace(pattern, 'things can improve with support');
    });
    return cleaned;
}

function ensureSupportivePrefix(text, level, profile = {}) {
    const namePrefix = profile?.name ? `${profile.name}, ` : '';

    if (level === LEVELS.CONCERNED) {
        return `${namePrefix}I hear you, and what you are feeling is valid. ${text}`;
    }
    if (level === LEVELS.DISTRESSED) {
        return `${namePrefix}I am here with you. Your feelings are valid, and we can take this one step at a time. ${text}`;
    }
    return text;
}

function applyMatrix(text = '', level = LEVELS.CONTENT, profile = {}) {
    if (!text) return text;

    const sanitized = sanitizeNegativePhrases(text);
    const withPrefix = ensureSupportivePrefix(sanitized, level, profile);

    if (level === LEVELS.DISTRESSED && !/counsel(or|ling)|trusted person|professional/i.test(withPrefix)) {
        return `${withPrefix}\n\nIf this keeps feeling heavy, please consider reaching out to a trusted person or counselor for extra support.`;
    }

    return withPrefix;
}

module.exports = {
    LEVELS,
    detectLevel,
    getInstructionForLevel,
    applyMatrix
};
