# 1. Chat Request Lifecycle - Full Trace

```
HTTP POST /api/chat { message, userId, clientRequestId }
|
+-- [MIDDLEWARE CHAIN - app.js]
|   +-- CORS (origin: localhost:3000/5173)
|   +-- Rate Limiters: generalLimiter (200/15min) + chatLimiter (15/min)
|   +-- express.json({ limit: '10mb' })
|   +-- sanitizeMiddleware (inputSanitizer.js)
|   |     \-- Strips prompt injection patterns, control chars, excessive whitespace
|   +-- Request logger (timestamp, method, url)
|   \-- authMiddleware (auth.js) -- mounted in routes/api.js
|         \-- JWT verify -> req.userId (or 'anonymous' if no token)
|
+-- [ROUTING - routes/api.js -> routes/chat.js]
|   \-- POST / handler extracts { message, userId, clientRequestId }
|
+-- [CONVERSATION SERVICE - services/conversationService.js]
|   |
|   +-- 1. CALL AGENT PIPELINE
|   |     \-- centralizedAgent.processRequest(message, userId)
|   |         |
|   |         |  +-----------------------------------------------------+
|   |         |  |        AGENT ROUTER (agentRouter.js)                 |
|   |         |  |        CentralizedAgent.processRequest()             |
|   |         |  +-----------------------------------------------------+
|   |         |
|   |         +-- STEP 1: STORE IN MEMORY
|   |         |     \-- memoryManager.addMessage(userId, { sender:'user', text })
|   |         |         +-- Working memory (last 5 messages)
|   |         |         +-- Short-term memory (last 20 messages)
|   |         |         +-- Auto-extract profile data (name, grade, subjects...)
|   |         |         \-- Every 15 user msgs -> LLM episodic summarization
|   |         |
|   |         +-- STEP 2: GATHER MEMORY CONTEXT
|   |         |     +-- memoryManager.getProfile(userId)
|   |         |     +-- memoryManager.getPreferences(userId)
|   |         |     +-- memoryManager.getSummary(userId)
|   |         |     +-- memoryManager.getRecentMessages(userId, 5)
|   |         |     +-- memoryManager.getPatterns(userId)
|   |         |     \-- memoryManager.getContext(userId) -> context string (~3000 tokens)
|   |         |
|   |         +-- STEP 2.5: DIRECT TOOL TRIGGER CHECK        <-- SHORT-CIRCUIT PATH
|   |         |     \-- toolHandler.detectToolTrigger(message)
|   |         |         \-- Keyword matching against TOOL_KEYWORDS map
|   |         |         If match found:
|   |         |           \-- toolHandler.handleToolRequest(trigger, message, userId, context)
|   |         |               \-- toolService.executeTool(toolName, params, userId)
|   |         |                   \-- registry.execute(toolName, params, userId)
|   |         |                       \-- Individual tool module -> repository -> JSON file
|   |         |           \-- RETURN early (skips classification + agents entirely)
|   |         |
|   |         +-- STEP 3: CLASSIFICATION (4-Layer Pipeline)
|   |         |     \-- classifier.classify(message, sessionContext)
|   |         |         |
|   |         |         +-- Layer 0: Session Tiebreaker
|   |         |         |     \-- sessionManager.getSessionAgent(userId)
|   |         |         |         \-- Boosts existing agent score by +0.15 (not a lock)
|   |         |         |
|   |         |         +-- Layer 1: Greeting Fast-Path
|   |         |         |     \-- Regex: /^(hi|hello|hey|good morning|...)$/i
|   |         |         |         \-- If match -> { intent: 'GENERAL', confidence: 0.95 }
|   |         |         |
|   |         |         +-- Layer 2: Rule-Based Scoring
|   |         |         |     \-- INTENT_PHRASES dictionary (phrases -> intent mapping)
|   |         |         |         \-- Score each intent by keyword matches
|   |         |         |         \-- EMOTIONAL gets priority if within 0.1 of top score
|   |         |         |
|   |         |         +-- Layer 3: LLM Classification
|   |         |         |     \-- callLLM(classifierPrompt, 'classification')
|   |         |         |         \-- Parse JSON { intent, confidence, reasoning }
|   |         |         |
|   |         |         \-- Layer 4: Confidence Gate
|   |         |               \-- If LLM confidence < 0.6 -> fallback to rule-based
|   |         |               \-- If still low -> CLARIFY intent
|   |         |               \-- Final fallback chain: session -> rules -> GENERAL
|   |         |
|   |         +-- STEP 3.5: PROGRESS LEDGER
|   |         |     \-- progressLedger.trackTask(userId, classification)
|   |         |
|   |         +-- STEP 4: ROUTE TO SUB-AGENT
|   |         |     \-- routeToSubAgent(classification.intent, ...)
|   |         |         |
|   |         |         +-- ACADEMIC    -> academicAgent.handle()
|   |         |         +-- EMOTIONAL   -> emotionalSupportAgent.handle()
|   |         |         |                  \-- Crisis detection short-circuit (keywords check)
|   |         |         +-- COGNITIVE   -> cognitiveLoadAgent.handle()
|   |         |         +-- CONCEPT_GAP -> conceptGapAgent.handle()
|   |         |         +-- FAILURE     -> failurePatternAgent.handle()
|   |         |         +-- PERSONA     -> personaSwitchAgent.handle()
|   |         |         +-- GENERAL     -> handleGeneralWithLLM()
|   |         |         |                  \-- Uses promptAssembler (ONLY place it's used)
|   |         |         \-- CLARIFY     -> inline clarification response
|   |         |
|   |         |     Each sub-agent internally:
|   |         |         +-- getStudentMatePersona(profile, context, specialization)
|   |         |         +-- Agent-specific instructions + getAdaptiveTone() + getContinuityPrompt()
|   |         |         \-- callLLM(prompt, 'default', history, toolSchemas)
|   |         |
|   |         +-- STEP 4.5: POST-PROCESSING PIPELINE
|   |         |     \-- postProcessor.runPostProcessing(response, ...)
|   |         |         |
|   |         |         +-- A. Normalize response -> { text, agentType, intent }
|   |         |         +-- B. responsePipeline.processResponse()
|   |         |         |     \-- Strip <think> tags, enforce length (50-2000 chars)
|   |         |         +-- C. Self-evaluation (selfEvaluator.evaluate)
|   |         |         |     \-- Extra LLM call -> logs warnings only, no corrective action
|   |         |         +-- D. Confidence scoring (confidenceScorer.score)
|   |         |         |     \-- Heuristic: length, question marks, hedging words
|   |         |         +-- E. Tool call parsing
|   |         |         |     +-- Path A: Native Gemini (__toolCalls in response)
|   |         |         |     |    \-- handleNativeToolCalls() -> toolService.executeTool()
|   |         |         |     |        \-- Up to 3 follow-up LLM iterations
|   |         |         |     \-- Path B: Regex [TOOL_CALL: name(params)]
|   |         |         |          \-- parseAndExecuteToolCalls() -> toolService.executeTool()
|   |         |         +-- F. Stall detection (stallDetector)
|   |         |         |     \-- Detects repeated/looping responses -> recovery prompt
|   |         |         \-- G. Progress ledger update
|   |         |
|   |         +-- STEP 5: STORE BOT RESPONSE IN MEMORY
|   |         |     \-- memoryManager.addMessage(userId, { sender:'bot', text })
|   |         |
|   |         \-- STEP 6: UPDATE SESSION
|   |               \-- sessionManager.updateSession(userId, intent)
|   |
|   +-- 2. BUILD RESPONSE ENVELOPE
|   |     \-- { response: text, userId, agentType, confidence, ... }
|   |
|   +-- 3. EMIT EVENTS
|   |     \-- eventBus.emit('chat.messageHandled', { userId, message, response, ... })
|   |
|   \-- 4. LOG TRACE
|         \-- statsRepo.addTrace(traceData)
|
\-- HTTP 200 { response, userId, agentType, confidence, ... }
```
