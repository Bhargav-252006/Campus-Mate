/**
 * ⚙️ FEATURE FLAGS & CONFIGURATION
 *
 * Central config for toggling subsystems on/off.
 * Reads from environment variables with sensible defaults.
 */

const config = {
    // ── Post-processing pipeline toggles ─────────────────────
    // P7 fix: Self-eval defaults to OFF — it doubles latency with an extra LLM call per response
    ENABLE_SELF_EVAL: process.env.ENABLE_SELF_EVAL === 'true',
    ENABLE_CONFIDENCE_SCORING: process.env.ENABLE_CONFIDENCE_SCORING !== 'false',
    ENABLE_STALL_DETECTION: process.env.ENABLE_STALL_DETECTION !== 'false',
    ENABLE_PROGRESS_LEDGER: process.env.ENABLE_PROGRESS_LEDGER !== 'false',

    // ── Repair / validation toggles ──────────────────────────
    ENABLE_REPAIR_LOOP: process.env.ENABLE_REPAIR_LOOP === 'true',

    // ── Retrieval toggles ────────────────────────────────────
    ENABLE_HYBRID_RETRIEVAL: process.env.ENABLE_HYBRID_RETRIEVAL === 'true',

    // ── LLM provider override (also in llmService) ──────────
    LLM_PROVIDER: process.env.LLM_PROVIDER || 'ollama',

    // ── Event bus ────────────────────────────────────────────
    ENABLE_EVENT_BUS: process.env.ENABLE_EVENT_BUS !== 'false',

    // ── Logging ──────────────────────────────────────────────
    ENABLE_LLM_TRACING: process.env.ENABLE_LLM_TRACING !== 'false',

    // ── Response pipeline ────────────────────────────────────
    STRIP_THINK_TAGS: process.env.STRIP_THINK_TAGS !== 'false',
    MAX_RESPONSE_LENGTH: parseInt(process.env.MAX_RESPONSE_LENGTH || '4000', 10),
    INJECT_CITATIONS: process.env.INJECT_CITATIONS === 'true',
};

module.exports = config;
