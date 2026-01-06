# Student Mate AI 🎓

A **voice-enabled, multi-agent AI companion** for students that **REMEMBERS EVERYTHING** about you!

Built with React + Vite frontend and Node.js + Express backend with **OpenRouter (FREE)** or OpenAI integration.

## 🆓 FREE API Setup (OpenRouter)

**No credit card needed!** Get a free API key in 1 minute:

1. Go to [https://openrouter.ai/keys](https://openrouter.ai/keys)
2. Sign up with Google/GitHub (free)
3. Create a new API key
4. Add to `server/.env`:
   ```
   OPENROUTER_API_KEY=your_key_here
   ```

**Free models available:**
- `mistralai/mistral-7b-instruct:free` ← Default, great quality!
- `google/gemma-7b-it:free`
- `meta-llama/llama-3-8b-instruct:free`

## 🧠 Persistent Memory

Your Student Mate **never forgets**:
- ✅ Your name and preferences
- ✅ Subjects you're studying
- ✅ Your goals and aspirations
- ✅ Upcoming exams mentioned
- ✅ Conversation history
- ✅ Learning patterns

Memory survives server restarts, API key changes, and system reboots!

## ✨ Features

### 📱 Frontend Modules
- **Dashboard** - Overview of classes, exams, and tasks
- **Timetable** - Weekly class schedule management
- **Exams** - Exam tracking with countdown
- **Daily Schedule** - Task management with priorities
- **AI Chat** - Voice-enabled multi-agent assistant

### 🤖 AI Agents (Centralized Routing)
| Agent | Purpose |
|-------|---------|
| **Academic Agent** | Explains concepts, helps with study questions |
| **Emotional Support Agent** | Provides empathetic support, coping strategies |
| **Cognitive Load Agent** | Helps prioritize tasks, manage overwhelm |
| **Persona Switch Agent** | Adapts communication style (Friend/Teacher/Mentor) |
| **Failure Pattern Agent** | Identifies learning patterns, suggests improvements |
| **Concept Gap Agent** | Finds missing knowledge, fills understanding gaps |

### 🎤 Voice Features
- Speech-to-Text input (Web Speech API)
- Text-to-Speech responses
- Hands-free operation

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React + Vite)                  │
├─────────────────────────────────────────────────────────────┤
│  Dashboard │ Timetable │ Exams │ Schedule │ Chat            │
│                         │                                    │
│                    Voice Input                               │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API
┌────────────────────────┴────────────────────────────────────┐
│                     BACKEND (Express)                        │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐   │
│  │         CENTRALIZED AGENT + PERSISTENT MEMORY         │   │
│  │   Intent Detection → Agent Selection → Response       │   │
│  └───────────┬──────────────────────────────────────────┘   │
│              │                                               │
│  ┌───────────┴───────────────────────────────────────────┐  │
│  │              6 SPECIALIZED AI AGENTS                  │  │
│  │  Academic │ Emotional │ Cognitive │ Persona │ etc.    │  │
│  └───────────────────────┬───────────────────────────────┘  │
│                          │                                   │
│  ┌───────────────────────┴───────────────────────────────┐  │
│  │   Memory Manager │ LLM Service (OpenAI) │ Data Store  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 📂 Project Structure

```
student-mate/
├── client/                     # React Frontend
│   ├── src/
│   │   ├── components/         # Layout, VoiceInput
│   │   ├── pages/              # Dashboard, Timetable, Exams, Schedule, Chat
│   │   ├── services/           # API calls
│   │   └── App.jsx             # Router setup
│   └── package.json
│
└── server/                     # Express Backend
    ├── data/                   # JSON data storage
    ├── src/
    │   ├── agents/             # AI Agents
    │   │   ├── agentRouter.js
    │   │   ├── academicAgent.js
    │   │   ├── emotionalSupportAgent.js
    │   │   ├── cognitiveLoadAgent.js
    │   │   ├── personaSwitchAgent.js
    │   │   ├── failurePatternAgent.js
    │   │   └── conceptGapAgent.js
    │   ├── routes/             # API endpoints
    │   ├── utils/              # LLM service, memory, data store
    │   └── app.js              # Server entry
    ├── .env.example            # Environment template
    └── package.json
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- OpenAI API key (optional, has fallbacks)

### 1. Setup Backend

```bash
cd server
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY (optional)

npm start
```
Server runs on http://localhost:5000

### 2. Setup Frontend

```bash
cd client
npm install
npm run dev
```
Client runs on http://localhost:5173

## 🧪 Test the Agents

| Say This | Routes To |
|----------|-----------|
| "I'm feeling stressed about exams" | Emotional Support Agent |
| "Explain what is machine learning" | Academic Agent |
| "I have too many deadlines" | Cognitive Load Agent |
| "Talk to me like a friend" | Persona Switch Agent |
| "I keep failing at math" | Failure Pattern Agent |
| "I don't understand recursion" | Concept Gap Agent |

## 🔌 API Endpoints

### Chat
- `POST /api/chat` - Send message to AI
- `GET /api/chat/history` - Get chat history
- `DELETE /api/chat/history` - Clear history

### Timetable
- `GET /api/timetable` - Get all entries
- `POST /api/timetable` - Add entry
- `PUT /api/timetable/:id` - Update entry
- `DELETE /api/timetable/:id` - Delete entry

### Exams
- `GET /api/exams` - Get all exams
- `POST /api/exams` - Add exam
- `PUT /api/exams/:id` - Update exam
- `DELETE /api/exams/:id` - Delete exam

### Schedule
- `GET /api/schedule` - Get all tasks
- `POST /api/schedule` - Add task
- `PUT /api/schedule/:id` - Update task
- `DELETE /api/schedule/:id` - Delete task

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, React Router, Axios, Lucide Icons |
| Backend | Node.js, Express, OpenAI SDK |
| Storage | JSON files (upgradeable to MongoDB) |
| Voice | Web Speech API |

## 📋 Environment Variables

```env
PORT=5000
NODE_ENV=development
OPENAI_API_KEY=your_key_here  # Optional
OPENAI_MODEL=gpt-3.5-turbo
```

## 🎯 Future Enhancements

- [ ] User authentication
- [ ] MongoDB integration
- [ ] Placement preparation agent
- [ ] Study analytics dashboard
- [ ] Mobile app (React Native)
- [ ] Export data to calendar apps

## 📄 License

MIT License - feel free to use for your projects!

---

Built with ❤️ for students
