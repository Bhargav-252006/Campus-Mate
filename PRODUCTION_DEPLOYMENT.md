# Campus Mate — Production Deployment Guide

> **Target:** AWS EC2 t3.micro (~$0.013/hr, 2 vCPU, 1 GB RAM) | **Stack:** Docker Compose microservices | **Last Updated:** 2026-04-06

---

## Table of Contents

1. [Readiness Checklist](#readiness-checklist)
2. [Architecture Overview](#architecture-overview)
3. [Memory Budget (t3.micro)](#memory-budget-t3micro)
4. [Environment Setup](#environment-setup)
5. [AWS Deployment — Step by Step](#aws-deployment--step-by-step)
6. [Verification](#verification)
7. [Monitoring and Backups](#monitoring-and-backups)
8. [Rollback Plan](#rollback-plan)
9. [Security Notes](#security-notes)
10. [Common Issues & Solutions](#common-issues--solutions)
11. [Configuration: Local vs Production](#configuration-local-vs-production)
12. [Final Sign-Off](#final-sign-off)

---

## Readiness Checklist

Before running `docker compose up` on EC2, confirm all boxes are ticked:

### Secrets (root `.env`)
- [x] `JWT_SECRET` — generated (128-char cryptographic hex) ✅
- [x] `WEBHOOK_SECRET` — generated (64-char cryptographic hex) ✅
- [x] `DATA_ENCRYPTION_KEY` — generated (64-char cryptographic hex) ✅
- [ ] `GEMINI_API_KEY` — **paste your real key from https://aistudio.google.com/app/apikey**
- [ ] `ALLOWED_ORIGINS` — **update with your EC2 Elastic IP after launch**
- [ ] Rotate your Supabase DB password (it was in plain text locally)
- [ ] Rotate your Redis Cloud password (it was in plain text locally)

### Security
- [x] `.env` is in `.gitignore` ✅
- [x] `.env` was never committed to git ✅ (confirmed via `git log`)
- [x] Prometheus port NOT exposed publicly ✅
- [x] All internal services have no public ports ✅
- [x] HMAC webhook signature verification ✅
- [x] `helmet` middleware active ✅
- [x] Rate limiting active on API gateway ✅
- [ ] HTTPS configured (post-deploy, Step 11)

### Code
- [x] LLM provider unified: Gemini everywhere ✅ (Groq removed)
- [x] `@supabase/supabase-js` upgraded to v2.101.1 ✅
- [x] `npm audit` — 0 vulnerabilities ✅
- [x] Memory limits set on all containers ✅
- [x] `depends_on: condition: service_healthy` on all services ✅
- [x] `vite.config.js` dev proxy points to port 3000 (gateway) ✅

---

## Architecture Overview

```
Internet
   │
   ▼
EC2 t3.micro (Ubuntu 24.04, 2 vCPU, 1 GB RAM + 2 GB swap)
│
├── Port 80  → campus-mate-client (nginx, serves React build)
├── Port 3000 → campus-mate-gateway (api-gateway, remove after HTTPS)
│
├─ Docker Compose (8 containers):
│   ├── client          — nginx, React SPA           :80
│   ├── api-gateway     — request router, auth check  :3000
│   ├── auth-service    — login/register/JWT          :3001 (internal)
│   ├── chat-service    — Gemini LLM orchestration    :3002 (internal)
│   ├── data-service    — timetable, notes, exams     :3003 (internal)
│   ├── analytics-service — usage tracking            :3004 (internal)
│   ├── memory-service  — encrypted user memory       :3005 (internal)
│   └── webhooks-service — external event triggers    :3006 (internal)
│
├── External: Supabase PostgreSQL (your DB)
├── External: Redis Cloud (your cache/pubsub)
└── External: Google Gemini API (LLM)
```

Startup order (enforced by `depends_on: condition: service_healthy`):
```
auth + chat + data + analytics + memory + webhooks (all healthy)
  → api-gateway starts
      → client (nginx) starts
```

---

## Memory Budget (t3.micro)

t3.micro has **1024 MB RAM** and **2 vCPUs**. With 2 GB swap, burst headroom is available.

| Component | RAM Used |
|-----------|---------|
| Ubuntu OS | ~200 MB |
| Docker daemon | ~50 MB |
| **Available for containers** | **~750 MB** |

| Container | Hard Limit | Node.js Heap Cap | Purpose |
|-----------|-----------|-----------------|---------|
| api-gateway | 96 MB | 80 MB | Request routing |
| auth-service | 96 MB | 80 MB | JWT + login |
| **chat-service** | **160 MB** | 140 MB | LLM calls (needs most) |
| data-service | 80 MB | 64 MB | DB queries |
| analytics-service | 64 MB | 50 MB | Metrics |
| memory-service | 80 MB | 64 MB | Encrypted storage |
| webhooks-service | 64 MB | 50 MB | Event handling |
| client (nginx) | 32 MB | — | Static file serving |
| **Total** | **672 MB** | | ✅ fits in 750 MB |

> **Note:** Prometheus was removed from `docker-compose.yml` to save ~150 MB RAM. Re-add it if you upgrade to t3.small or larger.

> [!IMPORTANT]
> **t3.micro is NOT free-tier eligible.** Free tier only covers `t2.micro` (750 hrs/month for 12 months). t3.micro costs ~$0.013/hr (~$9.50/month). If you need $0 cost, switch back to t2.micro — the deployment steps are identical.

---

## Environment Setup

### Generate Secrets (run in PowerShell locally or on EC2)

```powershell
# JWT_SECRET — 64 random bytes
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# WEBHOOK_SECRET — 32 random bytes
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# DATA_ENCRYPTION_KEY — 32 random bytes
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Root `.env` Template (used by Docker Compose)

```env
NODE_ENV=production
LOG_LEVEL=warn

# Database — Supabase Session Pooler (rotate password before using!)
DATABASE_URL=postgresql://postgres.YOUR_PROJECT_REF:YOUR_NEW_DB_PASSWORD@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require

# Redis Cloud (rotate password before using!)
REDIS_URL=redis://default:YOUR_NEW_REDIS_PASSWORD@redis-XXXXX.ec2.cloud.redislabs.com:XXXXX

# Secrets (generate fresh — never reuse dev values)
JWT_SECRET=<64-char-hex>
WEBHOOK_SECRET=<32-char-hex>
DATA_ENCRYPTION_KEY=<32-char-hex>

# LLM — Gemini
LLM_PROVIDER=gemini
LLM_MODEL=gemini-1.5-flash
GEMINI_MODEL=gemini-1.5-flash
GEMINI_API_KEY=<your key from https://aistudio.google.com/app/apikey>

# CORS — update with EC2 Elastic IP and/or your domain
ALLOWED_ORIGINS=http://YOUR_EC2_ELASTIC_IP,https://yourdomain.com

# Auth
JWT_EXPIRY=24h
```

> **Keep `.env` out of git.** It is already in `.gitignore`. Never commit it.

### Configuration: Local vs Production

| Setting | Local Dev | Production (EC2) |
|---------|-----------|-----------------|
| `NODE_ENV` | development | production |
| `LOG_LEVEL` | debug | warn |
| `JWT_SECRET` | weak placeholder | 128-char cryptographic hex |
| `ALLOWED_ORIGINS` | localhost:3000, :5173 | your EC2 IP / domain |
| Database | Direct Supabase URL | Session Pooler URL |
| Redis | Local or cloud | Redis Cloud |
| HTTPS | No | Yes (Step 11) |
| Prometheus | Optional | Removed (saves RAM) |
| LLM Provider | gemini | gemini |

---

## AWS Deployment — Step by Step

### Step 1 — Create AWS Account

1. Go to **https://aws.amazon.com** → **Create an AWS Account**
2. Enter email, password, account name
3. Add credit card (t2.micro stays free for 12 months — 750 hours/month)
4. Select **Basic support (Free)**
5. Verify phone number

---

### Step 2 — Create IAM User (Never Use Root)

1. AWS Console → search **IAM** → **Users** → **Create user**
2. Username: `campus-mate-deploy`
3. **Next** → **Attach policies directly** → check `AmazonEC2FullAccess`
4. **Create user** → click the user → **Security credentials** → **Create access key**
5. Choose **Command Line Interface (CLI)** → **Download CSV**

---

### Step 3 — Launch t3.micro EC2 Instance

#### Set Region
Top-right of AWS Console → **Asia Pacific (Mumbai) — ap-south-1**

#### Launch Instance
EC2 → **Instances** → **Launch instances**

| Setting | Value |
|---------|-------|
| Name | `campus-mate-server` |
| AMI | **Ubuntu Server 24.04 LTS** — must say "Free tier eligible" |
| Instance type | **t3.micro** ← 2 vCPU, 1 GB RAM (~$0.013/hr) |
| Key pair | **Create new** → `campus-mate-key` → RSA → `.pem` → Download |
| Storage | **20 GB gp2** (free tier gives 30 GB) |

#### Security Group — Inbound Rules

> [!IMPORTANT]
> **Do NOT type `0.0.0.0/0` manually.** Use the **"Source type" dropdown** in each rule row:
> - Select **`Anywhere-IPv4`** → AWS auto-fills `0.0.0.0/0` correctly
> - Select **`My IP`** → AWS auto-fills your current IP
> Typing it manually can trigger a "CIDR malformed" error from the AWS Launch wizard.

Add **one rule per row** using the **Add security group rule** button:

| Rule | Type | Port | Source type (dropdown) | Purpose |
|------|------|------|----------------------|---------|
| 1 | SSH | 22 | **My IP** | Your access only |
| 2 | HTTP | 80 | **Anywhere-IPv4** | Web traffic |
| 3 | HTTPS | 443 | **Anywhere-IPv4** | HTTPS (for later) |
| 4 | Custom TCP | 3000 | **Anywhere-IPv4** | API gateway test |

> **Do NOT open port 9090** — Prometheus is internal only.

Click **Launch instance**.

#### Allocate Elastic IP (Fixed Public IP)
1. EC2 → **Elastic IPs** → **Allocate Elastic IP** → **Allocate**
2. **Actions** → **Associate** → select `campus-mate-server`
3. **Copy your Elastic IP** — needed for ALLOWED_ORIGINS and SSH

#### Update ALLOWED_ORIGINS locally
Open `C:\Users\Bhargav\Desktop\mini - Copy\.env`:
```
ALLOWED_ORIGINS=http://YOUR_ELASTIC_IP
```

---

### Step 4 — Connect and Install Docker

#### SSH from Windows
```powershell
Move-Item "$env:USERPROFILE\Downloads\campus-mate-key.pem" "$env:USERPROFILE\.ssh\"
icacls "$env:USERPROFILE\.ssh\campus-mate-key.pem" /inheritance:r /grant:r "${env:USERNAME}:R"
ssh -i "$env:USERPROFILE\.ssh\campus-mate-key.pem" ubuntu@YOUR_ELASTIC_IP
```

#### Install Docker (run on EC2)
```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
exit
```

SSH back in, verify:
```bash
docker --version
docker compose version
```

---

### Step 5 — Add 2 GB Swap ⚠️ CRITICAL for t3.micro

**Do not skip this — docker compose build can OOM-kill without swap, even on t3.micro (only 1 GB RAM).**

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
echo 'vm.swappiness=20' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Confirm swap is active
free -h
# Swap line should show: 2.0G  0B  2.0G
```

---

### Step 6 — Upload Project to EC2

Run from **your Windows machine** (not EC2):

```powershell
$EC2_IP = "YOUR_ELASTIC_IP"
$KEY    = "$env:USERPROFILE\.ssh\campus-mate-key.pem"
$SRC    = "C:\Users\Bhargav\Desktop\mini - Copy"

# Create project directory on EC2
ssh -i $KEY ubuntu@$EC2_IP "mkdir -p ~/campus-mate/server ~/campus-mate/client ~/campus-mate/docker"

# Upload (skips node_modules — Docker installs its own)
scp -i $KEY "$SRC\docker-compose.yml"              ubuntu@${EC2_IP}:~/campus-mate/
scp -i $KEY "$SRC\package.json"                    ubuntu@${EC2_IP}:~/campus-mate/
scp -i $KEY -r "$SRC\docker"                       ubuntu@${EC2_IP}:~/campus-mate/
scp -i $KEY -r "$SRC\server\src"                   ubuntu@${EC2_IP}:~/campus-mate/server/
scp -i $KEY "$SRC\server\package.json"             ubuntu@${EC2_IP}:~/campus-mate/server/
scp -i $KEY "$SRC\server\package-lock.json"        ubuntu@${EC2_IP}:~/campus-mate/server/
scp -i $KEY -r "$SRC\client\src"                   ubuntu@${EC2_IP}:~/campus-mate/client/
scp -i $KEY "$SRC\client\index.html"               ubuntu@${EC2_IP}:~/campus-mate/client/
scp -i $KEY "$SRC\client\package.json"             ubuntu@${EC2_IP}:~/campus-mate/client/
scp -i $KEY "$SRC\client\package-lock.json"        ubuntu@${EC2_IP}:~/campus-mate/client/
scp -i $KEY "$SRC\client\vite.config.js"           ubuntu@${EC2_IP}:~/campus-mate/client/
```

---

### Step 7 — Create `.env` on EC2

```bash
# On EC2:
cd ~/campus-mate
sudo apt install -y nodejs   # temporary, for secret generation

# Generate fresh secrets:
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('WEBHOOK_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('DATA_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"

nano .env
```

Paste the template from the [Environment Setup](#environment-setup) section above.
Fill in all values, then: `Ctrl+O` → Enter → `Ctrl+X`

---

### Step 8 — Build and Start All Containers

```bash
cd ~/campus-mate

# Build all 8 images (first run ~6–10 min on t3.micro — 2 vCPUs helps)
docker compose --env-file .env build --no-cache

# Start everything in background
docker compose --env-file .env up -d

# Verify all containers are Up
docker compose ps

# Watch logs — wait for all services to show healthy
docker compose logs -f --tail=30
```

**Expected `docker compose ps` output:**
```
NAME                      STATUS           PORTS
campus-mate-auth          Up (healthy)
campus-mate-chat          Up (healthy)
campus-mate-data          Up (healthy)
campus-mate-analytics     Up (healthy)
campus-mate-memory        Up (healthy)
campus-mate-webhooks      Up (healthy)
campus-mate-gateway       Up (healthy)    0.0.0.0:3000->3000/tcp
campus-mate-client        Up (healthy)    0.0.0.0:80->80/tcp
```

**Check memory after startup:**
```bash
free -h
docker stats --no-stream
```

---

### Step 9 — Verify It Works

```bash
# API Gateway health
curl http://localhost:3000/health
# Expected: {"status":"OK","service":"API Gateway"}

# Frontend
curl -s http://localhost:80 | head -5
# Expected: <!doctype html>...
```

From your browser (Windows):
```
http://YOUR_ELASTIC_IP        → React app loads
http://YOUR_ELASTIC_IP:3000/health → API Gateway JSON
```

---

### Step 10 — Auto-Start on Reboot

```bash
sudo nano /etc/systemd/system/campus-mate.service
```

Paste:
```ini
[Unit]
Description=Campus Mate Docker Compose Stack
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/ubuntu/campus-mate
ExecStart=/usr/bin/docker compose --env-file .env up -d
ExecStop=/usr/bin/docker compose down
User=ubuntu

[Install]
WantedBy=multi-user.target
```

Enable:
```bash
sudo systemctl daemon-reload
sudo systemctl enable campus-mate
sudo systemctl start campus-mate
```

---

### Step 11 — HTTPS with a Domain (Recommended)

#### Point domain DNS to EC2
In your registrar (GoDaddy / Namecheap / etc.):
```
A record: @   → YOUR_ELASTIC_IP
A record: www → YOUR_ELASTIC_IP
```
Wait 5–30 min for DNS propagation.

#### Install Certbot and get SSL certificate
```bash
# Stop client temporarily (frees port 80)
docker compose --env-file .env stop client

sudo apt install -y certbot
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Restart client
docker compose --env-file .env start client
```

#### Update ALLOWED_ORIGINS on EC2
```bash
nano .env
# Update: ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
docker compose --env-file .env up -d
```

---

## Verification

Run after deployment:

1. Open `http://YOUR_EC2_IP` in browser — React app loads
2. Register or log in — session is created
3. Send a chat message — Gemini responds
4. Read chat history — persists after page refresh
5. Open dashboard — timetable, exams, notes load
6. Wait 5 minutes, refresh — session stays alive

Health endpoint smoke check:
```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/auth/health
curl http://localhost:3000/api/chat/health
curl http://localhost:3000/api/data/health
curl http://localhost:3000/api/memory/health
curl http://localhost:3000/api/analytics/health
curl http://localhost:3000/api/webhooks/health
```

---

## Monitoring and Backups

> **Note:** Prometheus is disabled on t3.micro to save RAM. If you upgrade to t3.small+, re-add it to `docker-compose.yml`.

**Minimum monitoring while on free tier:**
- `docker stats` — live container memory/CPU
- `docker compose logs -f` — live service logs
- `free -h` — system memory + swap usage
- Supabase dashboard — DB load and query counts
- Redis Cloud dashboard — memory usage

**Backups:**
- Supabase Dashboard → **Database** → **Backups** (enable daily snapshots)
- Redis Cloud: enable **RDB persistence** in Redis Cloud settings

---

## Rollback Plan

If production is broken after a deploy:

```bash
# Stop everything
docker compose --env-file .env down

# Rebuild from last working state (if you tagged images)
docker compose --env-file .env up -d

# Or revert to previous code:
git checkout <last-good-commit>
docker compose --env-file .env build --no-cache
docker compose --env-file .env up -d
```

Confirm after rollback:
1. `docker compose ps` — all containers Up
2. `curl http://localhost:3000/health` — gateway healthy
3. Open browser — app loads, login works, chat responds

---

## Security Notes

- [x] All secrets cryptographically generated (not guessable)
- [x] `.env` excluded from git
- [x] Prometheus not exposed publicly
- [x] Internal services have no public ports
- [x] HMAC signature verification on webhooks
- [x] Timing-safe compare for webhook signatures
- [ ] Rotate Supabase DB password before deploying
- [ ] Rotate Redis Cloud password before deploying
- [ ] Set up HTTPS (Step 11) — required for cookies to be `Secure`
- [ ] Rotate `JWT_SECRET` and `WEBHOOK_SECRET` every 6 months
- [ ] Add SSH key rotation to your maintenance schedule

---

## Common Issues & Solutions

| Error | Cause | Fix |
|-------|-------|-----|
| Container `OOMKilled` | Out of RAM | `free -h` — ensure swap is active. `docker stats` to see which |
| Build fails with `no space left` | Disk full from Docker layers | `docker system prune -a` then rebuild |
| Build slow (~8–10 min) | t3.micro has 2 vCPUs but only 1 GB RAM | Normal — wait it out |
| `GEMINI_API_KEY is required` | Not set in `.env` | `nano .env`, add key, `docker compose up -d` |
| `JWT_SECRET is required` | Not set in `.env` | Same — fill in `.env` |
| CORS error in browser | ALLOWED_ORIGINS wrong | Add EC2 IP to ALLOWED_ORIGINS, `docker compose up -d` |
| Port 80 not accessible | Security Group | Check port 80 inbound rule allows 0.0.0.0/0 |
| `ssh: Connection refused` | Security Group | Check port 22 is open for your IP |
| `Permission denied (publickey)` | `.pem` permissions | Run `icacls` command from Step 4 |
| DB connection failed | Wrong DATABASE_URL | Use Session Pooler URL from Supabase, not Direct URL |
| Container keeps restarting | Service crash | `docker compose logs <service-name>` |
| All containers start then stop | `depends_on` health timeout | `docker compose logs` to see which service fails healthcheck |

---

## Final Sign-Off

Before going live:

- [ ] `GEMINI_API_KEY` filled in with real key
- [ ] `ALLOWED_ORIGINS` updated with EC2 IP or domain
- [ ] Supabase DB password rotated
- [ ] Redis Cloud password rotated
- [ ] `.env` NOT in git history (`git log --all -- "**/.env"` returns nothing)
- [ ] Swap file active on EC2 (`free -h` shows 2G swap)
- [ ] All 8 containers show `Up (healthy)` in `docker compose ps`
- [ ] Browser can open the app and log in
- [ ] Chat sends a message and gets a Gemini response
- [ ] HTTPS configured if using a real domain (Step 11)

---

**Last Updated:** 2026-04-06
**Hosting:** AWS EC2 t3.micro (2 vCPU, 1 GB RAM) — ~$9.50/month | ⚠️ Not free-tier eligible (use t2.micro for $0)
**Next Review:** Before each major release or instance type change
