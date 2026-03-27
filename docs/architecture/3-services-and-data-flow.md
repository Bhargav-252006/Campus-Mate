# 3. Services & Data Flow

## ConversationService (services/conversationService.js)

Single orchestration entry point. Called by `routes/chat.js`.

```
handleChat({ userId, message, clientRequestId })
|
+-- Call centralizedAgent.processRequest(message, userId)
|     (memoryManager stores user+bot messages internally)
+-- Build response envelope
+-- Emit 'chat.messageHandled' event via eventBus
+-- Log trace to statsRepo (if tracing enabled)
\-- Return envelope
```

## ResponsePipeline (services/responsePipeline.js)

Response normalization layer called by postProcessor:

- Strip `<think>...</think>` tags (Qwen3 reasoning blocks)
- Enforce length limits (configurable via features.MAX_RESPONSE_LENGTH)

## ToolService (services/toolService.js)

Unified tool execution layer:

```
executeTool({ name, args, userId })
|
+-- Emit 'tool:execute:before' event
+-- registry.execute(name, args, userId)
|     +-- Validate params against schema
|     \-- Call tool module (pomodoro, mood, deadlines, etc.)
|           \-- Repository -> DataStore -> JSON file
+-- Emit 'tool:execute:after' event
\-- Return { success, result } or { success: false, error }
```

## Tool Execution - Dual Path

```
                     USER MESSAGE
                          |
                +---------+----------+
                v                    v
       PATH 1: DIRECT            PATH 2: AGENT-INITIATED
       (Pre-classification)      (Post-agent response)
                |                    |
toolHandler.detectToolTrigger()   Agent generates response with
Keyword matching:                 tool markers:
"start pomodoro" -> pomodoro      +-- Native: __toolCalls JSON
"how am i feeling" -> mood        \-- Regex: [TOOL_CALL: name(args)]
"set reminder" -> reminders            |
"search for" -> search                 v
     |                          postProcessor detects markers
     v                                 |
toolHandler.handleToolRequest()  +-----+-----+
     |                           v           v
     |                     handleNative   parseAndExecute
     |                     ToolCalls()    ToolCalls()
     |                        |              |
     +--------+---------------+--------------+
              v
    toolService.executeTool(name, params, userId)
              |
              v
    registry.execute(name, params, userId)
              |
              v
    Tool Module -> Repository -> DataStore -> JSON file
```

## Persistence Layer

```
server/data/
|
+-- memory-v3.json         <-- memoryManagerV3 (5s debounce)
|   { [userId]: { working[], shortTerm[], episodic[], semantic[], meta{} } }
|
+-- profiles-v3.json       <-- memoryManagerV3 (5s debounce)
|   { [userId]: { profile: {name,grade,...}, preferences: {tone,...} } }
|
+-- (chat-history.json REMOVED - was duplicate of memory-v3.json, see Issue #1)
|
+-- pomodoro.json           <-- pomodoroRepo / DataStore
+-- mood.json               <-- moodRepo / DataStore
+-- deadlines.json          <-- deadlineRepo / DataStore
+-- reminders.json          <-- reminderRepo / DataStore
+-- notes.json              <-- notesRepo / DataStore
+-- study-plans.json        <-- studyPlanRepo / DataStore
\-- stats.json              <-- statsRepo / DataStore
```

## Plain-English Summary

The backend currently has more than one helper that reads and writes JSON files. That gives flexibility, but it also means the same kind of data can be managed in different ways.

The main thing to remember is ownership:
- each file should have a clear owner,
- each request should know which user it belongs to,
- and the cache should never be treated as the source of truth.

## Troubleshooting

- If a change seems to disappear, check for another helper writing the same file.
- If data looks stale, check the cache first.
- If a tool works but the UI does not change, check whether the frontend is reading a different store.
