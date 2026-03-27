# Campus Mate - Microservices Deployment Guide

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Local Development](#local-development)
3. [Docker Deployment](#docker-deployment)
4. [Database Migration](#database-migration)
5. [Production Deployment](#production-deployment)
6. [Monitoring & Scaling](#monitoring--scaling)
7. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

Campus Mate is now organized as 7 independent microservices that communicate via REST APIs and Redis:

```
┌─────────────┐
│   Client    │ (React + Vite)
└──────┬──────┘
       │
┌──────▼──────────────────────────────────────┐
│         API Gateway (Port 3000)             │
│  - Request routing                          │
│  - Rate limiting                            │
│  - CORS handling                            │
└──────┬──────────────────────────────────────┘
       │
   ┌───┴─────────────────────────────────┐
   │                                       │
   ├─────────────────────────────────┐   │
   │                                 │   │
┌──▼───────────┐ ┌─────────────────┐▼──┬▼──────────────┐ ┌──────────────┐
│Auth Service  │ │ Chat Service    │ Data Service    │ │ Analytics   │
│(Port 3001)   │ │(Port 3002)      │(Port 3003)      │ │ Service     │
│- JWT tokens  │ │- LLM routing    │- CRUD operations│ │ (Port 3004) │
│- Sessions    │ │- Agent dispatch │- Timetable     │ │- Stats      │
└──────────────┘ │- Conversations │- Exams         │ │- Moods      │
                 │(NO Haiku!)      │- Schedule      │ │- Insights   │
                 │(NO 0.33x!)      │- Profile       │ └──────────────┘
                 └──────────────────┴────────────────┘

                 ┌─────────────────┐  ┌──────────────┐
                 │Memory Service   │  │ Webhooks    │
                 │(Port 3005)      │  │ Service     │
                 │- 5-tier memory  │  │ (Port 3006) │
                 │- Knowledge base │  │ - N8N       │
                 │- Profile data   │  │ - External  │
                 └─────────────────┘  │   events    │
                                       └──────────────┘

┌───────────────────────────────────────────────────────────┐
│              Shared Infrastructure                         │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐ │
│  │PostgreSQL   │  │   Redis     │  │  Message Queue   │ │
│  │ (Port 5432) │  │ (Port 6379) │  │   (Pub/Sub)      │ │
│  └─────────────┘  └─────────────┘  └──────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

### Service Responsibilities

| Service | Port | Purpose | Key Features |
|---------|------|---------|------|
| **Gateway** | 3000 | Entry point, routing | Rate limiting, CORS, proxy |
| **Auth** | 3001 | Authentication | JWT tokens, session management |
| **Chat** | 3002 | Conversations | LLM routing (Gemini-only), agents |
| **Data** | 3003 | CRUD operations | Timetable, exams, schedule, profile |
| **Analytics** | 3004 | Statistics & insights | Study metrics, mood tracking |
| **Memory** | 3005 | Multi-tier memory | Working, short-term, episodic, semantic |
| **Webhooks** | 3006 | External integrations | N8N, custom webhooks |

---

## Local Development

### Prerequisites
- Docker Desktop (Windows/Mac) or Docker (Linux)
- Docker Compose 2.0+
- Node.js 20+ (for local debugging)
- Git

### Quick Start

1. **Clone and setup**
   ```bash
   cd /path/to/campus-mate
   npm install
   npm run install:all
   ```

2. **Configure environment**
   ```bash
   cp .env.docker-compose .env.local
   # Edit .env.local with your Gemini API key
   ```

3. **Start all services**
   ```bash
   docker-compose -f docker-compose.yml up -d
   ```

4. **Wait for services to be healthy**
   ```bash
   docker-compose ps
   # All services should show "healthy"
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - API Gateway: http://localhost:3000
   - Individual services via inline port numbers

### Health Checks

```bash
# Check all services
curl http://localhost:3000/health    # Gateway
curl http://localhost:3001/health    # Auth
curl http://localhost:3002/health    # Chat
curl http://localhost:3003/health    # Data
curl http://localhost:3004/health    # Analytics
curl http://localhost:3005/health    # Memory
curl http://localhost:3006/health    # Webhooks

# Check database
docker exec campus-mate-db psql -U campusmate -d campus_mate -c "SELECT NOW();"

# Check Redis
docker exec campus-mate-cache redis-cli ping
```

### Local Development Workflow

**Terminal 1: Start services**
```bash
docker-compose up
```

**Terminal 2: Monitor logs**
```bash
docker-compose logs -f chat-service
docker-compose logs -f data-service
# etc.
```

**Terminal 3: Test API**
```bash
# Create session
curl -X POST http://localhost:3000/auth/session \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user-123"}'

# Send chat message
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -d '{"message":"Hello","userId":"test-user-123"}'
```

---

## Docker Deployment

### Building Images

```bash
# Build all services
docker-compose build

# Build single service
docker-compose build chat-service

# Build and tag for registry
docker build -t your-registry/campus-mate-chat:v1.0 -f docker/Dockerfile.chat .
```

### Running Services

**Development (with hot-reload)**
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

**Production (with healthchecks)**
```bash
docker-compose -f docker-compose.yml up -d
```

**Scaling services**
```bash
# Scale chat service to 3 instances (with load balancer needed)
docker-compose up -d --scale chat-service=3
```

---

## Database Migration

### From JSON to PostgreSQL

#### Step 1: Backup existing data
```bash
cp -r server/data server/data.backup
tar -czf campus-mate-data-backup.tar.gz server/data.backup/
```

#### Step 2: Start PostgreSQL
```bash
docker-compose up -d postgres redis
docker-compose exec postgres psql -U campusmate -d campus_mate -f /docker-entrypoint-initdb.d/01-schema.sql
```

#### Step 3: Write migration script

See `server/scripts/migrate-json-to-pg.js` for the migration script that:
- Reads all JSON files from `server/data/`
- Parses and validates data
- Inserts into PostgreSQL tables
- Logs any errors or duplicates

```bash
# Run migration
node server/scripts/migrate-json-to-pg.js

# Verify
docker-compose exec postgres psql -U campusmate -d campus_mate -c "SELECT COUNT(*) FROM student_profiles;"
```

#### Step 4: Verify all tables
```bash
docker-compose exec postgres psql -U campusmate -d campus_mate -c "\\dt"
```

---

## Production Deployment

### Option 1: AWS ECS (Recommended)

#### Prerequisites
- AWS Account with ECR, ECS, RDS, ElastiCache access
- AWS CLI configured
- Docker CLI with AWS credentials

#### Steps

1. **Create container images**
   ```bash
   # Push to ECR
   aws ecr get-login-password | docker login --username AWS --password-stdin your-account-id.dkr.ecr.us-east-1.amazonaws.com
   
   docker build -t campus-mate-chat -f docker/Dockerfile.chat .
   docker tag campus-mate-chat:latest your-account-id.dkr.ecr.us-east-1.amazonaws.com/campus-mate-chat:v1.0
   docker push your-account-id.dkr.ecr.us-east-1.amazonaws.com/campus-mate-chat:v1.0
   # Repeat for all services
   ```

2. **Create RDS PostgreSQL**
   ```bash
   aws rds create-db-instance \
     --db-instance-identifier campus-mate-db \
     --db-instance-class db.t3.micro \
     --engine postgres \
     --master-username campusmate \
     --master-user-password SecurePassword123! \
     --allocated-storage 100 \
     --region us-east-1
   ```

3. **Create ElastiCache Redis**
   ```bash
   aws elasticache create-cache-cluster \
     --cache-cluster-id campus-mate-redis \
     --cache-node-type cache.t3.micro \
     --engine redis \
     --num-cache-nodes 1
   ```

4. **Create ECS cluster & services**
   ```bash
   # See terraform/ directory for Infrastructure as Code
   terr aform apply
   ```

5. **Deploy with CloudFormation or Terraform**
   See `terraform/ecs.tf` in repository

### Option 2: DigitalOcean App Platform

1. Connect GitHub repo
2. Add services to `app.yaml`:
   ```yaml
   services:
     - name: api-gateway
       source:
         type: github
         repo: your-org/campus-mate
         branch: main
       build_command: docker build -f docker/Dockerfile.gateway .
       envs:
         - key: LLM_PROVIDER
                value: gemini
   # Add all 7 services
   ```

3. Deploy:
   ```bash
   doctl apps create --spec app.yaml
   ```

### Option 3: Google Cloud Run (Serverless)

```bash
# Deploy auth service
gcloud run deploy campus-mate-auth \
  --source . \
  --dockerfile docker/Dockerfile.auth \
  --platform managed \
  --region us-central1 \
  --set-env-vars "JWT_SECRET=${JWT_SECRET},REDIS_URL=redis://${REDIS_HOST}:6379"
# Repeat for all services
```

### Environment Variables for Production

Set via secrets manager (AWS Secrets Manager, Google Cloud Secret Manager, etc.):

```bash
# Database
DATABASE_URL=postgresql://user:pass@prod-db.example.com:5432/campus_mate

# Cache
REDIS_URL=redis://:password@prod-redis.example.com:6379

# LLM Configuration
LLM_PROVIDER=gemini
LLM_MODEL=gemini-2.5-flash
GEMINI_MODEL=gemini-2.5-flash
GEMINI_ROUTING_MODEL=gemini-2.5-flash-lite
GEMINI_API_KEY=AIza...

# Security
JWT_SECRET=<64-char-random-string>
N8N_WEBHOOK_SECRET=<webhook-secret>

# Monitoring
SENTRY_DSN=https://...@sentry.io/...
DATADOG_API_KEY=...

# CORS
ALLOWED_ORIGINS=https://campusmate.example.com,https://api.campusmate.example.com
```

---

## Monitoring & Scaling

### Health Monitoring

```yaml
# docker-compose.yml healthchecks (automatic)
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:PORT/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### Scaling Strategy

1. **Stateless services can scale horizontally**
   - API Gateway
   - Chat Service
   - Data Service
   - Analytics Service
   - Webhooks Service

2. **Stateful services need persistence**
   - Auth Service (uses Redis + DB)
   - Memory Service (uses DB)
   - PostgreSQL (read replicas)

3. **Load Balancing**
   - Use AWS ALB, GCP Load Balancer, or Nginx
   - Round-robin across service instances
   - Connection pooling for databases

### Monitoring Tools Integration

**Prometheus**
```bash
# Add to services for metrics export
docker-compose up prometheus grafana
```

**Sentry for error tracking**
```bash
# Set in production env
SENTRY_DSN=your-sentry-dsn
```

**DataDog**
```bash
docker run -d --name datadog-agent \
  -e DD_AGENT_HOST=localhost \
  datadog/agent:latest
```

---

## Troubleshooting

### Services won't start

```bash
# Check logs
docker-compose logs api-gateway
docker-compose logs chat-service

# Common issues:
# 1. Port conflicts - check if port 3000-3006 are available
# 2. Out of memory - increase Docker memory limit
# 3. Database not ready - wait for healthcheck
```

### Database connection errors

```bash
# Verify PostgreSQL is running
docker exec campus-mate-db pg_isready

# Check credentials
docker-compose exec postgres psql -U campusmate -d campus_mate -c "SELECT 1;"

# View logs
docker-compose logs postgres
```

### Redis connection issues

```bash
# Test Redis
docker exec campus-mate-cache redis-cli ping
# Should return "PONG"

# Check memory
docker exec campus-mate-cache redis-cli info memory
```

### API Gateway can't reach services

```bash
# Test service connectivity
docker exec campus-mate-gateway curl http://chat-service:3002/health

# Check network
docker network ls
docker network inspect campus-mate-network
```

### LLM rate limiting or provider errors

```bash
# Check Gemini API key
curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_GEMINI_KEY"

# Review LLM configuration
curl http://localhost:3002/config
```

### Memory leaks in long-running services

```bash
# Monitor memory usage
docker stats campus-mate-chat
docker stats campus-mate-data

# Check for hung connections
docker exec campus-mate-db psql -U campusmate -d campus_mate -c "SELECT count(*) FROM pg_stat_activity;"

# Restart service
docker-compose restart chat-service
```

---

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [Gemini API Docs](https://ai.google.dev/gemini-api/docs)
- [Express.js Guide](https://expressjs.com/)

## Support

For deployment issues:
1. Check the logs: `docker-compose logs`
2. Verify environment variables: `docker-compose config`
3. Test each service individually with curl
4. Check database migrations completed successfully

---

Last updated: March 2026

## Plain-English Summary

This guide is the practical path for getting the full stack running with containers and then moving that setup into a real production environment.

- Use Docker Compose when you want one command to start everything.
- Use the migration steps when you need to move data from JSON files into PostgreSQL.
- Use the production section when you are preparing a real deployment target.

## Recommended Read Order

1. Start with the architecture overview.
2. Read the production deployment checklist.
3. Follow this guide for Docker and migration steps.
4. Use the troubleshooting section when a container or service fails.

## Operational Notes

- Keep internal service ports private.
- Treat the gateway as the only public entry point.
- Verify health checks before calling a deployment complete.
- If a service needs a secret, fail closed rather than starting partially configured.
