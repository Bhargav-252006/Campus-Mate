# Campus Mate — Architecture Overview

> **Version:** 2.0 (v2-architecture branch)
> **Last updated:** March 2026

Campus Mate is an AI-powered student assistant that combines multi-agent intent routing, multi-provider LLM fallback, 5-tier conversational memory, and a suite of productivity tools — all backed by JSON file persistence (no database required).

---

## Table of Contents

1. [System Map](#system-map)
2. [Monorepo Structure](#monorepo-structure)
3. [High-Level Request Flow](#high-level-request-flow)
4. [Backend Architecture](#backend-architecture)
5. [Frontend Architecture](#frontend-architecture)
6. [Data & Persistence Layer](#data--persistence-layer)
7. [Security Model](#security-model)
8. [Infrastructure & Events](#infrastructure--events)
9. [Detailed Architecture Docs](#detailed-architecture-docs)

---

## System Map

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT (React 18 + Vite 7)            │
│  ┌──────────┐  ┌───────────┐  ┌────────────┐  ┌────────────┐  │
│  │ Chat.jsx │  │Dashboard  │  │ 14 more    │  │ Layout.jsx │  │
│  │ (551 ln) │  │(423 ln)   │  │ pages      │  │ (sidebar)  │  │
│  └────┬─────┘  └─────┬─────┘  └─────┬──────┘  └────────────┘  │
│       └───────────────┼──────────────┘                         │
│                   api.js (Axios + JWT interceptor)              │
└───────────────────────┬────────────────────────────────────────┘
                        │ HTTP (Vite proxy → localhost:5000)
┌───────────────────────▼────────────────────────────────────────┐
│                        SERVER (Express 4 + Node.js)            │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  app.js  — helmet, CORS, JSON parsing, auth middleware  │   │
│  └────┬────────────────────────────────────────────────────┘   │
│       │                                                        │
│  ┌────▼────────────────────────────────────────────────────┐   │
│  │  routes/api.js  — mounts all sub-routes after auth      │   │
│  │  ├── POST /api/chat        → chat.js                    │   │
│  │  ├── /api/timetable        → timetable.js  (CRUD)       │   │
│  │  ├── /api/exams            → exams.js      (CRUD)       │   │
│  │  ├── /api/schedule         → schedule.js   (CRUD)       │   │
│  │  ├── /api/profile          → profile.js                 │   │
│  │  ├── /api/stats            → stats.js                   │   │
│  │  └── /api/webhooks/n8n     → webhooks.js   (pre-auth)   │   │
│  └────┬────────────────────────────────────────────────────┘   │
│       │                                                        │
│  ┌────▼────────────────────────────────────────────────────┐   │
│  │  ORCHESTRATION LAYER                                    │   │
│  │  conversationService.js → agentRouter.js (347 ln)       │   │
│  │       ├── toolHandler.js    (direct tool triggers)      │   │
│  │       ├── classifier.js     (4-layer intent classify)   │   │
│  │       ├── 6 sub-agents      (specialized handlers)      │   │
│  │       └── postProcessor.js  (eval, confidence, stall)   │   │
│  └────┬────────────────────────────────────────────────────┘   │
│       │                                                        │
│  ┌────▼────────────────────────────────────────────────────┐   │
│  │  LLM LAYER — llmService.js (999+ lines)                │   │
│  │  Provider chain: DeepSeek → Ollama → Gemini → Bytez     │   │
│  │                  → HuggingFace → OpenRouter              │   │
│  │  • Gemini: native function calling (OpenAI tool schema) │   │
│  │  • Task-type model selection (heavy vs light tasks)     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  PERSISTENCE LAYER                                      │   │
│  │  ┌──────────────┐  ┌───────────────┐  ┌─────────────┐  │   │
│  │  │ Repositories │  │ Tools base.js │  │  dataStore   │  │   │
│  │  │ (8 repos,    │  │ (loadJSON /   │  │  (CRUD for   │  │   │
│  │  │  BaseRepo)   │  │  saveJSON)    │  │  routes)     │  │   │
│  │  └──────┬───────┘  └──────┬────────┘  └──────┬───────┘  │   │
│  │         └─────────────────┼──────────────────┘          │   │
│  │                     server/data/*.json                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  MEMORY — memoryManagerV3.js (851+ lines)               │   │
│  │  5 tiers: Working → Short-term → Episodic → Semantic    │   │
│  │           → Profile                                     │   │
│  │  Debounced disk writes every 5s                         │   │
│  │  Token-budgeted context for LLM prompts                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  INFRA: eventBus.js (pub/sub) │ n8nBridge.js (webhooks) │   │
│  │         features.js (flags)   │ logger.js               │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

---

## Monorepo Structure

```
campus-mate/
├── package.json              # Root — runs both with `concurrently`
├── server/
│   ├── package.json          # Express, helmet, jsonwebtoken, axios, ...
│   ├── src/
│   │   ├── app.js            # Express setup, middleware, graceful shutdown
│   │   ├── config/
│   │   │   └── features.js   # Feature flags (self-eval, stall detect, ...)
│   │   ├── core/
│   │   │   └── eventBus.js   # Internal EventEmitter pub/sub
│   │   ├── routes/           # 7 route modules
│   │   ├── agents/           # Orchestration + 6 sub-agents + classifier
│   │   ├── services/         # conversationService, toolService
│   │   ├── tools/            # 8 tool modules + registry + base utilities
│   │   ├── repositories/     # BaseRepository + 8 domain repos
│   │   ├── utils/            # LLM, memory, auth, sanitizer, prompts, ...
│   │   └── integrations/     # n8nBridge (external webhook bridge)
│   ├── data/                 # Runtime JSON files (gitignored)
│   └── architecture/         # This documentation
├── client/
│   ├── package.json          # React 18, axios, lucide-react, react-router 7
│   ├── vite.config.js        # Proxy /api → localhost:5000
│   ├── index.html            # Security meta tags
│   └── src/
│       ├── main.jsx          # Entry — calls initSession() for JWT
│       ├── App.jsx           # 17 lazy-loaded routes
│       ├── services/api.js   # Axios instance, JWT interceptor, all API calls
│       ├── components/       # Pages: Chat, Dashboard, + 14 more
│       └── context/          # ThemeContext, ToastContext, KeyboardShortcuts
└── test.ipynb                # (scratch notebook, not part of build)
```

---

## High-Level Request Flow

```
User types message in Chat.jsx
  │
  ▼
api.sendMessage(message)              — client/src/services/api.js
  │  POST /api/chat  { message }
  │  Authorization: Bearer <JWT>
  ▼
authMiddleware(req, res, next)        — server/src/utils/auth.js
  │  Verifies JWT → sets req.userId
  ▼
chatRouter POST handler               — server/src/routes/chat.js
  │  Sanitizes input (inputSanitizer)
  │  Calls conversationService.handleChat(userId, message)
  ▼
conversationService.handleChat()      — server/src/services/conversationService.js
  │  Delegates to agentRouter.processRequest()
  ▼
CentralizedAgent.processRequest()    — server/src/agents/agentRouter.js
  │
  ├─ 1. Store user message in memory (memoryManagerV3)
  ├─ 2. Check direct tool triggers (toolHandler.js)
  │     └─ If matched → execute tool → return result
  ├─ 3. Classify intent (classifier.js, 4 layers)
  │     └─ GREETING | ACADEMIC | EMOTIONAL_SUPPORT | COGNITIVE_LOAD
  │        | CONCEPT_GAP | FAILURE_PATTERN | PERSONA_SWITCH
  │        | GENERAL | CLARIFY
  ├─ 4. Route to sub-agent or handle inline
  │     └─ Sub-agent.handle() → builds prompt → calls llmService
  ├─ 5. Post-process (postProcessor.js)
  │     └─ Confidence scoring → tool call parsing → stall detection
  ├─ 6. Store bot response in memory
  │
  ▼
Response { reply, intent, confidence, ... }
  │
  ▼
Chat.jsx renders response in message list
```

See [1-request-lifecycle.md](./1-request-lifecycle.md) for the full annotated trace.

---

## Backend Architecture

### Agent Layer

| Component | File | Lines | Role |
|-----------|------|-------|------|
| CentralizedAgent | `agents/agentRouter.js` | 347 | Main orchestrator — tool check, classify, route, post-process |
| Classifier | `agents/classifier.js` | 281 | 4-layer intent classification (greeting fast-path → rules → LLM → gate) |
| ToolHandler | `agents/toolHandler.js` | 551 | Pattern-matches user input to direct tool invocations |
| PostProcessor | `agents/postProcessor.js` | — | Pipeline: self-eval → confidence → tool-call parse → stall detect |
| SessionManager | `agents/sessionManager.js` | — | Conversation session continuity tracking |
| 6 Sub-Agents | `agents/*Agent.js` | ~100 each | Specialized: academic, emotional, cognitive, conceptGap, failurePattern, personaSwitch |

All 6 sub-agents follow the same structure: `config` object + `constructor()` + `handle(context)` + `buildPrompt(context)` + `getFriendlyFallback()`.

See [2-agent-pipeline.md](./2-agent-pipeline.md) for classifier layers and sub-agent details.

### LLM Layer

`utils/llmService.js` (999+ lines) manages a **priority-ordered provider chain**:

| Priority | Provider | Use Case |
|----------|----------|----------|
| 1 | DeepSeek | Heavy reasoning (math, analysis) |
| 2 | Ollama | Local inference (preferred when available) |
| 3 | Gemini | Cloud primary — supports native function calling |
| 4 | Bytez | Cloud fallback |
| 5 | HuggingFace | Cloud fallback |
| 6 | OpenRouter | Last resort |

Key features:
- **Task-type model selection** — structured tasks (tool calls, classification) use lighter/faster models
- **Gemini function calling** — converts OpenAI-compatible tool schemas to Gemini format
- **Automatic fallback** — if a provider fails, tries the next in chain

### Tool System

8 tools registered via `tools/registry.js`:

| Tool | File | Capability |
|------|------|------------|
| pomodoro | `tools/pomodoro.js` | Start/stop/status of focus timers |
| mood | `tools/mood.js` | Record and query mood entries |
| deadlines | `tools/deadlines.js` | Add/list/remove deadlines |
| quiz | `tools/quiz.js` | Generate and manage quizzes |
| search | `tools/search.js` | Web, Wikipedia, YouTube search |
| reminders | `tools/reminders.js` | Set and manage reminders |
| notes | `tools/notes.js` | Create and retrieve notes |
| studyPlans | `tools/studyPlans.js` | Generate multi-day study plans |

Tools are invoked in two ways:
1. **Direct trigger** — `toolHandler.js` pattern-matches user input (e.g., "start a pomodoro")
2. **LLM function calling** — Gemini's native tool calling or `TOOL_CALL:` format parsed by `toolCallParser.js`

`services/toolService.js` provides the unified execution layer, emitting events via `eventBus`.

See [3-services-and-data-flow.md](./3-services-and-data-flow.md) for service details.

---

## Frontend Architecture

**Stack:** React 18 + Vite 7 + react-router-dom 7 + Axios + Lucide icons

### Pages (17, all lazy-loaded via `React.lazy` in `App.jsx`)

| Page | Component | Description |
|------|-----------|-------------|
| `/` | LandingPage | Marketing/onboarding page |
| `/app` | Layout → Dashboard | Overview with stats, upcoming deadlines, mood |
| `/app/chat` | Chat | Main AI chat interface (551 lines) |
| `/app/pomodoro` | Pomodoro | Focus timer with Pomodoro technique |
| `/app/schedule` | Schedule | Task/schedule management |
| `/app/timetable` | Timetable | Weekly class timetable |
| `/app/exams` | Exams | Exam tracking |
| `/app/mood` | MoodTracker | Mood logging and trends |
| `/app/notes` | Notes | Note taking |
| `/app/flashcards` | Flashcards | Flashcard study |
| `/app/habits` | HabitTracker | Habit tracking |
| `/app/grades` | GradeCalculator | Grade calculation |
| `/app/resources` | ResourceLibrary | Resource collection |
| `/app/deadlines` | Deadlines | Deadline management |
| `/app/analytics` | Analytics | Usage analytics |
| `/app/focus` | FocusMode | Distraction-free mode |
| `/app/system` | SystemStats | LLM traces, system health |

### Client Architecture

```
main.jsx
  │  initSession() → POST /api/auth/session → stores JWT
  ▼
App.jsx
  │  ThemeProvider → ToastProvider → KeyboardShortcuts
  │  BrowserRouter with lazy-loaded routes
  ▼
Layout.jsx
  │  Glassmorphic sidebar, theme toggle, data import/export
  │  ErrorBoundary wraps all child routes
  ▼
Page components
  │  Each page calls api.js functions
  ▼
api.js
  │  Axios instance with:
  │  • JWT Bearer token in Authorization header
  │  • 401 auto-retry interceptor (re-provisions session)
  │  • All API functions (sendMessage, getTimetable, etc.)
```

---

## Data & Persistence Layer

All data is stored as JSON files in `server/data/`. No database is required.

### Three Access Patterns (Known Architecture Issue)

| Pattern | File | Used By | Mechanism |
|---------|------|---------|-----------|
| **Repositories** | `repositories/BaseRepository.js` | Stats, notes, mood, deadlines, pomodoro, reminders, quiz, studyPlans | Class-based, debounced writes, async CRUD |
| **Tools base.js** | `tools/base.js` | All 8 tool modules | `loadJSON()`/`saveJSON()` with module-level file variables |
| **DataStore** | `utils/dataStore.js` | Timetable, exams, schedule routes | Simple read/write/CRUD for route handlers |

> **Warning:** These three systems manage overlapping JSON files independently and can overwrite each other. Unifying them into a single data layer is a planned architectural improvement. See [5-issues-and-fixes.md](./5-issues-and-fixes.md).

### Data Files

```
server/data/
├── memory.json          # Conversation memory (5-tier)
├── profiles.json        # User profiles and preferences
├── notes.json           # User notes
├── mood.json            # Mood entries
├── deadlines.json       # Deadlines
├── pomodoro.json        # Pomodoro sessions
├── reminders.json       # Reminders
├── quizzes.json         # Quiz data
├── study-plans.json     # Study plans
├── stats.json           # Usage statistics
├── timetable.json       # Weekly timetable
├── exams.json           # Exam schedule
└── schedule.json        # Tasks/schedule
```

### Memory System

`utils/memoryManagerV3.js` (851+ lines) implements 5-tier memory:

| Tier | Capacity | Content | Lifetime |
|------|----------|---------|----------|
| Working | 5 messages | Current conversation turn | Session |
| Short-term | 20 messages | Recent conversation history | Session |
| Episodic | Unlimited | LLM-generated summaries of conversations | Persistent |
| Semantic | Unlimited | Extracted facts about the user | Persistent |
| Profile | 1 per user | User preferences, learning style | Persistent |

See [4-memory-and-prompts.md](./4-memory-and-prompts.md) for memory architecture and prompt assembly details.

---

## Security Model

| Layer | Mechanism | File |
|-------|-----------|------|
| **Authentication** | JWT-based device sessions; auto-provisioned on first connect | `utils/auth.js` |
| **JWT Secret** | Env var required; random ephemeral in dev, crash in prod if missing | `utils/auth.js` |
| **HTTP Headers** | Helmet.js (CSP, HSTS, X-Frame-Options, etc.) | `app.js` |
| **Input Sanitization** | Prompt injection detection, HTML stripping, length limits | `utils/inputSanitizer.js` |
| **Injection Blocking** | `BLOCK_ON_INJECTION` defaults to `true` — blocks suspicious prompts | `utils/inputSanitizer.js` |
| **Auth Middleware** | All routes (except session creation) require valid JWT | `routes/api.js` |
| **userId Binding** | Server derives `userId` from JWT — never trusts client-supplied values | All route files |
| **Webhook Auth** | HMAC-SHA256 signature verification with timing-safe compare | `routes/webhooks.js` |
| **Client Import** | JSON validation, key whitelist, 5MB size limit | `Layout.jsx` |
| **CSP Meta** | Content-Security-Policy meta tag in index.html | `client/index.html` |

---

## Infrastructure & Events

### Event Bus (`core/eventBus.js`)

Internal pub/sub using Node.js `EventEmitter`. Events emitted:

| Event | Emitter | Payload |
|-------|---------|---------|
| `deadline.created` | deadlines tool | `{ userId, deadline }` |
| `mood.recorded` | mood tool | `{ userId, entry }` |
| `pomodoro.started` | pomodoro tool | `{ userId, session }` |
| `pomodoro.completed` | pomodoro tool | `{ userId, session }` |
| `chat.messageHandled` | agentRouter | `{ userId, intent, confidence }` |
| `tool.executed` | toolService | `{ tool, action, userId }` |

### Feature Flags (`config/features.js`)

Runtime feature toggles:

| Flag | Default | Purpose |
|------|---------|---------|
| `ENABLE_SELF_EVAL` | `false` | Extra LLM call to evaluate response quality |
| `ENABLE_CONFIDENCE_SCORING` | `true` | Heuristic confidence scoring |
| `ENABLE_STALL_DETECTION` | `true` | Detect conversation stalls |
| `ENABLE_PROGRESS_LEDGER` | `true` | Multi-turn task tracking |
| `ENABLE_LLM_TRACING` | `true` | Log LLM request/response traces |

### External Integration

`integrations/n8nBridge.js` — Outbound webhook bridge for n8n automation workflows. Inbound webhooks accepted at `POST /api/webhooks/n8n` with HMAC signature verification.

---

## Detailed Architecture Docs

| Doc | Contents |
|-----|----------|
| [1-request-lifecycle.md](./1-request-lifecycle.md) | Full annotated trace of a chat request from HTTP to response |
| [2-agent-pipeline.md](./2-agent-pipeline.md) | Classifier layers, session manager, sub-agent structure |
| [3-services-and-data-flow.md](./3-services-and-data-flow.md) | ConversationService, ToolService, data flow diagrams |
| [4-memory-and-prompts.md](./4-memory-and-prompts.md) | 5-tier memory architecture, prompt assembly, token budgeting |
| [5-issues-and-fixes.md](./5-issues-and-fixes.md) | Architectural issues identified and their fixes |

---

## Known Remaining Issues

These are documented in detail in [5-issues-and-fixes.md](./5-issues-and-fixes.md) and are planned for resolution:

1. **Dual Data Layer** — Three parallel persistence systems (Repositories, Tools base.js, DataStore) managing overlapping files
2. **Sub-Agent Boilerplate** — All 6 agents duplicate the same structure; needs a BaseAgent class
3. **Duplicate CRUD Routes** — Timetable/exams/schedule routes are nearly identical
4. **PostProcessor Gemini Coupling** — Post-processor makes direct Gemini API call instead of using llmService
5. **Unbounded Tool Data Growth** — JSON files grow without limits
6. **Missing Test Suite** — No automated tests exist

## Plain-English Summary

This document is the map for the whole app.

- The browser talks to the frontend.
- The frontend talks to the API gateway.
- The gateway sends requests to internal services.
- The chat service decides which agent should answer.
- The memory system keeps useful context.
- The persistence layer stores student data and history.

If you understand this page, the rest of the architecture docs will make much more sense.

## Reading Order

1. Request lifecycle.
2. Agent pipeline.
3. Services and data flow.
4. Memory and prompts.
5. Issues and fixes.

That order follows the path of a chat message through the system.
