# Campus Mate Documentation
# Campus Mate Documentation

This folder is the main guide to the project. It explains what the app does, how the parts fit together, how to run it, and what must be true before production.

## Project Overview

Campus Mate is a student productivity platform with:
- a React frontend,
- an API gateway,
- several backend services,
- shared PostgreSQL and Redis infrastructure,
- and a chat system that routes requests to specialized behavior.

The browser should only need to talk to one public entry point. Everything else is internal.

## High-Level Architecture

Public entry points:
- Client UI on port 80
- API Gateway on port 3000
- Prometheus on port 9090

Internal services:
- Auth Service on port 3001
- Chat Service on port 3002
- Data Service on port 3003
- Analytics Service on port 3004
- Memory Service on port 3005
- Webhooks Service on port 3006

Shared infrastructure:
- PostgreSQL through `DATABASE_URL`
- Redis through `REDIS_URL`

## What The App Is Made Of

### Frontend

The frontend lives in `client/` and contains:
- Dashboard
- Chat
- Timetable
- Exams
- Schedule
- Notes
- Flashcards
- Habit Tracker
- Grade Calculator
- Resource Library
- Mood Tracker
- Pomodoro
- Focus Mode
- Analytics
- System Stats

### Backend

The backend is split so each service has one main responsibility:
- Auth: sessions and validation
- Chat: AI requests and agent routing
- Data: profile and student data CRUD
- Analytics: productivity metrics and trends
- Memory: working, short-term, episodic, semantic, and profile memory
- Webhooks: signed external events
- Gateway: routing, CORS, and rate limiting

## How A Request Moves

1. The browser sends a request to the gateway.
2. The gateway forwards it to the right service.
3. The service checks authorization and user scope.
4. The service reads or writes the database or cache.
5. The response returns to the browser.

For chat, the flow is similar but includes routing and memory:
1. The user sends a message.
2. The chat service stores it.
3. The system loads relevant memory and context.
4. The router chooses the right agent behavior.
5. The reply is generated and returned.

## What To Read First

If you are new to the project, read in this order:
1. [docs/architecture/0-architecture-overview.md](docs/architecture/0-architecture-overview.md)
2. [docs/architecture/1-request-lifecycle.md](docs/architecture/1-request-lifecycle.md)
3. [docs/architecture/2-agent-pipeline.md](docs/architecture/2-agent-pipeline.md)
4. [docs/architecture/3-services-and-data-flow.md](docs/architecture/3-services-and-data-flow.md)
5. [docs/architecture/4-memory-and-prompts.md](docs/architecture/4-memory-and-prompts.md)
6. [docs/architecture/5-issues-and-fixes.md](docs/architecture/5-issues-and-fixes.md)
7. [docs/SECURITY_OVERVIEW.md](docs/SECURITY_OVERVIEW.md)
8. [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)

## Security Docs

- [docs/SECURITY_OVERVIEW.md](docs/SECURITY_OVERVIEW.md): what can go wrong and how to reduce risk
- [docs/SECURITY_IMPLEMENTATION_CHECKLIST.md](docs/SECURITY_IMPLEMENTATION_CHECKLIST.md): what must be checked before release
- [docs/SECURITY_OPERATIONAL_RUNBOOK.md](docs/SECURITY_OPERATIONAL_RUNBOOK.md): what to do during incidents

## Production Readiness Baseline

Before production, confirm:
- every protected route uses verified identity,
- user data is always scoped to the authenticated user,
- direct userId access cannot expose another user’s data,
- profile updates are allowlisted,
- memory data is encrypted at rest,
- internal services require internal auth,
- logs do not expose secrets or message content.

## Security-Critical Environment Values

Required or security-sensitive values:
- `NODE_ENV`
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `INTERNAL_SERVICE_TOKEN`
- `DATA_ENCRYPTION_KEY`
- `WEBHOOK_SECRET`
- `ALLOWED_ORIGINS`

## Local Verification

Typical verification steps:
1. Validate the Docker Compose file.
2. Rebuild and start the stack.
3. Confirm containers stay healthy.
4. Run auth and API smoke checks.
5. Open the browser and confirm the UI looks correct.

## Notes

- Keep secrets out of the repository.
- Do not log tokens, API keys, cookies, or raw message content.
- Treat all user input as untrusted in prompts and routing.
- Use this file as the first stop for project orientation.

## Security Docs

- [docs/SECURITY_OVERVIEW.md](docs/SECURITY_OVERVIEW.md): what can go wrong and why
- [docs/SECURITY_IMPLEMENTATION_CHECKLIST.md](docs/SECURITY_IMPLEMENTATION_CHECKLIST.md): what must be true before release
- [docs/SECURITY_OPERATIONAL_RUNBOOK.md](docs/SECURITY_OPERATIONAL_RUNBOOK.md): what to do during a security incident

## Architecture Docs

- [docs/architecture/0-architecture-overview.md](docs/architecture/0-architecture-overview.md)
- [docs/architecture/1-request-lifecycle.md](docs/architecture/1-request-lifecycle.md)
- [docs/architecture/2-agent-pipeline.md](docs/architecture/2-agent-pipeline.md)
- [docs/architecture/3-services-and-data-flow.md](docs/architecture/3-services-and-data-flow.md)
- [docs/architecture/4-memory-and-prompts.md](docs/architecture/4-memory-and-prompts.md)
- [docs/architecture/5-issues-and-fixes.md](docs/architecture/5-issues-and-fixes.md)

## Production Baseline

Before deploying, make sure the following are in place:
- verified auth on protected routes,
- user-scoped data access,
- encrypted memory/profile persistence in production,
- internal service auth for internal endpoints,
- rate limits on public routes,
- restrictive logging,
- and secrets supplied only through environment variables or a secret manager.

## Runtime Environment Values

Required or security-critical values:
- `NODE_ENV`
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `INTERNAL_SERVICE_TOKEN`
- `DATA_ENCRYPTION_KEY`
- `WEBHOOK_SECRET`
- `ALLOWED_ORIGINS`

## Local Verification

Typical local verification steps:
1. Validate the Docker Compose config.
2. Rebuild the containers.
3. Check that the services start and stay healthy.
4. Run the smoke tests for auth, chat, profile, and history.
5. Confirm the browser UI loads correctly.

## Notes

- Keep credentials out of the repository.
- Do not log message content, access tokens, or API keys.
- Treat user messages as untrusted input in prompts and routing.
- Use this docs folder as the starting point for new contributors.
