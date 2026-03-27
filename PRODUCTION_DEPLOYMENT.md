# 🚀 Campus Mate - Production Deployment Guide

## ⚠️ CRITICAL CHECKLIST (Must do before deployment)

### 1. **Security & Secrets Management**

- [ ] **Generate strong JWT_SECRET** (Not the current placeholder)
  ```bash
  openssl rand -base64 32
  ```
  Set in: `.env` and `docker-compose.yml` (JWT_SECRET)

- [ ] **Generate strong WEBHOOK_SECRET**
  ```bash
  openssl rand -base64 32
  ```
  Set in: `.env` (WEBHOOK_SECRET)

- [ ] **Move API keys to secrets manager** (DO NOT commit to Git)
  - GEMINI_API_KEY
  - DATABASE_URL
  - REDIS_URL
  - SUPABASE_* keys
  - Use: AWS Secrets Manager, HashiCorp Vault, or your cloud provider's secrets service

- [ ] **Never commit `.env` to Git**
  - Ensure `.env` is in `.gitignore`
  - Use `.env.example` for configuration template only

- [ ] **Rotate credentials regularly**
  - Database passwords every 90 days
  - API keys every 90 days
  - JWT_SECRET yearly

### 2. **Environment Configuration**

- [ ] **Update ALLOWED_ORIGINS** in `.env`
  ```
  ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
  ```
  Remove localhost entries in production

- [ ] **Set NODE_ENV=production**
  ```
  NODE_ENV=production
  ```

- [ ] **Configure LOG_LEVEL**
  ```
  LOG_LEVEL=warn  # or 'info' if you need more visibility
  ```

- [ ] **Set up proper DATABASE_URL**
  - Verify pooler connection from cloud provider
  - Test connectivity before deployment
  - Ensure SSL mode is 'require'

- [ ] **Configure REDIS_URL**
  - Use production Redis instance (not localhost)
  - Set up Redis persistence/backups
  - Configure Redis password

### 3. **Database & Backend**

- [ ] **Run database migrations**
  ```bash
  npm run migrate  # or your migration command
  ```

- [ ] **Verify Supabase connectivity**
  ```bash
  npm run check-supabase
  ```

- [ ] **Test database connection pool**
  ```bash
  npm run check-db
  ```

- [ ] **Verify all microservices start correctly**
  ```bash
  docker compose --env-file .env up
  ```

### 4. **Frontend Configuration**

- [ ] **Build optimized frontend**
  ```bash
  cd client && npm run build
  ```

- [ ] **Update VITE_API_URL** (if using separate API domain)
  ```
  VITE_API_URL=https://api.yourdomain.com
  ```

- [ ] **Enable production source maps** (optional, for error tracking)

- [ ] **Test build locally**
  ```bash
  npm run preview
  ```

### 5. **Docker & Deployment**

- [ ] **Build Docker images with tags**
  ```bash
  docker compose -f docker-compose.yml build --force-rm
  docker tag campus-mate-gateway:latest youregistry/campus-mate-gateway:v1.0
  ```

- [ ] **Push to container registry**
  ```bash
  docker push youregistry/campus-mate-*:v1.0
  ```

- [ ] **Configure container resource limits**
  - Memory: 512MB-2GB per service
  - CPU: 0.5-2 cores per service
  - See `docker-compose.yml` deploy section

- [ ] **Set up health checks**
  - All services have `/health` endpoints
  - Configure liveness/readiness probes
  - See kubernetes manifest or Docker health checks

### 6. **Infrastructure & Networking**

- [ ] **Enable HTTPS/TLS**
  - Install SSL certificate (Let's Encrypt or commercial)
  - Configure nginx/reverse proxy for SSL termination
  - Redirect HTTP → HTTPS

- [ ] **Set up firewall rules**
  - Expose only ports 80, 443 (HTTP/HTTPS)
  - Block ports 3000-3006 (microservices, internal only)
  - Lock down Redis port (6379)
  - Restrict database port (5432)

- [ ] **Configure reverse proxy (nginx)**
  - SSL certificate setup
  - Gzip compression
  - Rate limiting
  - See `docker/nginx.conf`

- [ ] **Set up monitoring & logging**
  - Application monitoring: DataDog, New Relic, or Prometheus
  - Log aggregation: ELK Stack, Datadog, or Splunk
  - Error tracking: Sentry or Rollbar
  - Performance monitoring: New Relic APM

- [ ] **Enable backups**
  - Database backups: Daily automated snapshots
  - Redis backups: Persistence enabled
  - File storage: Versioning enabled

### 7. **Testing & Verification**

- [ ] **Smoke tests**
  ```bash
  npm run smoke-test
  ```
  Tests critical endpoints:
  - `/health`
  - `/api/auth/session`
  - `/api/chat`
  - `/api/profile`

- [ ] **Load testing** (if expecting traffic)
  - Use Apache JMeter or Locust
  - Test 1000+ concurrent users
  - Measure response times and error rates

- [ ] **Security scanning**
  - Run OWASP ZAP or similar
  - Check for SQL injection vulnerabilities
  - Verify authentication/authorization
  - Test file upload restrictions

- [ ] **End-to-end testing**
  - Test full user journey:
    1. Chat message → response
    2. Profile creation → fetch
    3. History persistence → retrieval
    4. Timetable CRUD operations

### 8. **Monitoring & Alerting**

- [ ] **Set up alerts for:**
  - Service crashes (restart count)
  - Database connection failures
  - Redis unavailability
  - API error rates (>5% 5xx errors)
  - Response time degradation (p95 > 2s)
  - Disk space < 10% free
  - Memory usage > 80%

- [ ] **Configure log aggregation**
  - Centralize logs from all services
  - Set retention: 30-90 days
  - Index for searchability

- [ ] **Enable distributed tracing**
  - Track requests across microservices
  - Use correlation IDs (x-request-id header)
  - Identify performance bottlenecks

### 9. **Documentation & Runbooks**

- [ ] **Create deployment runbook**
  - How to deploy new versions
  - Rollback procedures
  - Service restart procedure

- [ ] **Create incident response guide**
  - Database down? → remediation steps
  - Redis down? → fallback/recovery
  - Service hung? → debugging/restart
  - API rate limited? → check logs

- [ ] **Document runtime configuration**
  - All environment variables
  - Service dependencies
  - Port mappings
  - Database schema version

### 10. **Post-Deployment**

- [ ] **Verify all services are running**
  ```bash
  docker compose ps
  ```

- [ ] **Check service health**
  - Visit `/health` endpoint for each service
  - Verify database connectivity
  - Verify Redis connectivity

- [ ] **Monitor for errors**
  - Check logs for any startup errors
  - Monitor error rates for 24 hours
  - Watch for memory leaks

- [ ] **Performance monitoring**
  - Baseline response times
  - Check CPU/memory usage
  - Verify rate limits are working

---

## 🔒 Security Hardening Checklist

- [ ] JWT tokens use strong secret (>256 bits)
- [ ] CORS origins restricted to your domain(s)
- [ ] Helmet security headers enabled
- [ ] Input sanitization active (blocks injection attempts)
- [ ] Rate limiting enabled on all endpoints
- [ ] HTTPS enforced (redirect HTTP)
- [ ] Database credentials not in code
- [ ] API keys not in code
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
