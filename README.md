# Campus Mate 🎓

A **voice-enabled, multi-agent AI companion** for students that **REMEMBERS EVERYTHING** about you — your goals, subjects, moods, deadlines, and learning patterns.

Built with **React 18 + Vite** frontend and a **Node.js + Express** backend featuring a multi-LLM provider chain (Ollama → Gemini → Bytez → HuggingFace → OpenRouter), a 4-layer intent classifier, 6 specialized AI agents, 25+ built-in tools, persistent tiered memory, and an event-driven architecture.

---

## Table of Contents

1. [Features](#-features)
2. [Architecture](#-architecture)
3. [Project Structure](#-project-structure)
4. [Getting Started](#-getting-started)
5. [LLM Provider Setup](#-llm-provider-setup)
6. [Environment Variables](#-environment-variables)
7. [API Endpoints](#-api-endpoints)
8. [AI Agents & Routing](#-ai-agents--routing)
9. [Tool System](#-tool-system)
10. [Memory System](#-memory-system)
11. [Services Layer](#-services-layer)
12. [Repository Layer](#-repository-layer)
13. [Event Bus & Integrations](#-event-bus--integrations)
14. [Feature Flags](#-feature-flags)
15. [Frontend Modules](#-frontend-modules)
16. [Testing](#-testing)
17. [Tech Stack](#-tech-stack)
18. [Future Enhancements](#-future-enhancements)

---

## ✨ Features

### Core AI Capabilities
- **Multi-Agent System** — 6 specialized agents (Academic, Emotional Support, Cognitive Load, Persona Switch, Failure Pattern, Concept Gap) with centralized routing
- **4-Layer Intent Classification** — Greeting detection → Rule-based matching → LLM classification → Confidence gating
- **25+ Built-in Tools** — Pomodoro timer, mood logging, deadline management, notes, reminders, study plans, quizzes, and web/wiki/youtube search
- **Persistent Tiered Memory** — Working, short-term, episodic, semantic, and profile memory that survives restarts
- **Multi-LLM Provider Chain** — Ollama (local) → Gemini 2.5 Flash → Bytez → HuggingFace → OpenRouter with automatic fallback

### Student Productivity
- **Dashboard** with class schedule, upcoming exams, and task overview
- **Timetable Manager** — Weekly class schedule with CRUD operations
- **Exam Tracker** — Exam dates with countdown timers
- **Daily Schedule** — Task management with priorities
- **Pomodoro Timer** — Focus sessions with streak tracking
- **Deadline Manager** — Track and prioritize upcoming deadlines
- **Notes System** — Create, tag, search, and organize notes
- **Flashcards** — Spaced-repetition study cards
- **Habit Tracker** — Daily habit streaks and monitoring
- **Grade Calculator** — GPA and grade computation
- **Resource Library** — Curated study materials
- **Focus Mode** — Distraction-free study environment
- **Mood Tracker** — Emotional wellness logging and trends
- **Analytics Dashboard** — Study patterns and progress visualization
- **System Stats** — LLM traces, provider usage, and performance metrics

### Voice & UX
- **Speech-to-Text** input (Web Speech API)
- **Text-to-Speech** responses
- **Dark/Light Theme** with system preference detection
- **Keyboard Shortcuts** for power users
- **Toast Notifications** for feedback
- **Error Boundaries** for graceful failure handling
- **Lazy-loaded Routes** for fast initial page load

---

## 🏗️ Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                   FRONTEND (React 18 + Vite)                      │
│  ┌─────────┬───────────┬───────┬──────────┬───────┬───────────┐  │
│  │Dashboard│ Timetable │ Exams │ Schedule │ Chat  │ 12+ more  │  │
│  └─────────┴───────────┴───────┴──────────┴───────┴───────────┘  │
│  Context: ThemeProvider  │  ToastProvider  │  KeyboardShortcuts   │
│  Services: api.js (Axios)│  VoiceInput (Web Speech API)          │
└──────────────────────────┬───────────────────────────────────────┘
                           │ REST API (JSON)
┌──────────────────────────┴───────────────────────────────────────┐
│                   BACKEND (Express + Node.js)                     │
│                                                                   │
│  ┌─── Routes ────────────────────────────────────────────────┐   │
│  │ chat.js │ timetable.js │ exams.js │ schedule.js │ profile │   │
│  │ stats.js │ webhooks.js                                    │   │
│  └────────────────────────┬──────────────────────────────────┘   │
│                           │                                       │
│  ┌─── Services ───────────┴──────────────────────────────────┐   │
│  │ ConversationService  │  ToolService  │  ResponsePipeline  │   │
│  └────────────────────────┬──────────────────────────────────┘   │
│                           │                                       │
│  ┌─── Agent Layer ────────┴──────────────────────────────────┐   │
│  │              CentralizedAgent (agentRouter.js)             │   │
│  │  ┌─────────────────────────────────────────────────────┐  │   │
│  │  │ Classifier (4-layer) → SessionManager → PostProcessor│  │   │
│  │  └─────────────────────────────────────────────────────┘  │   │
│  │  ┌─────────────────────────────────────────────────────┐  │   │
│  │  │  6 Sub-Agents:                                      │  │   │
│  │  │  Academic │ Emotional │ Cognitive │ Persona │        │  │   │
│  │  │  FailurePattern │ ConceptGap                        │  │   │
│  │  └─────────────────────────────────────────────────────┘  │   │
│  │  ┌─────────────────────────────────────────────────────┐  │   │
│  │  │  ToolHandler → ToolCallParser → ToolService         │  │   │
│  │  │  25+ tools: pomodoro, mood, deadlines, notes, etc.  │  │   │
│  │  └─────────────────────────────────────────────────────┘  │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─── Data Layer ────────────────────────────────────────────┐   │
│  │ MemoryManagerV3 (tiered) │ Repositories (JSON-backed)     │   │
│  │ DataStore │ LLM Service (multi-provider)                  │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─── Infrastructure ────────────────────────────────────────┐   │
│  │ EventBus │ n8nBridge │ Feature Flags │ Logger │ Auth(JWT) │   │
│  └───────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
```

---

## 📂 Project Structure

```
campus-mate/
├── client/                          # React Frontend
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── App.jsx                  # Router with lazy-loaded routes
│       ├── main.jsx                 # Entry point
│       ├── index.css                # Global styles (dark/light theme)
│       ├── components/
│       │   ├── Layout.jsx           # App shell with sidebar navigation
│       │   ├── LandingPage.jsx      # Public landing page
│       │   ├── Dashboard.jsx        # Overview: classes, exams, tasks
│       │   ├── Chat.jsx             # AI chat with voice input
│       │   ├── Timetable.jsx        # Weekly class schedule CRUD
│       │   ├── Exams.jsx            # Exam tracker with countdowns
│       │   ├── Schedule.jsx         # Daily task management
│       │   ├── Pomodoro.jsx         # Focus timer with streaks
│       │   ├── MoodTracker.jsx      # Mood logging & trends
│       │   ├── Deadlines.jsx        # Deadline management
│       │   ├── Notes.jsx            # Note-taking with tags
│       │   ├── Flashcards.jsx       # Study flashcards
│       │   ├── HabitTracker.jsx     # Daily habit streaks
│       │   ├── GradeCalculator.jsx  # GPA computation
│       │   ├── ResourceLibrary.jsx  # Study resource links
│       │   ├── FocusMode.jsx        # Distraction-free mode
│       │   ├── Analytics.jsx        # Study analytics dashboard
│       │   ├── SystemStats.jsx      # LLM traces & system metrics
│       │   ├── VoiceInput.jsx       # Speech-to-text component
│       │   ├── FeedbackButton.jsx   # User feedback widget
│       │   └── ErrorBoundary.jsx    # Graceful error handling
│       ├── context/
│       │   ├── ThemeContext.jsx      # Dark/light theme toggle
│       │   ├── ToastContext.jsx      # Toast notification system
│       │   └── KeyboardShortcuts.jsx # Global keyboard shortcut handler
│       └── services/
│           └── api.js               # Axios HTTP client for backend
│
└── server/                          # Express Backend
    ├── package.json
    ├── nodemon.json
    ├── data/                        # JSON file storage (auto-created)
    │   ├── memory-v3.json           # Tiered memory (working/short/episodic/semantic/profile)
    │   ├── profiles-v3.json         # Student profiles
    │   ├── chat-history.json        # Conversation history per user
    │   ├── schedule.json            # Daily tasks
    │   ├── timetable.json           # Class schedule
    │   ├── moods.json               # Mood entries
    │   ├── pomodoro.json            # Focus session data
    │   └── preferences.json         # User preferences
    ├── logs/                        # Server logs (auto-created)
    └── src/
        ├── app.js                   # Express server entry point
        │
        ├── config/
        │   └── features.js          # Feature flags (12 toggles from env vars)
        │
        ├── agents/                  # AI Agent System
        │   ├── agentRouter.js       # CentralizedAgent orchestrator
        │   ├── classifier.js        # 4-layer intent classification
        │   ├── sessionManager.js    # Conversation session continuity
        │   ├── postProcessor.js     # Response quality pipeline (eval, confidence, stall, progress)
        │   ├── toolHandler.js       # Direct tool-trigger detection from user messages
        │   ├── toolCallParser.js    # Parses [TOOL_CALL: name(args)] syntax from LLM output
        │   ├── studentMatePersona.js # Default persona & system prompts
        │   ├── academicAgent.js     # Academic concept explanations
        │   ├── emotionalSupportAgent.js  # Empathetic support & coping strategies
        │   ├── cognitiveLoadAgent.js     # Task prioritization & overwhelm management
        │   ├── personaSwitchAgent.js     # Communication style adaptation
        │   ├── failurePatternAgent.js    # Learning pattern analysis
        │   └── conceptGapAgent.js        # Knowledge gap identification
        │
        ├── core/
        │   └── eventBus.js          # Singleton EventEmitter for cross-cutting events
        │
        ├── services/
        │   ├── conversationService.js  # Orchestrates chat: route → persist → emit → trace
        │   ├── toolService.js          # Unified tool execution with events + tracing
        │   └── responsePipeline.js     # Response normalization & citation injection
        │
        ├── repositories/            # JSON-backed data access layer
        │   ├── BaseRepository.js    # Generic CRUD with debounced saves
        │   ├── notesRepository.js   # Notes with search & tag filtering
        │   ├── moodRepository.js    # Moods with date range queries
        │   ├── deadlineRepository.js # Deadlines with active/upcoming/overdue
        │   ├── pomodoroRepository.js # Pomodoro sessions & streaks
        │   ├── reminderRepository.js # Reminders with date filtering
        │   ├── quizRepository.js    # Quizzes by topic & recency
        │   ├── studyPlanRepository.js # Study plans with today's tasks
        │   ├── statsRepository.js   # LLM traces & progress snapshots
        │   └── index.js             # Re-exports all repositories
        │
        ├── tools/                   # Tool implementations
        │   ├── registry.js          # Tool map, execute(), getToolsPrompt()
        │   ├── base.js              # Shared helpers: loadJSON, saveJSON, generateId
        │   ├── pomodoro.js          # start/stop/status/stats (6 tools)
        │   ├── mood.js              # logMood, getMoodHistory, getMoodStats
        │   ├── deadlines.js         # add/list/complete/delete/upcoming deadlines
        │   ├── notes.js             # add/list/search/delete notes
        │   ├── reminders.js         # add/list/complete/delete reminders
        │   ├── studyPlans.js        # create/list/update/complete study plans
        │   ├── quiz.js              # generate/submit/review quizzes
        │   └── search.js            # searchWeb, searchWikipedia, searchYoutube
        │
        ├── routes/                  # Express route modules
        │   ├── api.js               # Root router: mounts all sub-routers
        │   ├── chat.js              # POST /api/chat, GET/DELETE /api/chat/history
        │   ├── timetable.js         # CRUD for class schedule
        │   ├── exams.js             # CRUD for exams
        │   ├── schedule.js          # CRUD for daily tasks
        │   ├── profile.js           # GET/PUT user profile, memory export
        │   ├── stats.js             # GET traces, GET progress, POST reset
        │   └── webhooks.js          # POST /api/webhooks/n8n (inbound tool execution)
        │
        ├── integrations/
        │   └── n8nBridge.js         # Outbound webhooks to n8n on key events
        │
        └── utils/
            ├── llmService.js        # Multi-provider LLM client with trace logging
            ├── memoryManagerV3.js    # Tiered memory: working/short/episodic/semantic/profile
            ├── memoryExtractor.js    # Extracts facts from conversations into memory
            ├── promptAssembler.js    # Builds system prompts with context injection
            ├── dataStore.js         # Low-level JSON file read/write
            ├── logger.js            # Structured logging with levels & file output
            ├── auth.js              # JWT-based device authentication middleware
            ├── inputSanitizer.js    # XSS/injection protection middleware
            ├── selfEvaluator.js     # LLM self-evaluation of response quality
            ├── confidenceScorer.js  # Response confidence scoring
            ├── stallDetector.js     # Detects repetitive/stalled conversations
            ├── progressLedger.js    # Tracks user progress over time
            └── toolExecutor.js      # Legacy shim (re-exports tools/registry)
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js 18+**
- **npm** or **yarn**
- At least one LLM provider configured (see below)

### 1. Clone & Install

```bash
git clone <repo-url> campus-mate
cd campus-mate

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 2. Configure Environment

```bash
cd server
cp .env.example .env    # Create from template (if available)
```

Edit `server/.env` with at least one LLM provider key (see [LLM Provider Setup](#-llm-provider-setup)).

### 3. Run (Development)

```bash
# Terminal 1 — Backend
cd server
npm run dev              # Starts with nodemon on port 5000

# Terminal 2 — Frontend
cd client
npm run dev              # Starts Vite dev server on port 5173
```

Or use the VS Code task **"Campus Mate: Start All"** to launch both in parallel.

### 4. Open

Navigate to **http://localhost:5173** in your browser.

---

## 🔑 LLM Provider Setup

Campus Mate uses a **multi-provider fallback chain**. Configure one or more:

| Priority | Provider | Model | Setup |
|----------|----------|-------|-------|
| 1 (fastest) | **Ollama** (local) | `qwen3:8b` | [Install Ollama](https://ollama.ai), run `ollama pull qwen3:8b` |
| 2 | **Google Gemini** | `gemini-2.5-flash` | Get key at [aistudio.google.com](https://aistudio.google.com) |
| 3 | **Bytez** | `Meta-Llama-3.1-8B-Instruct` | Get key at [bytez.com](https://bytez.com) |
| 4 | **HuggingFace** | `Llama-3.1-8B-Instruct` | Get token at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) |
| 5 (fallback) | **OpenRouter** | `llama-3.1-8b-instruct:free` | Get key at [openrouter.ai/keys](https://openrouter.ai/keys) — **free, no credit card** |

The system tries each provider in order and falls back to the next on failure.

---

## 📋 Environment Variables

```env
# ── Server ────────────────────────────────────────
PORT=5000
NODE_ENV=development
JWT_SECRET=your_jwt_secret

# ── LLM Providers (configure at least one) ───────
LLM_PROVIDER=ollama                        # Primary provider: ollama | gemini | bytez | huggingface | openrouter
OLLAMA_MODEL=qwen3:8b                      # Local Ollama model
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-2.5-flash
GEMINI_ROUTING_MODEL=gemini-2.5-flash-lite # Lighter model for classification/routing tasks
BYTEZ_API_KEY=your_bytez_key
HF_API_TOKEN=your_huggingface_token
OPENROUTER_API_KEY=your_openrouter_key

# ── Feature Flags (all default to true unless noted) ──
ENABLE_SELF_EVAL=true                      # LLM self-evaluation of responses
ENABLE_CONFIDENCE_SCORING=true             # Response confidence scoring
ENABLE_STALL_DETECTION=true                # Detect repetitive conversations
ENABLE_PROGRESS_LEDGER=true                # Track user progress
ENABLE_REPAIR_LOOP=false                   # Experimental: auto-repair bad responses (default: off)
ENABLE_HYBRID_RETRIEVAL=false              # Experimental: hybrid memory retrieval (default: off)
ENABLE_EVENT_BUS=true                      # Cross-cutting event emission
ENABLE_N8N_BRIDGE=false                    # n8n webhook integration (default: off)
ENABLE_LLM_TRACING=true                   # Log LLM provider/model/latency per call

# ── Response Pipeline ─────────────────────────────
STRIP_THINK_TAGS=true                      # Remove <think> tags from LLM output
MAX_RESPONSE_LENGTH=4000                   # Truncate responses beyond this length
INJECT_CITATIONS=false                     # Map [source:ID] tokens to links (default: off)

# ── Integrations ──────────────────────────────────
N8N_WEBHOOK_URL=                           # n8n webhook URL for outbound events
ALLOWED_ORIGINS=http://localhost:5173      # Comma-separated CORS origins
```

---

## 🔌 API Endpoints

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat` | Send a message → returns AI response with agent info, confidence, tools used |
| `GET` | `/api/chat/history` | Get conversation history for a user |
| `DELETE` | `/api/chat/history` | Clear conversation history |

**Chat Request:**
```json
{
  "message": "start a 25 minute pomodoro for math",
  "userId": "user123"
}
```

**Chat Response:**
```json
{
  "response": "Started a 25-minute Pomodoro session for Math! 🍅",
  "agentUsed": "tool_handler",
  "timestamp": "2026-03-07T12:00:00.000Z",
  "confidence": 0.95,
  "confidenceLevel": "high",
  "toolsUsed": ["startPomodoro"]
}
```

### Timetable
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/timetable` | Get all timetable entries |
| `POST` | `/api/timetable` | Add a class entry |
| `PUT` | `/api/timetable/:id` | Update a class entry |
| `DELETE` | `/api/timetable/:id` | Delete a class entry |

### Exams
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/exams` | Get all exams |
| `POST` | `/api/exams` | Add an exam |
| `PUT` | `/api/exams/:id` | Update an exam |
| `DELETE` | `/api/exams/:id` | Delete an exam |

### Schedule (Daily Tasks)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/schedule` | Get all tasks |
| `POST` | `/api/schedule` | Add a task |
| `PUT` | `/api/schedule/:id` | Update a task |
| `DELETE` | `/api/schedule/:id` | Delete a task |

### Profile & Memory
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/profile/:userId` | Get user profile |
| `PUT` | `/api/profile/:userId` | Update user profile |
| `GET` | `/api/memory/export` | Export full memory state |

### Stats & Tracing
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/stats/traces` | Get LLM call traces (provider, model, latency) |
| `GET` | `/api/stats/progress/:userId` | Get user progress snapshot |
| `POST` | `/api/stats/reset` | Reset stats for a user |

### Webhooks
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/webhooks/n8n` | Inbound webhook for external tool execution |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Server status, version, and listed endpoints |

---

## 🤖 AI Agents & Routing

### The Routing Pipeline

```
User Message
    │
    ▼
┌─────────────────┐
│   Classifier     │  4-layer intent detection
│  (classifier.js) │
│                  │
│  1. Greeting?    │──→ Quick greeting response
│  2. Rule-based   │──→ Keyword/pattern matching
│  3. LLM classify │──→ Gemini/Ollama classifies intent
│  4. Confidence   │──→ Falls back to academic if unsure
└────────┬────────┘
         │ {intent, confidence, reasoning}
         ▼
┌─────────────────┐
│  SessionManager  │  Maintains conversation continuity
│                  │  Tracks active agent per session
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  ToolHandler     │  Checks for direct tool triggers
│                  │  ("start pomodoro", "add deadline", etc.)
│                  │  If matched → executes via ToolService
└────────┬────────┘
         │ (if no tool match)
         ▼
┌─────────────────┐
│  AgentRouter     │  Routes to the right sub-agent
│ (CentralizedAgent)│  Injects memory + prompt context
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Sub-Agent       │  One of 6 specialists generates response
│                  │  via LLM with agent-specific system prompt
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  PostProcessor   │  Quality pipeline:
│                  │  1. Response normalization (strip <think>, truncate)
│                  │  2. Self-evaluation (LLM grades its own response)
│                  │  3. Confidence scoring
│                  │  4. Stall detection
│                  │  5. Progress ledger update
│                  │  6. Tool call parsing & execution
└────────┬────────┘
         │
         ▼
    Final Response
```

### Agent Details

| Agent | Triggers | What It Does |
|-------|----------|-------------|
| **Academic** | "explain", "what is", study questions | Explains concepts, helps with coursework, generates study material |
| **Emotional Support** | "stressed", "anxious", "feeling down" | Empathetic listening, coping strategies, motivation |
| **Cognitive Load** | "overwhelmed", "too many tasks", "can't focus" | Task prioritization, workload management, break suggestions |
| **Persona Switch** | "talk like a friend", "be my mentor" | Adapts tone: Friend (casual), Teacher (structured), Mentor (guiding) |
| **Failure Pattern** | "keep failing", "always get wrong" | Analyzes patterns, identifies root causes, suggests strategies |
| **Concept Gap** | "don't understand", "confused about" | Identifies prerequisite gaps, builds understanding step-by-step |

---

## 🔧 Tool System

The AI can autonomously invoke tools during conversations. Users can also trigger tools directly via natural language.

### Available Tools

| Tool | Functions | Trigger Examples |
|------|-----------|-----------------|
| **Pomodoro** | `startPomodoro`, `stopPomodoro`, `getPomodoroStatus`, `getPomodoroStats`, `skipBreak`, `completeCycle` | "start a 25 min pomodoro for math" |
| **Mood** | `logMood`, `getMoodHistory`, `getMoodStats` | "I'm feeling happy today" |
| **Deadlines** | `addDeadline`, `listDeadlines`, `completeDeadline`, `deleteDeadline`, `getUpcomingDeadlines` | "add deadline: math assignment due Friday" |
| **Notes** | `addNote`, `listNotes`, `searchNotes`, `deleteNote` | "save a note about photosynthesis" |
| **Reminders** | `addReminder`, `listReminders`, `completeReminder`, `deleteReminder` | "remind me to submit the report" |
| **Study Plans** | `createStudyPlan`, `listStudyPlans`, `updateStudyPlan`, `completeStudyPlan` | "create a study plan for physics" |
| **Quiz** | `generateQuiz`, `submitQuiz`, `reviewQuiz` | "quiz me on data structures" |
| **Search** | `searchWeb`, `searchWikipedia`, `searchYoutube` | "search YouTube for linear algebra tutorials" |

### Tool Execution Flow

```
User Message or LLM Output
    │
    ├──→ ToolHandler (pattern matching on user text)
    │        │
    │        ▼
    │    ToolService.executeTool({name, args, userId})
    │        │
    │        ├──→ tools/registry.js → execute tool function
    │        ├──→ EventBus.emit (e.g., "deadline.created")
    │        └──→ StatsRepository.addTrace (timing data)
    │
    └──→ ToolCallParser (parses [TOOL_CALL: name(args)] from LLM text)
             │
             ▼
         ToolService.executeTool(...)
```

---

## 🧠 Memory System

Campus Mate uses **MemoryManagerV3** — a 5-tier persistent memory architecture:

| Tier | Purpose | Retention |
|------|---------|-----------|
| **Working Memory** | Current conversation context | Session-scoped |
| **Short-Term Memory** | Recent interactions summary | Hours to days |
| **Episodic Memory** | Specific conversation episodes | Weeks |
| **Semantic Memory** | Extracted facts (name, subjects, goals) | Permanent |
| **Profile Memory** | User preferences, learning style | Permanent |

### Memory Features
- **Auto-extraction** — `memoryExtractor.js` pulls facts from conversations into semantic/profile memory
- **Context injection** — `promptAssembler.js` injects relevant memory into every LLM prompt
- **Debounced persistence** — Changes are batched and saved to `data/memory-v3.json` to minimize disk I/O
- **Graceful shutdown** — Memory is force-flushed on `SIGTERM`/`SIGINT`

### How Memory Enriches Responses

```
User: "Help me study"
    │
    ▼
PromptAssembler builds prompt with:
  - User's name (semantic memory)
  - Subjects they're studying (profile memory)
  - Recent conversation context (working memory)
  - Past study patterns (episodic memory)
    │
    ▼
LLM receives a personalized, context-rich prompt
```

---

## 🔄 Services Layer

### ConversationService (`services/conversationService.js`)
The single entry point for all chat interactions:
1. Delegates to `agentRouter.processRequest()` for AI processing
2. Persists messages to `chat-history.json`
3. Emits `chat.messageHandled` event via EventBus
4. Logs LLM trace data (provider, latency)
5. Returns a normalized response envelope

### ToolService (`services/toolService.js`)
Unified tool execution with cross-cutting concerns:
- Wraps `tools/registry.js` execute calls
- Emits domain events (e.g., `deadline.created`, `mood.recorded`, `pomodoro.started`)
- Records execution timing in `statsRepository`
- Single interface: `executeTool({name, args, userId})`

### ResponsePipeline (`services/responsePipeline.js`)
Post-LLM response processing:
- `normalizeResponse(text)` — strips `<think>` tags, enforces `MAX_RESPONSE_LENGTH` with sentence-boundary truncation, collapses whitespace
- `injectCitations(text, sourceMap)` — maps `[source:ID]` tokens to markdown links (future feature)

---

## 🗄️ Repository Layer

JSON-backed data access with the **Repository Pattern**:

### BaseRepository
- Generic CRUD: `getByUserId()`, `getById()`, `add()`, `update()`, `remove()`, `clear()`
- **Debounced saves** — writes are batched (1-second debounce) to prevent disk thrashing
- `listRecentlyUpdated()` — query records modified within a time window
- `forceSave()` — immediate flush for shutdown scenarios

### Domain Repositories

| Repository | File | Extra Methods |
|-----------|------|---------------|
| `NotesRepo` | `notesRepository.js` | `search(userId, query)`, `getByTag(userId, tag)` |
| `MoodRepo` | `moodRepository.js` | `getRecent(userId, n)`, `getByDateRange(userId, from, to)` |
| `DeadlineRepo` | `deadlineRepository.js` | `getActive(userId)`, `getUpcoming(userId, days)`, `getOverdue(userId)`, `markComplete(userId, id)` |
| `PomodoroRepo` | `pomodoroRepository.js` | Custom shape: `{sessions, currentSession, totalFocusTime, streak}` |
| `ReminderRepo` | `reminderRepository.js` | `getActive(userId)`, `getForDate(userId, date)` |
| `QuizRepo` | `quizRepository.js` | `getByTopic(userId, topic)`, `getRecent(userId, n)` |
| `StudyPlanRepo` | `studyPlanRepository.js` | `getActive(userId)`, `getBySubject(userId, subject)`, `getTodaysTasks(userId)` |
| `StatsRepo` | `statsRepository.js` | `addTrace(trace)`, `getTraces(filter)`, `saveSnapshot(userId, data)` |

---

## 📡 Event Bus & Integrations

### EventBus (`core/eventBus.js`)
A singleton Node.js `EventEmitter` for decoupled, cross-cutting event communication:
- Guarded by `ENABLE_EVENT_BUS` feature flag
- Events: `deadline.created`, `deadline.completed`, `mood.recorded`, `pomodoro.started`, `pomodoro.completed`, `note.created`, `chat.messageHandled`

### n8n Bridge (`integrations/n8nBridge.js`)
Connects Campus Mate to **n8n** (or any webhook-compatible automation platform):
- **Outbound**: Listens to EventBus events and POSTs to `N8N_WEBHOOK_URL`
- **Inbound**: `POST /api/webhooks/n8n` accepts `{type, tool, args, userId}` to execute tools externally
- Disabled by default — enable with `ENABLE_N8N_BRIDGE=true` and set `N8N_WEBHOOK_URL`

---

## ⚙️ Feature Flags

All flags are controlled via environment variables in `server/src/config/features.js`:

| Flag | Default | Purpose |
|------|---------|---------|
| `ENABLE_SELF_EVAL` | `true` | LLM self-evaluates response quality |
| `ENABLE_CONFIDENCE_SCORING` | `true` | Score confidence of each response |
| `ENABLE_STALL_DETECTION` | `true` | Detect & break out of repetitive loops |
| `ENABLE_PROGRESS_LEDGER` | `true` | Track learning progress over time |
| `ENABLE_REPAIR_LOOP` | `false` | Auto-repair low-quality responses |
| `ENABLE_HYBRID_RETRIEVAL` | `false` | Hybrid memory search (experimental) |
| `ENABLE_EVENT_BUS` | `true` | Enable cross-cutting event emission |
| `ENABLE_N8N_BRIDGE` | `false` | Enable n8n webhook integration |
| `ENABLE_LLM_TRACING` | `true` | Log provider/model/latency per LLM call |
| `STRIP_THINK_TAGS` | `true` | Remove `<think>` tags from responses |
| `MAX_RESPONSE_LENGTH` | `4000` | Max characters in a response |
| `INJECT_CITATIONS` | `false` | Map `[source:ID]` to links |

---

## 📱 Frontend Modules

All frontend routes are **lazy-loaded** for optimal performance:

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `LandingPage` | Public landing with feature highlights |
| `/app` | `Dashboard` | Overview of classes, tasks, exams |
| `/app/timetable` | `Timetable` | Weekly class schedule CRUD |
| `/app/exams` | `Exams` | Exam tracker with countdown |
| `/app/schedule` | `Schedule` | Daily task management with priorities |
| `/app/chat` | `Chat` | AI chat with voice input & agent info |
| `/app/pomodoro` | `Pomodoro` | Focus timer with session history |
| `/app/mood` | `MoodTracker` | Mood logging & trend visualization |
| `/app/deadlines` | `Deadlines` | Deadline management |
| `/app/notes` | `Notes` | Note-taking with tags & search |
| `/app/flashcards` | `Flashcards` | Study flashcards |
| `/app/habits` | `HabitTracker` | Daily habit streaks |
| `/app/grades` | `GradeCalculator` | GPA & grade computation |
| `/app/resources` | `ResourceLibrary` | Curated study materials |
| `/app/focus` | `FocusMode` | Distraction-free study mode |
| `/app/analytics` | `Analytics` | Study analytics & charts |
| `/app/stats` | `SystemStats` | LLM traces & system metrics |

---

## 🧪 Testing

### Smoke Test (Manual)

```bash
cd server
node -e "require('./src/agents/agentRouter'); console.log('All modules loaded OK')"
```

### Test the AI Chat

| Say This | Expected Agent |
|----------|---------------|
| "I'm feeling stressed about exams" | Emotional Support |
| "Explain what is machine learning" | Academic |
| "I have too many deadlines" | Cognitive Load |
| "Talk to me like a friend" | Persona Switch |
| "I keep failing at math" | Failure Pattern |
| "I don't understand recursion" | Concept Gap |

### Test Tool Triggers

| Say This | Expected Tool |
|----------|--------------|
| "Start a 25 minute pomodoro for math" | `startPomodoro` |
| "I'm feeling happy today" | `logMood` |
| "Add deadline: report due March 15" | `addDeadline` |
| "Save a note about photosynthesis" | `addNote` |
| "Quiz me on data structures" | `generateQuiz` |
| "Search YouTube for calculus tutorials" | `searchYoutube` |

### API Test (curl)

```bash
# Chat
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"start a 25 minute pomodoro for math","userId":"test"}'

# Stats traces
curl http://localhost:5000/api/stats/traces

# Health
curl http://localhost:5000/
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite 7, React Router 7, Axios, Lucide Icons, React Markdown |
| **Backend** | Node.js, Express 4, JWT (jsonwebtoken), express-rate-limit |
| **AI/LLM** | Ollama (local), Google Gemini, Bytez, HuggingFace Inference, OpenRouter |
| **Storage** | JSON files with debounced writes (upgradeable to MongoDB) |
| **Voice** | Web Speech API (browser-native) |
| **Testing** | Jest 30, Supertest 7 |
| **Dev Tools** | Nodemon, Vite HMR |

---

## 🎯 Future Enhancements

- [ ] MongoDB/PostgreSQL migration for repositories
- [ ] Placement preparation agent
- [ ] Spaced repetition algorithm for flashcards
- [ ] Calendar app export (Google Calendar, iCal)
- [ ] Mobile app (React Native)
- [ ] WebSocket for real-time chat streaming
- [ ] Plugin system for community tools
- [ ] Multi-language support
- [ ] Collaborative study rooms

---

## 📄 License

MIT License — feel free to use for your projects!

---

Built with ❤️ for students
