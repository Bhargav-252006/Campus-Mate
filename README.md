# Campus Mate 🎓

A voice-enabled, multi-agent AI companion for students that remembers goals, subjects, moods, deadlines, and learning patterns.

Built with React 18 + Vite on the frontend and a Node.js + Express microservices backend, with a multi-LLM provider chain, tiered memory, specialized agents, and event-driven services.

It features the **Celestial Architect (Dim Mode)** UI/UX overhaul natively built into standard CSS, and robust prompt context memory routing for seamless interactions.

The current production architecture is microservices-first: API Gateway + isolated Auth, Chat, Data, Analytics, Memory, and Webhooks services.

## Table of Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Project Structure](#project-structure)
4. [Getting Started](#getting-started)
5. [LLM Provider Setup](#llm-provider-setup)
6. [Environment Variables](#environment-variables)
7. [API Endpoints](#api-endpoints)
8. [AI Agents and Routing](#ai-agents-and-routing)
9. [Tool System](#tool-system)
10. [Memory System](#memory-system)
11. [Services Layer](#services-layer)
12. [Repository Layer](#repository-layer)
13. [Event Bus and Integrations](#event-bus-and-integrations)
14. [Feature Flags](#feature-flags)
15. [Frontend Modules](#frontend-modules)
16. [Testing](#testing)
17. [Tech Stack](#tech-stack)
18. [Future Enhancements](#future-enhancements)

## Features

### Core AI Capabilities

- Multi-agent system with 6 specialized agents: Academic, Emotional Support, Cognitive Load, Persona Switch, Failure Pattern, and Concept Gap.
- 4-layer intent classification: greeting detection, rule-based matching, LLM classification, and confidence gating.
- 25+ built-in tools for Pomodoro, mood tracking, deadlines, notes, reminders, study plans, quizzes, and search.
- Persistent tiered memory: working, short-term, episodic, semantic, and profile memory.
- Multi-LLM provider chain: Ollama, Gemini, Bytez, HuggingFace, and OpenRouter with automatic fallback.

### Student Productivity

- Dashboard with class schedule, upcoming exams, and task overview.
- Timetable manager for weekly class schedule CRUD.
- Exam tracker with countdown timers.
- Daily schedule for task management and priorities.
- Pomodoro timer with streak tracking.
- Deadline manager for upcoming work.
- Notes system with tags and search.
- Flashcards for spaced-repetition study.
- Habit tracker for streaks and monitoring.
- Grade calculator for GPA and grade planning.
- Resource library for study materials.
- Focus mode for distraction-free work.
- Mood tracker for wellness logging and trends.
- Analytics dashboard for study patterns and progress.
- System stats for LLM traces, provider usage, and performance.

### Voice and UX

- Speech-to-text input via the Web Speech API.
- Text-to-speech responses.
- Dark and light theme with system preference detection.
- Keyboard shortcuts for power users.
- Toast notifications for feedback.
- Error boundaries for graceful failure handling.
- Lazy-loaded routes for fast initial page load.

## Architecture

Please review the full microservices topology, LLM orchestration flow, Docker ecosystem, and Database schema in the comprehensive [ARCHITECTURE.md](./ARCHITECTURE.md) flowcharts document.

```text
┌───────────────────────────────────────────────────────────────────┐
│                   FRONTEND (React 18 + Vite)                      │
│  "Celestial Architect" Dim Mode Aesthetic + Glassmorphism UI      │
│  Context: ThemeProvider │ ToastProvider │ KeyboardShortcuts       │
│  Services: api.js (Axios) │ VoiceInput (Web Speech API)          │
└──────────────────────────┬────────────────────────────────────────┘
                           │ REST API (JSON)
┌──────────────────────────┴────────────────────────────────────────┐
│                 API GATEWAY (Express + Node.js)                   │
│  /auth /chat /timetable /exams /schedule /profile /stats /memory │
└──────────────┬───────────────┬───────────────┬───────────────────┘
     │               │               │
   ┌──────▼──────┐ ┌──────▼──────┐ ┌─────▼────────┐
   │ Auth Service│ │ Chat Service│ │ Data Service │
   └──────┬──────┘ └──────┬──────┘ └─────┬────────┘
     │               │              │
   ┌──────▼────────┐ ┌────▼──────────┐ ┌─▼─────────────┐
   │ Memory Service│ │Analytics Svc  │ │Webhooks Svc   │
   └───────────────┘ └───────────────┘ └───────────────┘
```

Shared infrastructure:
- PostgreSQL for persistent artifacts (`init-db.sql`)
- Redis for caching / transient storage
- Docker Compose ecosystem running securely behind the AWS `api-network`

Legacy monolith files still exist for compatibility, but active deployment targets containerized microservices.

## Project Structure

```text
campus-mate/
├── client/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── index.css
│       ├── components/
│       ├── context/
│       └── services/
│           └── api.js
│
├── docker/
│   ├── Dockerfile.gateway
│   ├── Dockerfile.auth
│   ├── Dockerfile.chat
│   ├── Dockerfile.data
│   ├── Dockerfile.analytics
│   ├── Dockerfile.memory
│   ├── Dockerfile.webhooks
│   └── Dockerfile.client
├── docker-compose.yml
└── server/
    ├── package.json
    ├── data/
    ├── logs/
    └── src/
    ├── app.js                     # legacy monolith entry
        ├── config/
        ├── agents/
        ├── core/
        ├── services/
    ├── services-isolated/
    │   ├── auth-service/
    │   ├── chat-service/
    │   ├── data-service/
    │   ├── analytics-service/
    │   ├── memory-service/
    │   └── webhooks-service/
    ├── gateway/
    ├── shared/
        ├── repositories/
        ├── tools/
        ├── routes/
        ├── integrations/
        └── utils/
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- At least one LLM provider configured

### 1. Clone and install

```bash
git clone <repo-url> campus-mate
cd campus-mate

cd server
npm install

cd ../client
npm install
```

### 2. Configure environment

```bash
cd server
cp .env.example .env
```

Edit `server/.env` with at least one LLM provider key.

### 3. Run in development

Recommended (microservices):

```bash
npm run start:microservices
```

This launches the API gateway, isolated backend services, frontend container, and Prometheus with Docker Compose.

Legacy mode (single backend + Vite frontend):

```bash
# Backend (legacy monolith)
cd server
npm run dev

# Frontend
cd client
npm run dev
```

You can also use the VS Code task `Campus Mate: Start All` for the legacy dual-process mode.

### 4. Open the app

Open http://localhost:5173 in your browser.

For microservices Docker mode, frontend is served on http://localhost and API gateway health is at http://localhost:3000/health.

## LLM Provider Setup

Campus Mate uses a multi-provider fallback chain. Configure one or more:

| Priority | Provider | Model | Setup |
|---|---|---|---|
| 1 | Ollama | `qwen3:8b` | Install Ollama and pull the model locally |
| 2 | Google Gemini | `gemini-2.5-flash` | Create an API key in Google AI Studio |
| 3 | Bytez | `Meta-Llama-3.1-8B-Instruct` | Configure the Bytez API key |
| 4 | HuggingFace | `Llama-3.1-8B-Instruct` | Configure a HuggingFace token |
| 5 | OpenRouter | `llama-3.1-8b-instruct:free` | Configure the OpenRouter API key |

The system tries each provider in order and falls back to the next on failure.

## Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development
JWT_SECRET=your_jwt_secret

# LLM Providers
LLM_PROVIDER=ollama
OLLAMA_MODEL=qwen3:8b
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-2.5-flash
GEMINI_ROUTING_MODEL=gemini-2.5-flash-lite
BYTEZ_API_KEY=your_bytez_key
HF_API_TOKEN=your_huggingface_token
OPENROUTER_API_KEY=your_openrouter_key

# Feature Flags
ENABLE_SELF_EVAL=true
ENABLE_CONFIDENCE_SCORING=true
ENABLE_STALL_DETECTION=true
ENABLE_PROGRESS_LEDGER=true
ENABLE_REPAIR_LOOP=false
ENABLE_HYBRID_RETRIEVAL=false
ENABLE_EVENT_BUS=true
ENABLE_N8N_BRIDGE=false
ENABLE_LLM_TRACING=true

# Response Pipeline
STRIP_THINK_TAGS=true
MAX_RESPONSE_LENGTH=4000
INJECT_CITATIONS=false

# Integrations
N8N_WEBHOOK_URL=
ALLOWED_ORIGINS=http://localhost:5173
```

## API Endpoints

### Chat

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/chat` | Send a message and receive an AI response |
| GET | `/api/chat/history` | Get conversation history |
| DELETE | `/api/chat/history` | Clear conversation history |

### Timetable

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/timetable` | List class entries |
| POST | `/api/timetable` | Add a class entry |
| PUT | `/api/timetable/:id` | Update a class entry |
| DELETE | `/api/timetable/:id` | Delete a class entry |

### Exams

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/exams` | List exams |
| POST | `/api/exams` | Add an exam |
| PUT | `/api/exams/:id` | Update an exam |
| DELETE | `/api/exams/:id` | Delete an exam |

### Schedule

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/schedule` | List daily tasks |
| POST | `/api/schedule` | Add a task |
| PUT | `/api/schedule/:id` | Update a task |
| DELETE | `/api/schedule/:id` | Delete a task |

### Profile and Memory

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/profile/:userId` | Get user profile |
| PUT | `/api/profile/:userId` | Update user profile |
| GET | `/api/memory/export` | Export memory state |

### Stats and Tracing

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/stats/traces` | Get LLM trace data |
| GET | `/api/stats/progress/:userId` | Get user progress snapshot |
| POST | `/api/stats/reset` | Reset stats |

### Webhooks

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/webhooks/n8n` | Inbound webhook for external tool execution |

## AI Agents and Routing

### Routing pipeline

```text
User Message
  → Classifier (4-layer intent detection)
  → SessionManager (continuity)
  → ToolHandler (direct tool triggers)
  → AgentRouter (specialist selection)
  → Sub-Agent response generation
  → PostProcessor (normalize, score, detect stalls, parse tools)
  → Final Response
```

### Agent details

| Agent | Triggers | What it does |
|---|---|---|
| Academic | explain, what is, study questions | Coursework help and concept explanation |
| Emotional Support | stressed, anxious, feeling down | Empathetic listening and coping strategies |
| Cognitive Load | overwhelmed, too many tasks, can't focus | Prioritization and workload management |
| Persona Switch | talk like a friend, be my mentor | Tone adaptation |
| Failure Pattern | keep failing, always get wrong | Pattern analysis and improvement strategies |
| Concept Gap | don't understand, confused about | Prerequisite gap analysis |

## Tool System

| Tool | Functions | Trigger examples |
|---|---|---|
| Pomodoro | start/stop/status/stats | start a 25 minute pomodoro |
| Mood | log/history/stats | I'm feeling happy today |
| Deadlines | add/list/complete/delete/upcoming | add deadline for math assignment |
| Notes | add/list/search/delete | save a note about photosynthesis |
| Reminders | add/list/complete/delete | remind me to submit the report |
| Study Plans | create/list/update/complete | create a study plan for physics |
| Quiz | generate/submit/review | quiz me on data structures |
| Search | web/wikipedia/youtube | search YouTube for calculus tutorials |

## Memory System 🧠

Campus Mate utilizes a tiered Memory System to power AI interactions seamlessly without running out of context limits.

| Tier | Purpose | Retention | Mechanism |
|---|---|---|---|
| Working | Current context | Session-scoped | Active API Buffer Arrays |
| Short-term | Recent interactions | Hours to days | `chat_messages` Postgres storage |
| Episodic | Conversation episodes | Weeks | LLM semantic snapshots |
| Semantic | Extracted facts | Permanent | Redis / Data Layer mappings |
| Profile | Preferences and style | Permanent | Authentication hooks |

**Memory Amnesia Patched**: LLM endpoints specifically process memory cleanly using native role mappings (`role: 'system'` vs `'model'` vs `'user'`) instead of monolithic string duplication, preventing prompt injection overlap and ensuring references (like "what is it") are instantly understood.

## Services Layer

- ConversationService orchestrates chat requests and response envelopes.
- ToolService executes tools and emits events.
- ResponsePipeline normalizes output, strips `<think>` tags, and prepares final responses.

## Repository Layer

JSON-backed repositories provide a consistent data access pattern with debounced saves and helper methods for domain-specific queries.

## Event Bus and Integrations

- EventBus is a singleton EventEmitter for cross-cutting events.
- n8nBridge connects Campus Mate to n8n or any webhook-compatible automation platform.

## Feature Flags

| Flag | Default | Purpose |
|---|---|---|
| ENABLE_SELF_EVAL | true | LLM self-evaluation |
| ENABLE_CONFIDENCE_SCORING | true | Confidence scoring |
| ENABLE_STALL_DETECTION | true | Detect repetitive loops |
| ENABLE_PROGRESS_LEDGER | true | Track learning progress |
| ENABLE_REPAIR_LOOP | false | Experimental auto-repair |
| ENABLE_HYBRID_RETRIEVAL | false | Experimental hybrid retrieval |
| ENABLE_EVENT_BUS | true | Emit domain events |
| ENABLE_N8N_BRIDGE | false | Enable n8n integration |
| ENABLE_LLM_TRACING | true | Log provider/model/latency |
| STRIP_THINK_TAGS | true | Remove reasoning tags |
| MAX_RESPONSE_LENGTH | 4000 | Max response length |
| INJECT_CITATIONS | false | Citation mapping |

## Frontend Modules

| Route | Component | Description |
|---|---|---|
| / | LandingPage | Public landing page |
| /app | Dashboard | Overview of classes, tasks, exams |
| /app/timetable | Timetable | Class schedule CRUD |
| /app/exams | Exams | Exam tracking |
| /app/schedule | Schedule | Daily tasks |
| /app/chat | Chat | AI chat with voice input |
| /app/pomodoro | Pomodoro | Focus timer |
| /app/mood | MoodTracker | Mood logging and trends |
| /app/deadlines | Deadlines | Deadline management |
| /app/notes | Notes | Note-taking with tags and search |
| /app/flashcards | Flashcards | Study cards |
| /app/habits | HabitTracker | Daily habits |
| /app/grades | GradeCalculator | GPA computation |
| /app/resources | ResourceLibrary | Study materials |
| /app/focus | FocusMode | Distraction-free study mode |
| /app/analytics | Analytics | Study analytics |
| /app/stats | SystemStats | LLM traces and metrics |

## Testing

### Smoke test

```bash
cd server
node -e "require('./src/agents/agentRouter'); console.log('All modules loaded OK')"
```

### API test

```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"start a 25 minute pomodoro for math","userId":"test"}'
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 7, React Router 7, Axios, Lucide Icons, React Markdown |
| Backend | Node.js, Express 4, JWT, express-rate-limit |
| AI/LLM | Ollama, Google Gemini, Bytez, HuggingFace, OpenRouter |
| Storage | JSON files with debounced writes |
| Voice | Web Speech API |
| Testing | Jest, Supertest |
| Dev tools | Nodemon, Vite HMR |

## Future Enhancements

- Database migration for repositories.
- Spaced repetition for flashcards.
- Google Calendar and iCal export.
- Mobile app.
- WebSocket chat streaming.
- Plugin system for community tools.
- Multi-language support.
- Collaborative study rooms.

## License

MIT License.
