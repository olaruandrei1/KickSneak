#!/usr/bin/env pwsh
# ============================================================
# KickSneak — Full Environment Setup (Windows/PowerShell)
# Run: .\setup.ps1
# ============================================================

$ErrorActionPreference = "Stop"
$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  KickSneak — Environment Setup" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# ── Helper functions ──

function Write-Step($msg) { Write-Host "[*] $msg" -ForegroundColor Yellow }
function Write-Ok($msg)   { Write-Host "[✓] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[!] $msg" -ForegroundColor Magenta }
function Write-Fail($msg) { Write-Host "[✗] $msg" -ForegroundColor Red }

function Test-Command($cmd) {
    try { Get-Command $cmd -ErrorAction Stop | Out-Null; return $true }
    catch { return $false }
}

function Install-WithWinget($id, $name) {
    Write-Step "Installing $name via winget..."
    winget install --id $id --accept-source-agreements --accept-package-agreements -e
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Failed to install $name. Install manually: https://winget.run/pkg/$id"
        return $false
    }
    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    Write-Ok "$name installed"
    return $true
}

# ── 1. Check & install prerequisites ──

Write-Host "── Prerequisites ──" -ForegroundColor Cyan
Write-Host ""

$refreshPath = $false

# Docker
if (Test-Command "docker") {
    $dockerVersion = (docker --version) -replace 'Docker version ','' -replace ',.*',''
    Write-Ok "Docker $dockerVersion"
} else {
    Write-Warn "Docker not found"
    Install-WithWinget "Docker.DockerDesktop" "Docker Desktop"
    $refreshPath = $true
    Write-Warn "Docker Desktop installed — you may need to restart and enable WSL2"
}

# Docker Compose (comes with Docker Desktop, but verify)
if (Test-Command "docker") {
    $composeCheck = docker compose version 2>&1
    if ($composeCheck -match "version") {
        Write-Ok "Docker Compose available"
    } else {
        Write-Warn "Docker Compose plugin not found — update Docker Desktop"
    }
}

# Node.js
if (Test-Command "node") {
    $nodeVersion = (node --version)
    Write-Ok "Node.js $nodeVersion"
} else {
    Write-Warn "Node.js not found"
    Install-WithWinget "OpenJS.NodeJS.LTS" "Node.js LTS"
    $refreshPath = $true
}

# npm (comes with Node)
if (Test-Command "npm") {
    Write-Ok "npm $(npm --version)"
}

# .NET SDK
$dotnetOk = $false
if (Test-Command "dotnet") {
    $sdks = dotnet --list-sdks 2>&1
    if ($sdks -match "10\.") {
        $matched = ($sdks | Select-String "10\." | Select-Object -First 1).ToString().Trim()
        Write-Ok ".NET SDK $matched"
        $dotnetOk = $true
    } else {
        Write-Warn ".NET SDK 10 not found (have: $($sdks | Select-Object -First 1))"
    }
} else {
    Write-Warn ".NET SDK not found"
}

if (-not $dotnetOk) {
    Install-WithWinget "Microsoft.DotNet.SDK.10" ".NET SDK 10"
    $refreshPath = $true
}

# Go
if (Test-Command "go") {
    $goVersion = (go version) -replace 'go version ',''
    Write-Ok "Go $goVersion"
} else {
    Write-Warn "Go not found"
    Install-WithWinget "GoLang.Go" "Go"
    $refreshPath = $true
}

# Git
if (Test-Command "git") {
    Write-Ok "Git $(git --version)"
} else {
    Write-Warn "Git not found"
    Install-WithWinget "Git.Git" "Git"
    $refreshPath = $true
}

if ($refreshPath) {
    Write-Host ""
    Write-Warn "PATH was updated. If commands fail below, restart PowerShell and re-run."
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
}

Write-Host ""

# ── 2. Check .env file ──

Write-Host "── Configuration ──" -ForegroundColor Cyan
Write-Host ""

$envFile = Join-Path $ROOT "docker\.env"
$envExample = Join-Path $ROOT "docker\.env.example"

if (Test-Path $envFile) {
    Write-Ok "docker/.env exists"
} elseif (Test-Path $envExample) {
    Write-Warn "docker/.env missing — copying from .env.example"
    Copy-Item $envExample $envFile
    Write-Warn "EDIT docker/.env with your secrets before running!"
    Write-Host ""
    notepad $envFile
    Read-Host "Press Enter after editing .env"
} else {
    Write-Fail "No docker/.env or .env.example found!"
    exit 1
}

Write-Host ""

# ── 3. Frontend — npm install ──

Write-Host "── Frontend (React) ──" -ForegroundColor Cyan
Write-Host ""

$fePath = Join-Path $ROOT "kicksneak-fe"
if (Test-Path (Join-Path $fePath "package.json")) {
    if (-not (Test-Path (Join-Path $fePath "node_modules"))) {
        Write-Step "Installing frontend dependencies..."
        Push-Location $fePath
        npm ci --silent 2>&1 | Out-Null
        Pop-Location
        Write-Ok "npm ci complete"
    } else {
        Write-Ok "node_modules exists — skipping npm install"
    }
} else {
    Write-Warn "kicksneak-fe/package.json not found — skipping"
}

Write-Host ""

# ── 4. Backend — dotnet restore + build ──

Write-Host "── Backend (.NET) ──" -ForegroundColor Cyan
Write-Host ""

$bePath = Join-Path $ROOT "kicksneak-be"
$sln = Get-ChildItem -Path $bePath -Filter "*.sln" -Recurse | Select-Object -First 1

if ($sln) {
    Write-Step "Restoring & building .NET solution..."
    Push-Location $bePath
    dotnet restore $sln.FullName --verbosity quiet 2>&1 | Out-Null
    dotnet build $sln.FullName -c Debug --no-restore --verbosity quiet 2>&1 | Out-Null
    Pop-Location
    Write-Ok "dotnet build complete"
} else {
    Write-Warn "No .sln found in kicksneak-be — skipping"
}

Write-Host ""

# ── 5. Chat Service — go mod download ──

Write-Host "── Chat Service (Go) ──" -ForegroundColor Cyan
Write-Host ""

$chatPath = Join-Path $ROOT "kicksneak-chat"
if (Test-Path (Join-Path $chatPath "go.mod")) {
    Write-Step "Downloading Go dependencies..."
    Push-Location $chatPath
    go mod download 2>&1 | Out-Null
    Pop-Location
    Write-Ok "go mod download complete"
} else {
    Write-Warn "kicksneak-chat/go.mod not found — skipping"
}

Write-Host ""

# ── 6. Docker Compose — build & start ──

Write-Host "── Docker ──" -ForegroundColor Cyan
Write-Host ""

$dockerDir = Join-Path $ROOT "docker"

# Check Docker daemon
$dockerRunning = $false
try {
    docker info 2>&1 | Out-Null
    $dockerRunning = $true
} catch { }

if (-not $dockerRunning) {
    Write-Warn "Docker daemon not running. Starting Docker Desktop..."
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    Write-Step "Waiting for Docker to start (up to 60s)..."
    $waited = 0
    while ($waited -lt 60) {
        Start-Sleep -Seconds 3
        $waited += 3
        try { docker info 2>&1 | Out-Null; $dockerRunning = $true; break } catch { }
        Write-Host "  waiting... ($waited`s)" -NoNewline -ForegroundColor DarkGray
        Write-Host ""
    }
    if (-not $dockerRunning) {
        Write-Fail "Docker didn't start in time. Start Docker Desktop manually and re-run."
        exit 1
    }
}

Write-Ok "Docker daemon running"

Write-Step "Building & starting containers..."
Push-Location $dockerDir
docker compose up -d --build 2>&1 | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
Pop-Location

Write-Host ""

# ── 7. Pull Ollama models ──

Write-Host "── Ollama Models ──" -ForegroundColor Cyan
Write-Host ""

Write-Step "Waiting for Ollama containers to be healthy..."
Start-Sleep -Seconds 10

Write-Step "Pulling qwen2.5:7b (seed)..."
docker exec kicksneak-ollama-seed ollama pull qwen2.5:7b 2>&1 | Select-Object -Last 3 | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
Write-Ok "qwen2.5:7b ready"

Write-Step "Pulling llama3.1:8b (chat)..."
docker exec kicksneak-ollama-chat ollama pull llama3.1:8b 2>&1 | Select-Object -Last 3 | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
Write-Ok "llama3.1:8b ready"

Write-Host ""

# ── 8. Health checks ──

Write-Host "── Health Checks ──" -ForegroundColor Cyan
Write-Host ""

$services = @(
    @{ Name = "PostgreSQL";  Url = $null;                           Check = { docker exec kicksneak-postgres pg_isready -U kicksneak_user 2>&1 | Out-Null; $LASTEXITCODE -eq 0 } },
    @{ Name = "Redis";       Url = $null;                           Check = { docker exec kicksneak-redis redis-cli ping 2>&1 | Out-Null; $LASTEXITCODE -eq 0 } },
    @{ Name = "Backend";     Url = "http://localhost:5005";         Check = { try { (Invoke-WebRequest -Uri "http://localhost:5005" -TimeoutSec 3 -UseBasicParsing).StatusCode -lt 500 } catch { $false } } },
    @{ Name = "Frontend";    Url = "http://localhost:3000";         Check = { try { (Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 3 -UseBasicParsing).StatusCode -eq 200 } catch { $false } } },
    @{ Name = "Chat Service"; Url = "http://localhost:8080";        Check = { try { (Invoke-WebRequest -Uri "http://localhost:8080" -TimeoutSec 3 -UseBasicParsing).StatusCode -lt 500 } catch { $false } } }
)

foreach ($svc in $services) {
    $ok = & $svc.Check
    if ($ok) { Write-Ok "$($svc.Name) — UP" }
    else { Write-Warn "$($svc.Name) — starting (may need a few more seconds)" }
}

# ── Done ──

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "  KickSneak is ready!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend:   http://localhost:3000" -ForegroundColor White
Write-Host "  Backend:    http://localhost:5005" -ForegroundColor White
Write-Host "  Chat:       http://localhost:8080" -ForegroundColor White
Write-Host "  Swagger:    http://localhost:5005/swagger" -ForegroundColor White
Write-Host "  PostgreSQL: localhost:5432" -ForegroundColor DarkGray
Write-Host "  Redis:      localhost:6379" -ForegroundColor DarkGray
Write-Host "  Azurite:    localhost:10000" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Stop:  cd docker && docker compose down" -ForegroundColor DarkGray
Write-Host "  Logs:  cd docker && docker compose logs -f [service]" -ForegroundColor DarkGray
Write-Host ""
