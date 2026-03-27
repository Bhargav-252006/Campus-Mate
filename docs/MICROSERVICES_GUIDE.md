# 🚀 Campus Mate Microservices Architecture - Starting Guide

## Overview

Campus Mate has been converted to a **microservices architecture** with:
- **8 isolated services** communicating via REST APIs and Redis pub/sub
- **PostgreSQL database** replacing JSON file storage
- **Docker containerization** for production deployment
- **API Gateway** handling routing and rate limiting
- **LLM orchestration** using Gemini-only provider

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     REACT CLIENT (5173)                      │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│              API GATEWAY (3000)                              │
│   - Request routing, rate limiting, auth forwarding         │
└──┬──┬──┬──┬──┬──┬──┬────────────────────────────────────────┘
   │  │  │  │  │  │  │
   ▼  ▼  ▼  ▼  ▼  ▼  ▼
   ┌──────┬──────┬──────┬──────┬──────┬──────┐
   │ Auth │ Chat │ Data │ Mem  │ Ana  │ Web  │
   │ 3001 │ 3002 │ 3003 │ 3005 │ 3004 │ 3006 │
   └──┬───┴──┬───┴──┬───┴──┬───┴──┬───┴──┬───┘
      │      │      │      │      │      │
      └──────┴──┬───┴──────┴──────┴──────┘
                │
    ┌───────────▼──────────────┐
    │  PostgreSQL (5432)       │
    │  Redis (6379)            │
    │  Shared Infrastructure   │
    └──────────────────────────┘
```

## Prerequisites

### Required Software
- **Node.js** 20+ (https://nodejs.org/)
- **Docker** & **Docker Compose** (https://www.docker.com/)
- **PostgreSQL** 15+ (or use Docker)
- **Redis** 7+ (or use Docker)

### Verify Installation
```bash
node --version      # Should be v20+
docker --version    # Docker version 24+
docker-compose --version  # Docker Compose 2.0+
```

## Quick Start (Local Development)

### Step 1: Install Dependencies

```bash
# Root directory
npm install

# Server
cd server && npm install

# Client
cd ../client && npm install
cd ..
```

### Step 2: Start Infrastructure (Docker)

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Wait for services to be ready (~10 seconds)
docker-compose logs postgres
```

### Step 3: Initialize Database

```bash
# Run migrations
docker exec campus-mate-postgres psql \
  -U campusmate \
  -d campus_mate \
  -f /docker-entrypoint-initdb.d/01-schema.sql

# Verify tables were created
docker exec campus-mate-postgres psql \
  -U campusmate \
  -d campus_mate \
  -c "\dt"
```

### Step 4: Configure Environment

```bash
# Copy environment template
cp .env.services .env.local

# Edit .env.local with your Gemini API key
# GEMINI_API_KEY=AIza...
```

### Step 5: Start All Microservices

#### Option A: Start individually in separate terminals

```bash
# Terminal 1: Auth Service
cd server/src/services-isolated/auth-service
PORT=3001 node index.js

# Terminal 2: Chat Service
cd server/src/services-isolated/chat-service
PORT=3002 node index.js

# Terminal 3: Data Service
cd server/src/services-isolated/data-service
PORT=3003 node index.js

# Terminal 4: Analytics Service
cd server/src/services-isolated/analytics-service
PORT=3004 node index.js

# Terminal 5: Memory Service
cd server/src/services-isolated/memory-service
PORT=3005 node index.js

# Terminal 6: Webhooks Service
cd server/src/services-isolated/webhooks-service
PORT=3006 node index.js

# Terminal 7: API Gateway
cd server/src/gateway
PORT=3000 node index.js

# Terminal 8: React Client
cd client
npm run dev
```

#### Option B: Run with PM2 (recommended)

```bash
# Install PM2
npm install -g pm2

# Start all services
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# View logs
pm2 logs
```

#### Option C: Docker Compose (Recommended for Production)

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f api-gateway
docker-compose logs -f chat-service
```

### Step 6: Verify Services

```bash
# Check all services are running
curl http://localhost:3000/health    # Gateway
curl http://localhost:3001/health    # Auth
curl http://localhost:3002/health    # Chat
curl http://localhost:3003/health    # Data
curl http://localhost:3004/health    # Analytics
curl http://localhost:3005/health    # Memory
curl http://localhost:3006/health    # Webhooks

# Open client
open http://localhost:5173
```

## Service Descriptions

### 1. **API Gateway** (Port 3000)
- Entry point for all requests
- Request routing to appropriate services
- Rate limiting (200/15min general, 15/min chat)
- CORS and security headers

**Routes:**
- `/auth/*` → Auth Service
- `/chat/*` → Chat Service
- `/timetable/*`, `/exams/*`, `/schedule/*`, `/profile/*` → Data Service
- `/stats/*` → Analytics Service
- `/memory/*` → Memory Service
- `/webhooks/*` → Webhooks Service

### 2. **Auth Service** (Port 3001)
- JWT token generation and validation
- Device-based session management
- Token revocation

**Endpoints:**
```
POST /auth/session            # Create session
POST /auth/validate           # Validate token
POST /auth/revoke            # Revoke token
```

### 3. **Chat Service** (Port 3002)
- LLM orchestration with Gemini API
- Conversation storage and retrieval
- User message processing

**Endpoints:**
```
POST /chat                    # Send message
GET  /chat/history/:convId    # Get conversation
GET  /chat/conversations      # List user's conversations
POST /chat/clear              # Clear conversation
GET  /chat/config             # Get service config
```

**LLM Provider:**
1. Gemini (Primary and only) - gemini-2.5-flash

### 4. **Data Service** (Port 3003)
- Student profile management
- Timetable CRUD
- Exam scheduling
- Task scheduling
- Notes management
- Deadline tracking
- User preferences

**Endpoints:**
```
# Timetable
GET    /timetable
POST   /timetable
PUT    /timetable/:id
DELETE /timetable/:id

# Exams
GET    /exams
POST   /exams
PUT    /exams/:id
DELETE /exams/:id

# Schedule
GET    /schedule
POST   /schedule
PUT    /schedule/:id
DELETE /schedule/:id

# Profile
GET    /profile
POST   /profile

# Notes
GET    /notes
POST   /notes

# Deadlines
GET    /deadlines
POST   /deadlines

# Preferences
GET    /preferences
POST   /preferences
```

### 5. **Analytics Service** (Port 3004)
- Study statistics
- Progress tracking
- Mood analytics
- Performance metrics

**Endpoints:**
```
GET  /stats                # Get user statistics
POST /stats/update         # Update study session
GET  /moods               # Get mood history
POST /moods               # Log mood
```

### 6. **Memory Service** (Port 3005)
- 5-tier memory management
- Working, short-term, episodic, semantic, profile memory

**Endpoints:**
```
GET  /memory/:tier        # Get memory by tier
POST /memory/:tier        # Store in memory tier
```

### 7. **Webhooks Service** (Port 3006)
- N8N webhook integration
- External event handling
- HMAC-SHA256 signature verification

**Endpoints:**
```
POST /webhooks/n8n        # Receive N8N webhook
```

### 8. **Infrastructure**
- **PostgreSQL** (Port 5432) - Data persistence
- **Redis** (Port 6379) - Caching and pub/sub

## Database Migration from JSON to PostgreSQL

### Automatic Migration

```bash
# Run migration script
cd server
node scripts/migrate-json-to-pg.js
```

### Manual Migration

If automatic migration fails, use the SQL schema directly:

```bash
# Via Docker
docker exec campus-mate-postgres psql -U campusmate -d campus_mate -f /path/to/init-db.sql

# Via local PostgreSQL
psql postgresql://campusmate:securepwd123@localhost:5432/campus_mate < server/scripts/init-db.sql
```

## Testing Services

### Test Auth Service
```bash
curl -X POST http://localhost:3001/auth/session \
  -H "Content-Type: application/json" \
  -d '{"userId": "user_123"}'
```

### Test Chat Service
```bash
curl -X POST http://localhost:3002/chat \
  -H "Content-Type: application/json" \
  -H "x-user-id: user_123" \
  -d '{"userId": "user_123", "message": "Hello, help me study", "conversationId": "conv_1"}'
```

### Test Data Service
```bash
curl -X GET http://localhost:3003/timetable \
  -H "x-user-id: user_123"
```

## Monitoring & Debugging

### View Logs

```bash
# Docker
docker-compose logs -f chat-service
docker-compose logs -f api-gateway

# PM2
pm2 logs chat-service
pm2 logs api-gateway

# Local terminal (if running directly)
# Check stdout/stderr in the running terminal
```

### Database Queries

```bash
# Connect to database
psql postgresql://campusmate:securepwd123@localhost:5432/campus_mate

# Common queries
SELECT * FROM chat_messages WHERE user_id = 'user_123';
SELECT * FROM student_profiles;
SELECT COUNT(*) FROM chat_messages;
SELECT * FROM llm_traces ORDER BY created_at DESC LIMIT 10;
```

### Redis

```bash
# Connect to Redis
redis-cli

# List keys
KEYS *

# Check cache hit rate
INFO stats

# Clear cache (use cautiously!)
FLUSHDB
```

## Production Deployment

### Docker Compose (Recommended)

```bash
# 1. Configure environment
cp .env.services .env
# Edit .env with production values

# 2. Build images
docker-compose build

# 3. Start services
docker-compose up -d

# 4. Verify
docker-compose ps
docker-compose exec postgres psql -U campusmate -d campus_mate -c "SELECT COUNT(*) FROM chat_messages;"

# 5. View logs
docker-compose logs -f
```

### Kubernetes (Advanced)

```bash
# Create namespace
kubectl create namespace campus-mate

# Deploy services
kubectl apply -f k8s/ -n campus-mate

# Monitor
kubectl get pods -n campus-mate
kubectl logs -f deployment/chat-service -n campus-mate
```

## Troubleshooting

### Service Won't Start

```bash
# Check if port is already in use
lsof -i :3002

# Kill process on port
kill -9 <PID>

# Or use different port
PORT=3002 node index.js
```

### Database Connection Failed

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check connection
docker-compose exec postgres psql -U campusmate -c "SELECT NOW();"

# View logs
docker-compose logs postgres
```

### LLM Service Returns Errors

```bash
# Check environment variables
echo $GEMINI_API_KEY

# Verify API keys are valid
curl "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY"
```

### Redis Connection Issues

```bash
# Check Redis is running
docker-compose ps redis

# Test Redis connection
redis-cli ping

# View Redis logs
docker-compose logs redis
```

## Key Constraints & Features

### ✅ Enforced Constraints
- **Gemini-only provider** for all LLM calls
- **JWT token-based** authentication (no passwords)
- **Automatic device provisioning** (first request creates session)

### ✅ Features
- Real-time chat with multi-LLM support
- 5-tier memory management
- Student profile & academic tracking
- Mood & emotional support tracking
- Pomodoro timer + study analytics
- Notes & deadline management
- N8N webhook integration
- Rate limiting & security headers
- Gemini-backed LLM responses
- Redis caching for performance

## Performance Tuning

### Database
```sql
-- Create indices for faster queries
CREATE INDEX ON chat_messages(user_id, timestamp);
CREATE INDEX ON memory_short_term(user_id, created_at);
CREATE INDEX ON schedule(user_id, due_date);
```

### Redis
```bash
# Monitor memory usage
redis-cli INFO memory

# Set max memory policy
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### API Gateway
```env
# Increase rate limits for trusted IPs
RATE_LIMIT_MAX=500
RATE_LIMIT_WINDOW=60000
```

## Next Steps

1. **Deploy to production** using Docker Compose
2. **Set up monitoring** (Prometheus, Grafana)
3. **Enable SSL/TLS** (Let's Encrypt + Nginx)
4. **Configure backups** (automated PostgreSQL backups)
5. **Set up CI/CD** (GitHub Actions)
6. **Monitor LLM costs** (track token usage)

## Support & Resources

- **Architecture Docs**: [docs/architecture/](architecture/)
- **API Documentation**: Check each service `/health` endpoint
- **Environment Variables**: See `.env.services`
- **Database Schema**: See `server/scripts/init-db.sql`

---

**Happy deploying! 🚀**

## Plain-English Summary

This document explains the runtime shape of the microservices version of the project.

- The gateway is the front door.
- Auth proves who the user is.
- Chat handles the AI conversation.
- Data stores student-facing records.
- Memory keeps conversation context.
- Analytics tracks usage and trends.
- Webhooks handle external events.

## What To Watch For

- If one service breaks, check whether the gateway or another service is depending on it.
- If data looks stale, check the owning service first.
- If the chat flow fails, confirm the auth and memory services are healthy too.

## Why This Guide Exists

Use this guide when you want a service-by-service explanation of the runtime layout without digging through code.
