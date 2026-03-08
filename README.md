# Campus Mate

An AI-powered student productivity app — React + Vite frontend, Express backend, multi-agent chat with native function calling.

## Tech Stack

| Layer | Stack |
|-------|-------|
| Frontend | React 18, Vite 7, React Router v7, Lucide React, React Markdown, Axios |
| Backend | Node.js, Express 4, OpenAI SDK, JWT (jsonwebtoken) |
| AI Providers | Ollama (local, default) → Gemini → DeepSeek → Bytez → HuggingFace → OpenRouter |
| Persistence | JSON file stores under `server/data/` |

## Features

- **AI Chat** — multi-agent system with tool calling, persistent memory, voice input, and markdown rendering
- **Dashboard** — at-a-glance overview of upcoming deadlines, tasks, and mood
- **Timetable / Schedule / Deadlines / Exams** — full academic planning suite
- **Pomodoro / Focus Mode** — timed study sessions with stats tracking
- **Notes / Flashcards / Resource Library** — knowledge management
- **Mood Tracker / Habit Tracker** — daily wellbeing logging
- **Grade Calculator / Analytics / System Stats** — performance insights
- **Dark / Light Theme** — system-aware with manual toggle
- **Keyboard Shortcuts** — global navigation shortcuts via `KeyboardProvider`
- **Toast Notifications** — contextual feedback across the app

## Architecture

```
client/src/
  components/   → 17 page components (lazy-loaded, code-split)
  context/      → ThemeContext, ToastContext, KeyboardShortcuts
  services/     → Axios API client (api.js)

server/src/
  agents/       → CentralizedAgent → Classifier → Router → 6 specialist agents
  tools/        → 27 tools with OpenAI-format schemas (registry.js)
  services/     → ConversationService, ResponsePipeline, ToolService
  repositories/ → JSON-backed data access layer
  routes/       → chat, timetable, exams, schedule, profile, stats, webhooks
  utils/        → LLM service, memoryManagerV3, promptAssembler, auth,
                  confidenceScorer, selfEvaluator, stallDetector, progressLedger,
                  inputSanitizer, logger
  integrations/ → n8nBridge (webhook automation)
  config/       → feature flags
```

### Multi-Agent Pipeline

```
User message
  └─► CentralizedAgent.processRequest()
        ├─ memoryManagerV3  (profile, summary, recent messages, patterns, context)
        ├─ detectToolTrigger (keyword / regex shortcut)
        └─ Classifier (Layers 0–4, confidence threshold 0.6)
              └─► Agent Router → one of:
                    Academic Agent
                    Emotional Support Agent
                    Cognitive Load Agent
                    Concept Gap Agent
                    Failure Pattern Agent
                    Persona Switch Agent
                    └─► PostProcessor (self-eval, confidence, stall detection, tools)
```

### Tools (27)

| Category | Tools |
|----------|-------|
| Pomodoro | `startPomodoro`, `endPomodoro`, `getPomodoroStats` |
| Mood | `logMood`, `getMoodHistory`, `getMoodTrends` |
| Deadlines | `addDeadline`, `getDeadlines`, `getUpcomingDeadlines`, `markDeadlineComplete` |
| Reminders | `setReminder`, `getReminders`, `deleteReminder` |
| Notes | `saveNote`, `getNotes`, `searchNotes`, `deleteNote` |
| Study Plans | `createStudyPlan`, `getStudyPlan`, `getTodaysTasks`, `markTaskComplete` |
| Quiz | `generateQuiz`, `getQuizzes`, `saveQuizResult` |
| Search | `webSearch`, `wikipediaSummary`, `youtubeSearch` |

Tool execution order: native function calling (Gemini) → keyword triggers → regex fallback.

### LLM Provider Priority

| Priority | Provider | Default Model |
|----------|----------|---------------|
| 1 (default) | Ollama (local) | `qwen3:8b` |
| 2 | Gemini | `gemini-2.5-flash` / `gemini-2.5-flash-lite` (routing) |
| 3 | DeepSeek | `deepseek-chat` / `deepseek-reasoner` (heavy) |
| 4 | Bytez | `meta-llama/Meta-Llama-3.1-8B-Instruct` |
| 5 | HuggingFace | `meta-llama/Llama-3.1-8B-Instruct` |
| 6 | OpenRouter | `meta-llama/llama-3.1-8b-instruct:free` |

Set `LLM_PROVIDER` in `.env` to switch providers.

## Security

- **JWT auth** — device-based sessions (no login required); each browser gets a unique `userId`
- **Rate limiting** — 200 req / 15 min (general), 15 msg / 1 min (chat endpoint)
- **Input sanitization** — `sanitizeMiddleware` on all routes
- **CORS** — configurable via `ALLOWED_ORIGINS` env variable
- **JWT_SECRET** — must be changed from the default before any deployment

## Setup

### Quick start (from repo root)

```bash
npm install          # installs concurrently
npm start            # starts both server (port 5000) and client (port 5173)
```

### Manual start

```bash
# Terminal 1 — backend
cd server && npm install && npm run dev

# Terminal 2 — frontend
cd client && npm install && npm run dev
```

Or use the VS Code task **Campus Mate: Start All** to launch both in parallel.

### Ports

| Service | URL |
|---------|-----|
| Backend API | http://localhost:5000 |
| Frontend (dev) | http://localhost:5173 |

## Environment Variables

Create `server/.env`:

```env
# Provider selection (ollama | gemini | deepseek | bytez | huggingface | openrouter)
LLM_PROVIDER=ollama

# Ollama (local)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:8b

# Gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
GEMINI_ROUTING_MODEL=gemini-2.5-flash-lite

# DeepSeek
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_HEAVY_MODEL=deepseek-reasoner

# Cloud fallbacks
BYTEZ_API_KEY=
OPENROUTER_API_KEY=
HUGGINGFACE_API_KEY=

# Auth
JWT_SECRET=change-me-before-deploying
JWT_EXPIRY=7d

# CORS (comma-separated, optional)
ALLOWED_ORIGINS=http://localhost:5173
```

## API Reference

### Auth

```
POST /api/auth/session          — create a session, returns { token, userId }
```

All other endpoints require `Authorization: Bearer <token>`.

### Chat

```
POST   /api/chat                — send message { message, userId? }
GET    /api/chat/history        — get conversation history
DELETE /api/chat/history        — clear history
```

### Data Routes

```
/api/timetable    — CRUD for weekly timetable
/api/exams        — exam schedule management
/api/schedule     — daily/weekly schedule  
/api/profile      — student profile + preferences
/api/stats        — usage and activity stats
/api/webhooks     — n8n automation webhooks
```

## Data Storage

All data is persisted as JSON files under `server/data/`:

| File | Contents |
|------|----------|
| `chat-history.json` | Per-user conversation logs |
| `memory-v3.json` | Long-term user memory (profile, goals, patterns) |
| `moods.json` | Mood log entries |
| `pomodoro.json` | Pomodoro session records |
| `schedule.json` | Schedule entries |
| `timetable.json` | Weekly timetable |
| `preferences.json` | Per-user preferences |
| `stats.json` | Activity statistics |

## Project Structure

```
campus-mate/
├── package.json          # root launcher (concurrently)
├── client/               # React + Vite frontend
│   └── src/
│       ├── components/   # 17 page components
│       ├── context/      # Theme, Toast, Keyboard
│       └── services/     # API client
└── server/               # Express backend
    └── src/
        ├── agents/       # Multi-agent orchestration
        ├── tools/        # 27 callable tools
        ├── services/     # Pipeline services
        ├── repositories/ # Data access layer
        ├── routes/       # Express route handlers
        ├── utils/        # LLM, memory, auth, logging
        └── integrations/ # n8n webhook bridge
```

This README reflects the current implementation in the workspace rather than the earlier architecture description. If you add or remove tools, change provider routing, or alter chat behavior again, update this file at the end so it stays aligned with the shipped code.
