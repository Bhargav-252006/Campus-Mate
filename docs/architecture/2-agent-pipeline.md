# 2. Agent Pipeline - Classifier, Session Manager, Sub-Agents

## Classifier (4-Layer Pipeline)

```
classifier.classify(message, sessionAgent)
|
+-- Layer 0: Session Tiebreaker
|     \-- If sessionAgent exists, boost its score by +0.15 (soft boost, not a lock)
|
+-- Layer 1: Greeting Fast-Path
|     \-- Regex: /^(hi|hello|hey|good morning|...)$/i
|     \-- If match -> { intent: 'GENERAL', confidence: 0.95 }
|
+-- Layer 2: Rule-Based Scoring
|     \-- INTENT_PHRASES dictionary maps phrases -> intent
|     \-- Score each intent by counting keyword matches
|     \-- EMOTIONAL gets priority if within 0.1 of top score
|
+-- Layer 3: LLM Classification
|     \-- callLLM(classifierPrompt, 'classification')
|     \-- Parse JSON { intent, confidence, reasoning }
|     \-- If LLM picks different agent from session with high confidence
|         -> source = 'LLM_SESSION_OVERRIDE'
|
\-- Layer 4: Confidence Gate
      \-- If LLM confidence < 0.6 -> fallback to rule-based
      \-- If still low -> CLARIFY intent
      \-- Final fallback chain: session -> rules -> GENERAL
```

## Session Manager

- In-memory `activeSessions` object keyed by userId
- 10-minute inactivity timeout
- Tracks `messageCount` per session
- `updateActiveSession()` creates/updates session with agent and timestamp
- `clearActiveSession()` removes session (on topic change/override)
- GENERAL and CLARIFY do NOT create sessions
- `detectTopicChange()` was dead code -- removed in Fix #10

## Sub-Agent Architecture

All 6 agents follow an identical pattern:

```
agent.handle(message, context, userPatterns, profile, toolSchemas)
|
+-- Build persona prompt:
|     getStudentMatePersona(profile, context, specialization)
|     NOTE: context is truncated to 300 chars inside this function
|
+-- Add agent-specific instructions (AGENT_CONFIG.agentInstructions)
+-- Add adaptive tone: getAdaptiveTone(userPatterns)
+-- Add continuity: getContinuityPrompt()
|
+-- Call LLM:
|     callLLM(fullSystemPrompt, userPrompt, {
|         maxTokens, temperature, taskType: 'heavy_reasoning', toolSchemas
|     })
|
\-- Return response string or fallback
```

### Agent Specializations

| Agent | Focus | Special Behavior |
|-------|-------|------------------|
| AcademicAgent | Tutoring, concept explanation | Standard pattern |
| EmotionalSupportAgent | Mental health, wellbeing | Crisis keyword detection short-circuits LLM |
| CognitiveLoadAgent | Productivity, time management | Eisenhower matrix, Pomodoro frameworks |
| ConceptGapAgent | Missing prerequisite knowledge | Diagnostic approach, prerequisite chains |
| FailurePatternAgent | Learning from mistakes | Growth mindset, root cause analysis |
| PersonaSwitchAgent | Adaptive communication styles | Detects persona from message (eli5/friend/teacher/interviewer) |

### Agent Tool Access (AGENT_TOOLS mapping)

```
COGNITIVE  -> startPomodoro, endPomodoro, getPomodoroStats, addDeadline,
              getDeadlines, getUpcomingDeadlines, markDeadlineComplete,
              setReminder, getReminders, createStudyPlan, getStudyPlan,
              getTodaysTasks, markTaskComplete
EMOTIONAL  -> logMood, getMoodHistory, getMoodTrends
ACADEMIC   -> generateQuiz, getQuizzes, saveQuizResult, webSearch,
              wikipediaSummary, youtubeSearch, saveNote, getNotes, searchNotes
GENERAL    -> setReminder, getReminders, getTodaysTasks, getUpcomingDeadlines
```

## Plain-English Summary

- The router first tries to understand what the user wants.
- If the topic is clear, it sends the message to one specialist agent.
- If the topic is not clear enough, it asks for clarification instead of guessing.
- Each agent gets a different tool set, so the wrong tool is less likely to be used.

## Troubleshooting

- Wrong agent chosen: inspect the classifier and the confidence gate.
- Repeated rerouting: check the session tiebreaker and whether the user input is ambiguous.
- Unsafe answer: make sure the user text is still treated as untrusted data.
