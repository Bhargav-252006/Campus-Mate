# 5. Architectural Issues - Identified & Fixed

## CRITICAL

### Issue #1: Duplicate Message Storage (FIXED)
- **Location**: `conversationService.js` (formerly chatHistoryStore) + `agentRouter.js` (memoryManager)
- **Problem**: Messages stored in 2 separate JSON files with different structures, never synced
- **Fix**: Removed all chatHistoryStore usage from conversationService and removed the chatHistoryStore instance entirely from dataStore.js. Memory manager is now the single source of truth for conversation history. The chat-history.json file is no longer created.

### Issue #2: Memory Context Truncated to 300 chars (FIXED)
- **Location**: `studentMatePersona.js` line 42
- **Problem**: `buildContext()` produces ~3000 tokens of rich context but sub-agents only see first 300 characters
- **Fix**: Increased context limit to 1500 chars. Sub-agents now receive meaningful memory context.

### Issue #3: Race Condition in Debounced Save (FIXED)
- **Location**: `memoryManagerV3.js` `_performSave()`
- **Problem**: Dirty flag cleared BEFORE async write completes. New messages during write window will not trigger re-save
- **Fix**: Dirty flag now cleared only AFTER async write completes successfully. Write-in-progress flag prevents overlapping writes.

## MODERATE

### Issue #4: promptAssembler Only Used by GENERAL (FIXED)
- **Location**: `agentRouter.js` `handleGeneralWithLLM()`
- **Problem**: Sub-agents bypass the assembler, building prompts ad-hoc, missing profile/preferences/patterns injection
- **Fix**: agentRouter now passes full memoryData to sub-agents. Sub-agents receive profile, preferences, summary, patterns through the context parameter.

### Issue #5: Self-Evaluator Costs LLM Call with No Corrective Action (FIXED)
- **Location**: `postProcessor.js` + `selfEvaluator.js`
- **Problem**: Every response triggers an extra LLM call that only logs warnings, never blocks or regenerates
- **Fix**: Self-evaluator now triggers response regeneration when evaluation fails and `shouldRetry` is true. Added retry logic in postProcessor.

### Issue #6: Double SIGINT/SIGTERM Shutdown Handlers (FIXED)
- **Location**: `app.js` lines 154-155 + `memoryManagerV3.js` lines 832-840
- **Problem**: Both register handlers. memoryManager calls `process.exit()` directly, killing app.js graceful shutdown
- **Fix**: Removed process handlers from memoryManagerV3. app.js is the single shutdown coordinator.

### Issue #7: DataStore Debounce Race Condition (FIXED)
- **Location**: `dataStore.js`
- **Problem**: 500ms debounced save with no crash protection
- **Fix**: Added write-in-progress tracking and forceSave method for graceful shutdown.

### Issue #8: Tool Schemas Ignored by Non-Gemini Providers (DOCUMENTED)
- **Location**: All sub-agents + `llmService.js`
- **Problem**: `toolSchemas` param only works with Gemini native function calling
- **Status**: Documented as known limitation. Text-based [TOOL_CALL:] syntax is the fallback for non-Gemini providers.

## LOW / CODE QUALITY

### Issue #9: Dead Code memoryExtractor.js (FIXED)
- **Location**: `utils/memoryExtractor.js`
- **Problem**: Complete `MemoryExtractionPipeline` class never imported or used
- **Fix**: Removed dead file.

### Issue #10: Dead Code sessionManager.detectTopicChange() (FIXED)
- **Location**: `agents/sessionManager.js`
- **Problem**: Method exists but never called
- **Fix**: Removed dead method and unused TOPIC_CHANGE_INDICATORS.

### Issue #11: Inline Requires in postProcessor.js (FIXED)
- **Location**: `postProcessor.js` lines 175, 227, 238
- **Problem**: `require('../utils/llmService')` inside function bodies to dodge circular deps
- **Fix**: Moved to top-level imports. Restructured to break the circular dependency.

### Issue #12: Implicit Mutation in postProcessor Response (FIXED)
- **Location**: `postProcessor.runPostProcessing()`
- **Problem**: Mutates response in-place, implicit coupling
- **Fix**: Added documentation and JSDoc. Response object contract is now explicit.
