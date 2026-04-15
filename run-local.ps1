$ErrorActionPreference = 'Stop'

Set-Location -Path $PSScriptRoot

# Prevent stale shell overrides from shadowing .env values.
$env:DATABASE_URL = ''

Write-Host 'Starting Campus Mate locally with Docker Compose...' -ForegroundColor Cyan
docker compose --env-file .env up -d --build

Write-Host ''
Write-Host 'Current container status:' -ForegroundColor Cyan
docker compose --env-file .env ps

Write-Host ''
Write-Host 'Open:' -ForegroundColor Green
Write-Host '  Client:      http://localhost'
Write-Host '  API Gateway: http://localhost:3000/health'
Write-Host '  Prometheus:  http://localhost:9090'
