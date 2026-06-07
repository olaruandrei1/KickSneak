#!/usr/bin/env bash
# ============================================================
# KickSneak — Full Environment Setup (Linux / macOS)
# Run: chmod +x setup.sh && ./setup.sh
# ============================================================

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; GRAY='\033[0;90m'; NC='\033[0m'

step()  { echo -e "${YELLOW}[*] $1${NC}"; }
ok()    { echo -e "${GREEN}[✓] $1${NC}"; }
warn()  { echo -e "${YELLOW}[!] $1${NC}"; }
fail()  { echo -e "${RED}[✗] $1${NC}"; }

OS="$(uname -s)"
ARCH="$(uname -m)"
IS_MAC=false; IS_LINUX=false
[[ "$OS" == "Darwin" ]] && IS_MAC=true
[[ "$OS" == "Linux" ]]  && IS_LINUX=true

echo ""
echo -e "${CYAN}=====================================${NC}"
echo -e "${CYAN}  KickSneak — Environment Setup${NC}"
echo -e "${CYAN}=====================================${NC}"
echo ""

# ── Helper: install via package manager ──

install_pkg() {
    local name="$1" brew_id="$2" apt_id="$3"
    if $IS_MAC; then
        if command -v brew &>/dev/null; then
            step "Installing $name via Homebrew..."
            brew install "$brew_id"
        else
            fail "Homebrew not found. Install: https://brew.sh"
            return 1
        fi
    elif $IS_LINUX; then
        if command -v apt-get &>/dev/null; then
            step "Installing $name via apt..."
            sudo apt-get update -qq && sudo apt-get install -y -qq "$apt_id"
        elif command -v dnf &>/dev/null; then
            step "Installing $name via dnf..."
            sudo dnf install -y "$apt_id"
        else
            fail "No supported package manager found for $name"
            return 1
        fi
    fi
}

# ── 1. Prerequisites ──

echo -e "${CYAN}── Prerequisites ──${NC}"
echo ""

# Docker
if command -v docker &>/dev/null; then
    ok "Docker $(docker --version | grep -oP '\d+\.\d+\.\d+' | head -1)"
else
    warn "Docker not found"
    if $IS_MAC; then
        step "Installing Docker Desktop via Homebrew..."
        brew install --cask docker
        warn "Open Docker Desktop from Applications before continuing"
        read -p "Press Enter after Docker Desktop is running..."
    elif $IS_LINUX; then
        step "Installing Docker via official script..."
        curl -fsSL https://get.docker.com | sh
        sudo usermod -aG docker "$USER"
        warn "You may need to log out and back in for Docker group permissions"
    fi
fi

# Docker Compose
if docker compose version &>/dev/null 2>&1; then
    ok "Docker Compose available"
else
    warn "Docker Compose plugin not found"
    if $IS_LINUX; then
        step "Installing Docker Compose plugin..."
        sudo apt-get install -y -qq docker-compose-plugin 2>/dev/null || \
        sudo dnf install -y docker-compose-plugin 2>/dev/null || \
        warn "Install manually: https://docs.docker.com/compose/install/"
    fi
fi

# Node.js
if command -v node &>/dev/null; then
    ok "Node.js $(node --version)"
else
    warn "Node.js not found"
    if command -v brew &>/dev/null; then
        brew install node@20
    elif command -v apt-get &>/dev/null; then
        step "Installing Node.js 20 via NodeSource..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y -qq nodejs
    else
        fail "Install Node.js manually: https://nodejs.org"
    fi
fi

if command -v npm &>/dev/null; then
    ok "npm $(npm --version)"
fi

# .NET SDK 10
DOTNET_OK=false
if command -v dotnet &>/dev/null; then
    if dotnet --list-sdks 2>/dev/null | grep -q "^10\."; then
        SDK_VER=$(dotnet --list-sdks | grep "^10\." | head -1 | awk '{print $1}')
        ok ".NET SDK $SDK_VER"
        DOTNET_OK=true
    else
        warn ".NET SDK 10 not found"
    fi
else
    warn ".NET SDK not found"
fi

if ! $DOTNET_OK; then
    if $IS_MAC; then
        brew install dotnet@10 2>/dev/null || brew install --cask dotnet-sdk 2>/dev/null
    elif $IS_LINUX; then
        step "Installing .NET SDK 10..."
        wget -q https://dot.net/v1/dotnet-install.sh -O /tmp/dotnet-install.sh
        chmod +x /tmp/dotnet-install.sh
        /tmp/dotnet-install.sh --channel 10.0
        export PATH="$HOME/.dotnet:$PATH"
        echo 'export PATH="$HOME/.dotnet:$PATH"' >> ~/.bashrc
    fi
fi

# Go
if command -v go &>/dev/null; then
    ok "Go $(go version | awk '{print $3}')"
else
    warn "Go not found"
    if $IS_MAC; then
        brew install go
    elif $IS_LINUX; then
        step "Installing Go..."
        GO_VER="1.23.4"
        wget -q "https://go.dev/dl/go${GO_VER}.linux-amd64.tar.gz" -O /tmp/go.tar.gz
        sudo rm -rf /usr/local/go
        sudo tar -C /usr/local -xzf /tmp/go.tar.gz
        export PATH="/usr/local/go/bin:$PATH"
        echo 'export PATH="/usr/local/go/bin:$PATH"' >> ~/.bashrc
    fi
fi

# Git
if command -v git &>/dev/null; then
    ok "Git $(git --version | awk '{print $3}')"
else
    warn "Git not found"
    install_pkg "Git" "git" "git"
fi

echo ""

# ── 2. Check .env ──

echo -e "${CYAN}── Configuration ──${NC}"
echo ""

ENV_FILE="$ROOT/docker/.env"
ENV_EXAMPLE="$ROOT/docker/.env.example"

if [[ -f "$ENV_FILE" ]]; then
    ok "docker/.env exists"
else
    if [[ -f "$ENV_EXAMPLE" ]]; then
        warn "docker/.env missing — copying from .env.example"
        cp "$ENV_EXAMPLE" "$ENV_FILE"
        warn "EDIT docker/.env with your secrets before running!"
        echo ""
        ${EDITOR:-nano} "$ENV_FILE"
        read -p "Press Enter after editing .env..."
    else
        fail "No docker/.env or .env.example found!"
        exit 1
    fi
fi

echo ""

# ── 3. Frontend — npm install ──

echo -e "${CYAN}── Frontend (React) ──${NC}"
echo ""

FE_PATH="$ROOT/kicksneak-fe"
if [[ -f "$FE_PATH/package.json" ]]; then
    if [[ ! -d "$FE_PATH/node_modules" ]]; then
        step "Installing frontend dependencies..."
        cd "$FE_PATH" && npm ci --silent 2>&1 | tail -1
        cd "$ROOT"
        ok "npm ci complete"
    else
        ok "node_modules exists — skipping"
    fi
else
    warn "kicksneak-fe/package.json not found — skipping"
fi

echo ""

# ── 4. Backend — dotnet restore + build ──

echo -e "${CYAN}── Backend (.NET) ──${NC}"
echo ""

BE_PATH="$ROOT/kicksneak-be"
SLN=$(find "$BE_PATH" -maxdepth 2 -name "*.sln" -print -quit 2>/dev/null)

if [[ -n "$SLN" ]]; then
    step "Restoring & building .NET solution..."
    dotnet restore "$SLN" --verbosity quiet 2>&1 | tail -1
    dotnet build "$SLN" -c Debug --no-restore --verbosity quiet 2>&1 | tail -1
    ok "dotnet build complete"
else
    warn "No .sln found in kicksneak-be — skipping"
fi

echo ""

# ── 5. Chat Service — go mod download ──

echo -e "${CYAN}── Chat Service (Go) ──${NC}"
echo ""

CHAT_PATH="$ROOT/kicksneak-chat"
if [[ -f "$CHAT_PATH/go.mod" ]]; then
    step "Downloading Go dependencies..."
    cd "$CHAT_PATH" && go mod download 2>&1 | tail -1
    cd "$ROOT"
    ok "go mod download complete"
else
    warn "kicksneak-chat/go.mod not found — skipping"
fi

echo ""

# ── 6. Docker Compose ──

echo -e "${CYAN}── Docker ──${NC}"
echo ""

# Check Docker daemon
if ! docker info &>/dev/null 2>&1; then
    warn "Docker daemon not running"
    if $IS_MAC; then
        step "Starting Docker Desktop..."
        open -a Docker
    elif $IS_LINUX; then
        step "Starting Docker service..."
        sudo systemctl start docker
    fi

    step "Waiting for Docker (up to 60s)..."
    for i in $(seq 1 20); do
        sleep 3
        if docker info &>/dev/null 2>&1; then break; fi
        echo -e "  ${GRAY}waiting... ($((i*3))s)${NC}"
    done

    if ! docker info &>/dev/null 2>&1; then
        fail "Docker didn't start. Start manually and re-run."
        exit 1
    fi
fi

ok "Docker daemon running"

step "Building & starting containers..."
cd "$ROOT/docker"
docker compose up -d --build 2>&1 | while read line; do echo -e "  ${GRAY}$line${NC}"; done
cd "$ROOT"

echo ""

# ── 7. Ollama models ──

echo -e "${CYAN}── Ollama Models ──${NC}"
echo ""

step "Waiting for Ollama containers..."
sleep 10

step "Pulling qwen2.5:7b (seed)..."
docker exec kicksneak-ollama-seed ollama pull qwen2.5:7b 2>&1 | tail -3 | while read line; do echo -e "  ${GRAY}$line${NC}"; done
ok "qwen2.5:7b ready"

step "Pulling llama3.1:8b (chat)..."
docker exec kicksneak-ollama-chat ollama pull llama3.1:8b 2>&1 | tail -3 | while read line; do echo -e "  ${GRAY}$line${NC}"; done
ok "llama3.1:8b ready"

echo ""

# ── 8. Health checks ──

echo -e "${CYAN}── Health Checks ──${NC}"
echo ""

check_http() {
    curl -s -o /dev/null -w "%{http_code}" --max-time 3 "$1" 2>/dev/null
}

check_service() {
    local name="$1" check="$2"
    if eval "$check"; then
        ok "$name — UP"
    else
        warn "$name — starting (may need a few more seconds)"
    fi
}

check_service "PostgreSQL"  "docker exec kicksneak-postgres pg_isready -U kicksneak_user &>/dev/null"
check_service "Redis"       "docker exec kicksneak-redis redis-cli ping &>/dev/null"
check_service "Backend"     '[[ $(check_http "http://localhost:5005") -lt 500 ]]'
check_service "Frontend"    '[[ $(check_http "http://localhost:3000") == 200 ]]'
check_service "Chat"        '[[ $(check_http "http://localhost:8080") -lt 500 ]]'

# ── Done ──

echo ""
echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}  KickSneak is ready!${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""
echo -e "  Frontend:   ${NC}http://localhost:3000"
echo -e "  Backend:    ${NC}http://localhost:5005"
echo -e "  Chat:       ${NC}http://localhost:8080"
echo -e "  Swagger:    ${NC}http://localhost:5005/swagger"
echo -e "  ${GRAY}PostgreSQL: localhost:5432${NC}"
echo -e "  ${GRAY}Redis:      localhost:6379${NC}"
echo -e "  ${GRAY}Azurite:    localhost:10000${NC}"
echo ""
echo -e "  ${GRAY}Stop:  cd docker && docker compose down${NC}"
echo -e "  ${GRAY}Logs:  cd docker && docker compose logs -f [service]${NC}"
echo ""
