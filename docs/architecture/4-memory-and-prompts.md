# 4. Memory Architecture & Prompt Assembly

## Memory Manager V3 (utils/memoryManagerV3.js)

### 5-Tier Memory Architecture

```
USER MESSAGE
     |
     v
memoryManager.addMessage()
     |
     +---> Working Memory (ring buffer, max 5)
     |       { sender, text, timestamp, importance }
     |
     +---> Short-Term Memory (max 20, FIFO eviction)
     |       { sender, text, timestamp, importance }
     |
     +---> extractAndStore()
     |       Regex extraction of:
     |         name, grade, institution, subjects,
     |         goals, weakAreas, studyStyle, interests
     |                    |
     |                    v
     |             profiles-v3.json (per-user profiles & preferences)
     |
     \---> Every 15 user messages:
             generateEpisodicSummary()
               +-- Try: LLM summarization of recent messages
               \-- Fallback: rule-based keyword extraction
                    \---> Episodic Memory (max 20 summaries)
                           { summary, timestamp, messageCount }
                                |
                                v
                          memory-v3.json
```

### Context Building (for LLM prompts)

```
memoryManager.buildContext(userId)
     |
     +-- Profile section (name, grade, subjects...)  -- budget: ~300 tokens
     +-- Semantic facts (sorted by importance)       -- budget: ~400 tokens
     +-- Episodic summaries (most recent first)      -- budget: ~800 tokens
     \-- Recent messages (newest first)              -- budget: ~1500 tokens
     |
     \---> context string (~3000 tokens max)
```

### Importance Scoring

Messages are scored 0.0-1.0 based on content:
- HIGH (0.8): name mentions, goals, exam, deadline, "remember"
- MEDIUM (0.5): preferences, wants, explanations
- LOW (0.3): greetings, small talk, one-word responses
- Boost: +0.1 for messages >100 chars, +0.2 for >200 chars

## Prompt Assembly

### PromptAssembler (utils/promptAssembler.js)

Centralized prompt builder. Currently ONLY used by `handleGeneralWithLLM()`.

```
promptAssembler.assemble({
    agentSystemPrompt,   // Agent-specific persona + instructions
    profile,             // User profile from memory
    preferences,         // User preferences
    summary,             // Episodic summary string
    recentMessages,      // Last 5 messages
    currentMessage,      // Current user input
    patterns             // Detected patterns (stress, mood)
})
     |
     v
buildSystemPrompt():
     +-- 1. Agent system prompt (core identity + instructions)
     +-- 2. Profile section (name, grade, subjects, goals, weakAreas)
     +-- 3. Preferences section (tone, style, detail level)
     +-- 4. Patterns section (stress level, mood)
     +-- 5. Summary section (conversation history summary)
     +-- 6. Response guidelines
     \-- Truncate to 6000 chars max (from end, preserving top)
     |
     v
Returns: { systemPrompt, userMessage, messages[], totalChars }
```

### Sub-Agent Prompt Pattern (studentMatePersona.js)

Sub-agents bypass promptAssembler and build prompts directly:

```
getStudentMatePersona(profile, context, specialization)
     |
     +-- Core identity ("You are Student Mate...")
     +-- Student snapshot (name, subjects, goals, interactions)
     +-- Behavior rules
     +-- Ethics guidelines
     \-- Previous context: context.substring(0, 300)  <-- TRUNCATION
     |
     v
fullSystemPrompt = persona + agentInstructions + adaptiveTone + continuityPrompt
```

## Plain-English Summary

The memory system exists to keep the assistant helpful without making every response depend on the entire conversation history.

- Working memory is for what is happening right now.
- Short-term memory is for recent context.
- Episodic memory is for important moments.
- Semantic memory is for facts and patterns.
- Profile memory is for stable user preferences.

The prompt builder then chooses the most useful parts of memory and turns them into a compact prompt for the model.

## Troubleshooting

- If the assistant forgets context too quickly, check the memory limits.
- If prompts become too long, check the token budget and truncation rules.
- If answers feel generic, make sure the profile and summary sections are being included.
