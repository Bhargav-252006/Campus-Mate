# Campus Mate - Production Deployment Guide

This guide covers production readiness, safe deployment, and operational checks for Campus Mate.

## Table of Contents

1. [Readiness Checklist](#readiness-checklist)
2. [Hosting Strategy](#hosting-strategy)
3. [Environment Setup](#environment-setup)
4. [Docker Deployment](#docker-deployment)
5. [Verification](#verification)
6. [Monitoring and Backups](#monitoring-and-backups)
7. [Rollback Plan](#rollback-plan)
8. [Security Notes](#security-notes)

## Readiness Checklist

Before release, confirm:

- Authentication is required on protected routes.
- User data is scoped to the authenticated user.
- Memory and profile storage are encrypted in production.
- Internal service calls require service-to-service auth.
- Rate limiting is active on public routes.
- Logs do not expose tokens, API keys, cookies, or raw message bodies.
- Smoke tests pass against a real deployment.

## Hosting Strategy

Recommended path:

- Frontend: Netlify or Render static site.
- Backend services: Render for simplicity, or AWS if you need full control.
- Database: Supabase or Neon for early-stage hosting.
- Redis: Upstash for a free or low-cost cache layer.

Use AWS when you need:

- no-sleep production services,
- stronger network and IAM controls,
- predictable scaling,
- or compliance/enterprise requirements.

Use Render/Netlify when you want:

- lower operational overhead,
- faster launch,
- and a simpler deploy workflow.

## Environment Setup

Set these values in your production secret manager or environment:

```env
NODE_ENV=production
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
DATABASE_URL=postgresql://user:pass@host:5432/campus_mate
REDIS_URL=redis://:password@host:6379
JWT_SECRET=<strong-random-secret>
INTERNAL_SERVICE_TOKEN=<strong-random-secret>
DATA_ENCRYPTION_KEY=<strong-random-secret>
WEBHOOK_SECRET=<strong-random-secret>
LOG_LEVEL=warn
```

Keep `.env` out of git. Use a secrets manager in production.

## Docker Deployment

### Build

```bash
docker compose -f docker-compose.yml build --force-rm
```

### Start

```bash
docker compose --env-file .env -f docker-compose.yml up -d
```

### Check status

```bash
docker compose ps
```

### Health endpoints

Verify at least:

- Gateway `/health`
- Auth service `/health`
- Chat service `/health`
- Data service `/health`
- Memory service `/health`
- Analytics service `/health`
- Webhooks service `/health`

## Verification

Run after deployment:

1. Create or reuse a session.
2. Send a chat message.
3. Read chat history.
4. Open the dashboard.
5. Confirm timetable, exams, notes, and schedule still load.
6. Confirm the session stays alive while you remain active.

Suggested smoke commands:

```bash
npm run smoke-test
node server/scripts/check-db.js
node server/scripts/check-redis.js
```

## Monitoring and Backups

Minimum monitoring:

- service uptime,
- 5xx error rate,
- response latency,
- database errors,
- Redis connectivity,
- memory usage,
- and LLM cost/usage spikes.

Backups:

- database snapshots daily,
- Redis persistence or backup if used,
- and a tested restore path.

## Rollback Plan

If production is unstable:

1. Revert to the last known good image/tag.
2. Restore the previous environment file or secret version.
3. Re-run smoke checks.
4. Confirm chat, auth, and history all work.

## Security Notes

- Prefer short-lived credentials for external services.
- Rotate secrets on a schedule.
- Keep internal service ports private.
- Fail closed if required prod secrets are missing.
- Keep the session cookie active with the sliding auth refresh.
- [ ] CSP headers configured
- [ ] HTTPS-only cookies (if using cookies)
- [ ] Request timeouts configured
- [ ] Graceful shutdown implemented
- [ ] Error messages don't leak sensitive info (checked in prod logs)
- [ ] Database connections use SSL
- [ ] Redis connections secured (password required)

---

##Configuration Differences: Local vs. Production

| Setting | Local Dev | Production |
|---------|-----------|------------|
| NODE_ENV | development | production |
| LOG_LEVEL | debug | warn or info |
| JWT_SECRET | random per restart | strong secret (stored in vault) |
| ALLOWED_ORIGINS | localhost:* | yourdomain.com |
| Database | Local/Pooler test | Production Pooler |
| Redis | Local/test instance | Production cluster |
| HTTPS | No | Yes (enforce) |
| SSL Verify | false | true |
| Rate Limits | Loose | Strict |
| CORS | Allow all localhost | Specific domains only |

---

## 📋 Environment Variables Template

```bash
# Core
NODE_ENV=production
PORT=5000
LOG_LEVEL=warn

# Database (from Supabase - Session Pooler for backend)
DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres?sslmode=require

# Redis
REDIS_URL=redis://:PASSWORD@your-redis-host:6379/0

# Supabase
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Auth
JWT_SECRET=<generate new secret - min 32 chars>
JWT_EXPIRY=24h

# LLM
LLM_PROVIDER=gemini
LLM_MODEL=gemini-2.5-flash
GEMINI_MODEL=gemini-2.5-flash
GEMINI_ROUTING_MODEL=gemini-2.5-flash-lite
GEMINI_API_KEY=<your key from Google AI Studio>

# Security
WEBHOOK_SECRET=<generate new secret - min 32 chars>
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Features (optional tuning)
ENABLE_CONFIDENCE_SCORING=true
ENABLE_STALL_DETECTION=true
ENABLE_PROGRESS_LEDGER=true
ENABLE_LLM_TRACING=true
STRIP_THINK_TAGS=true
MAX_RESPONSE_LENGTH=4000
```

---

## 🚨 Common Production Issues & Solutions

### Issue: "Connection timeout to database"
- **Check**: DATABASE_URL format matches pooler (not direct host)
- **Check**: Network allows outbound to database host
- **Fix**: Wait 10-20s, connection timeout is now 10s (increased from 2s)

### Issue: "Redis connection refused"
- **Check**: REDIS_URL is accessible from deployment environment
- **Check**: Redis server is running
- **Fix**: Verify network connectivity, restart Redis

### Issue: "JWT token mismatch / Invalid token"
- **Check**: Same JWT_SECRET used by all services
- **Check**: Token expiry not too short
- **Fix**: Update JWT_EXPIRY if needed

### Issue: "CORS error in browser"
- **Check**: Frontend domain is in ALLOWED_ORIGINS
- **Check**: Request method (GET/POST) is in allowed methods
- **Fix**: Add domain to ALLOWED_ORIGINS and redeploy

### Issue: "Rate limit exceeded / 429 errors"
- **Check**: Not under attack
- **Check**: Load testing/benchmarks respecting limits
- **Fix**: Increase rate limits or implement user-specific limits

---

## ✅ Final Sign-Off

Before going live:

- [ ] All secrets are in vault/secrets manager
- [ ] `.env` file not committed to Git
- [ ] Backups configured and tested
- [ ] Monitoring/alerting configured
- [ ] Team trained on runbooks
- [ ] Incident response plan reviewed
- [ ] Load test completed successfully
- [ ] Security audit completed
- [ ] Smoke tests passing
- [ ] Manager approval obtained

---

**Last Updated**: March 27, 2026  
**Next Review**: Before each major release
