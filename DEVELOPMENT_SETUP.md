# Development Setup Guide

This guide covers complete local development setup for brew_me_in, including all prerequisites, configuration, and troubleshooting.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Setup](#quick-setup)
- [Detailed Setup](#detailed-setup)
- [Development Workflow](#development-workflow)
- [Troubleshooting](#troubleshooting)
- [VS Code Setup](#vs-code-setup)

## Prerequisites

### Required Software

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | 18+ | Runtime environment |
| **npm** | 8+ | Package manager |
| **PostgreSQL** | 14+ | Primary database |
| **Redis** | 7+ | Cache & rate limiting |
| **Docker** | 20+ (optional) | Containerization |
| **Git** | 2.x | Version control |

### Installation

#### macOS (using Homebrew)

```bash
# Install Homebrew if needed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node@18

# Install PostgreSQL
brew install postgresql@14
brew services start postgresql@14

# Install Redis
brew install redis
brew services start redis

# Install Docker Desktop (optional)
brew install --cask docker
```

#### Ubuntu/Debian

```bash
# Update package list
sudo apt update

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Install Redis
sudo apt install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Install Docker (optional)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

#### Windows

1. **Node.js**: Download from [nodejs.org](https://nodejs.org/)
2. **PostgreSQL**: Download from [postgresql.org](https://www.postgresql.org/download/)
3. **Redis**: Use [WSL2](https://learn.microsoft.com/en-us/windows/wsl/install) or [Memurai](https://www.memurai.com/)
4. **Docker Desktop**: Download from [docker.com](https://www.docker.com/products/docker-desktop)

### Verify Installation

```bash
# Check versions
node --version    # Should be v18.x or higher
npm --version     # Should be 8.x or higher
psql --version    # Should be 14.x or higher
redis-cli --version  # Should be 7.x or higher
docker --version  # Should be 20.x or higher (if using Docker)
```

## Quick Setup

For experienced developers, here's the TL;DR:

```bash
# 1. Clone and install
git clone <repo-url> brew_me_in
cd brew_me_in
npm install

# 2. Setup environment
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration

# 3. Create database
createdb brew_me_in

# 4. Run migrations
cd backend
npm run migrate

# 5. Start services
# Option A: Docker (easiest)
cd ..
docker-compose up -d

# Option B: Manual
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

Access:
- Backend API: `http://localhost:3000`
- Frontend: `http://localhost:5173`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

## Detailed Setup

### Step 1: Clone Repository

```bash
# Clone the repository
git clone <repo-url> brew_me_in
cd brew_me_in

# Check repository structure
ls -la
# Should see: backend/, frontend/, mobile/, docs/, docker-compose.yml, etc.
```

### Step 2: Install Dependencies

The project uses npm workspaces for monorepo management:

```bash
# Install all workspace dependencies
npm install

# This installs:
# - backend/node_modules
# - frontend/node_modules
# - mobile/node_modules
# - Root workspace dependencies
```

To install dependencies for individual workspaces:

```bash
# Backend only
npm install --workspace=backend

# Frontend only
npm install --workspace=frontend

# Mobile only
npm install --workspace=mobile
```

### Step 3: Database Setup

#### Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql postgres

# Create database and user
CREATE DATABASE brew_me_in;
CREATE USER brew_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE brew_me_in TO brew_user;
\q
```

#### Run Migrations

```bash
# Navigate to backend
cd backend

# Method 1: Using npm script (recommended)
npm run migrate

# Method 2: Manual psql
psql brew_me_in < src/db/schema.sql

# Verify tables were created
psql brew_me_in -c "\dt"
```

Expected tables:
- `cafes`, `users`, `badges`, `tips`, `join_tokens`, `refresh_tokens`
- `messages`, `moderation_actions`
- `user_interests`, `pokes`, `dm_channels`, `dm_messages`
- `cafe_analytics`, `agent_queries`, `agent_config`

### Step 4: Redis Setup

#### Start Redis Server

```bash
# macOS/Linux
redis-server

# Or with custom config
redis-server /path/to/redis.conf

# Verify Redis is running
redis-cli ping
# Should respond: PONG
```

#### Test Redis Connection

```bash
# Connect to Redis
redis-cli

# Test commands
SET test "Hello"
GET test
# Should return: "Hello"

# Exit
exit
```

### Step 5: Environment Configuration

#### Backend Configuration

```bash
# Copy example environment file
cd backend
cp .env.example .env
```

Edit `backend/.env` with your configuration:

```env
# Server Configuration
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# Database Configuration
DATABASE_URL=postgresql://brew_user:your_password@localhost:5432/brew_me_in
DB_HOST=localhost
DB_PORT=5432
DB_NAME=brew_me_in
DB_USER=brew_user
DB_PASSWORD=your_password
DB_SSL=false

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_SECRET=your-refresh-token-secret-change-this-too
REFRESH_TOKEN_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:5173,http://localhost:3001

# Rate Limiting Configuration
RATE_LIMIT_MESSAGE_FREE_COUNT=30
RATE_LIMIT_MESSAGE_FREE_WINDOW=3600
RATE_LIMIT_MESSAGE_BADGE_COUNT=60
RATE_LIMIT_MESSAGE_BADGE_WINDOW=3600
RATE_LIMIT_MESSAGE_COOLDOWN_FREE=30
RATE_LIMIT_MESSAGE_COOLDOWN_BADGE=15
RATE_LIMIT_AGENT_PERSONAL_COUNT=2
RATE_LIMIT_AGENT_GLOBAL_COOLDOWN=120
RATE_LIMIT_POKE_COUNT=5
RATE_LIMIT_POKE_WINDOW=86400

# Spam Detection Configuration
SPAM_DETECTION_ENABLED=true
SPAM_MAX_CAPS_PERCENTAGE=50
SPAM_MAX_URLS=2
SPAM_MUTE_DURATION=86400
SPAM_DUPLICATE_WINDOW=300

# Badge Configuration
BADGE_TIP_THRESHOLD=5
BADGE_TIP_WINDOW_DAYS=7
BADGE_DURATION_DAYS=30

# User Configuration
USER_SESSION_DURATION_HOURS=24
USER_CLEANUP_INTERVAL_HOURS=1

# Location Validation
LOCATION_VALIDATION_RADIUS=100
WIFI_VALIDATION_ENABLED=true
GPS_VALIDATION_ENABLED=true

# Anthropic AI Configuration
ANTHROPIC_API_KEY=your-anthropic-api-key-here
ANTHROPIC_MODEL=claude-sonnet-4-5-20250514
AI_MAX_TOKENS=1024
AI_TEMPERATURE=0.7

# Scheduler Configuration
ENABLE_SCHEDULER=true
ENABLE_PROACTIVE_MESSAGES=true
PROACTIVE_MESSAGE_INTERVAL=120000
PROACTIVE_MESSAGE_COOLDOWN=300000

# Notification Configuration
ENABLE_PUSH_NOTIFICATIONS=false
```

#### Frontend Configuration

```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3000
VITE_ENABLE_MOCK_DATA=false
```

### Step 6: Start Development Servers

#### Option A: Using Docker Compose (Recommended)

```bash
# From project root
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps

# Stop services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build
```

This starts:
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`
- Backend API on `localhost:3000`
- Frontend on `localhost:5173`

#### Option B: Manual Setup

**Terminal 1 - Backend:**

```bash
cd backend
npm run dev

# Output:
# [INFO] Server starting...
# [INFO] Database connected
# [INFO] Redis connected
# [INFO] Socket.io initialized
# [INFO] Scheduler started
# [INFO] Server listening on port 3000
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev

# Output:
# VITE v5.0.11  ready in 823 ms
# ➜  Local:   http://localhost:5173/
# ➜  Network: use --host to expose
```

**Terminal 3 - Scheduler (Optional, runs automatically with backend):**

```bash
cd backend
npm run scheduler

# For testing scheduler independently
```

### Step 7: Verify Installation

#### Backend Health Check

```bash
# Health endpoint
curl http://localhost:3000/api/health

# Expected response:
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "scheduler": {
    "isRunning": true,
    "jobCount": 6
  },
  "timestamp": "2025-11-19T10:00:00.000Z"
}
```

#### Test WebSocket Connection

```bash
# Install wscat for testing
npm install -g wscat

# Connect to Socket.io
wscat -c "ws://localhost:3000/socket.io/?EIO=4&transport=websocket"

# You should see connection established
```

#### Test Database Connection

```bash
# Check database tables
psql brew_me_in -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public';"

# Check sample data
psql brew_me_in -c "SELECT * FROM cafes LIMIT 5;"
```

#### Test Redis Connection

```bash
# Check Redis keys
redis-cli KEYS "*"

# Monitor Redis in real-time
redis-cli MONITOR
```

### Step 8: Seed Test Data (Optional)

```bash
cd backend

# Create seed script
npm run seed

# Or manually insert test data
psql brew_me_in << EOF
-- Insert test cafe
INSERT INTO cafes (id, name, address, wifi_ssid, latitude, longitude)
VALUES (
  'cafe-123',
  'Test Cafe',
  '123 Main St',
  'TestCafe-WiFi',
  37.7749,
  -122.4194
);

-- Insert test user
INSERT INTO users (id, username, cafe_id, badge_status, created_at, expires_at)
VALUES (
  'user-123',
  'TestUser',
  'cafe-123',
  'none',
  NOW(),
  NOW() + INTERVAL '24 hours'
);
EOF
```

## Development Workflow

### Running Tests

```bash
# Backend tests
cd backend
npm test                 # Run all tests
npm run test:unit       # Unit tests only
npm run test:integration # Integration tests only
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report

# Frontend tests (when available)
cd frontend
npm test
```

### Code Quality

```bash
# Linting
cd backend
npm run lint           # Check for issues
npm run lint:fix       # Auto-fix issues

# Type checking
npm run type-check

# Format code (Prettier)
npm run format
```

### Database Migrations

```bash
cd backend

# Run migrations
npm run migrate

# Create new migration
# Edit src/db/schema.sql and add your changes

# Rollback (manual)
psql brew_me_in < src/db/rollback.sql
```

### Hot Reloading

Both backend and frontend support hot reloading:

- **Backend**: Uses `nodemon` + `ts-node` for automatic restart
- **Frontend**: Uses Vite HMR for instant updates

### Debugging

#### VS Code Launch Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/backend/src/index.ts",
      "preLaunchTask": "tsc: build - backend/tsconfig.json",
      "outFiles": ["${workspaceFolder}/backend/dist/**/*.js"],
      "env": {
        "NODE_ENV": "development"
      }
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceFolder}/backend/node_modules/.bin/jest",
      "args": ["--runInBand", "--no-cache"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

#### Chrome DevTools (Node.js)

```bash
# Start backend with inspector
cd backend
node --inspect -r ts-node/register src/index.ts

# Open chrome://inspect in Chrome
# Click "Inspect" on the Node.js process
```

### Logs and Monitoring

#### View Backend Logs

```bash
# Development logs (console)
cd backend
npm run dev

# Production logs (file-based)
tail -f logs/combined.log
tail -f logs/error.log
```

#### View Redis Operations

```bash
# Monitor all Redis commands
redis-cli MONITOR

# Check specific keys
redis-cli --scan --pattern "ratelimit:*"
redis-cli --scan --pattern "cafe:*"
```

#### View Database Queries

Enable query logging in PostgreSQL:

```bash
# Edit postgresql.conf
log_statement = 'all'
log_duration = on

# Restart PostgreSQL
brew services restart postgresql@14  # macOS
sudo systemctl restart postgresql    # Linux

# View logs
tail -f /usr/local/var/log/postgresql@14.log  # macOS
tail -f /var/log/postgresql/postgresql-14-main.log  # Linux
```

## Troubleshooting

### Common Issues

#### 1. Port Already in Use

**Error**: `EADDRINUSE: address already in use :::3000`

**Solution**:
```bash
# Find process using port 3000
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill the process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows

# Or use a different port
# Edit backend/.env
PORT=3001
```

#### 2. Database Connection Failed

**Error**: `ECONNREFUSED 127.0.0.1:5432`

**Solution**:
```bash
# Check if PostgreSQL is running
brew services list | grep postgresql  # macOS
sudo systemctl status postgresql      # Linux

# Start PostgreSQL
brew services start postgresql@14  # macOS
sudo systemctl start postgresql    # Linux

# Verify connection
psql -U brew_user -d brew_me_in -h localhost -p 5432
```

#### 3. Redis Connection Failed

**Error**: `ECONNREFUSED 127.0.0.1:6379`

**Solution**:
```bash
# Check if Redis is running
brew services list | grep redis  # macOS
sudo systemctl status redis      # Linux

# Start Redis
brew services start redis  # macOS
sudo systemctl start redis # Linux

# Test connection
redis-cli ping
```

#### 4. Migration Fails

**Error**: `relation "users" already exists`

**Solution**:
```bash
# Drop and recreate database
dropdb brew_me_in
createdb brew_me_in

# Run migrations again
cd backend
npm run migrate
```

#### 5. Module Not Found

**Error**: `Cannot find module '@/config'`

**Solution**:
```bash
# Clear node_modules and reinstall
rm -rf node_modules backend/node_modules frontend/node_modules
npm install

# Clear npm cache if still failing
npm cache clean --force
npm install
```

#### 6. TypeScript Errors

**Error**: `TS2307: Cannot find module` or type errors

**Solution**:
```bash
cd backend

# Rebuild TypeScript
npm run build

# Check tsconfig.json paths
# Ensure all paths are correct

# Restart TypeScript server in VS Code
# Cmd+Shift+P -> "TypeScript: Restart TS Server"
```

#### 7. Socket.io Connection Issues

**Error**: WebSocket connection fails or constantly reconnects

**Solution**:
```bash
# Check CORS configuration in backend/.env
CORS_ORIGIN=http://localhost:5173

# Verify frontend WebSocket URL
# frontend/.env
VITE_WS_URL=http://localhost:3000

# Test with curl
curl http://localhost:3000/socket.io/?EIO=4&transport=polling
```

#### 8. Anthropic API Errors

**Error**: `Invalid API key` or `Rate limit exceeded`

**Solution**:
```bash
# Verify API key in backend/.env
ANTHROPIC_API_KEY=sk-ant-api03-...

# Check API usage at console.anthropic.com

# Disable AI temporarily for testing
ENABLE_AI_AGENT=false
```

### Reset Everything

If all else fails, nuclear option:

```bash
# Stop all services
docker-compose down -v  # If using Docker
pkill -f "node"         # Kill all Node processes

# Drop database
dropdb brew_me_in

# Clear Redis
redis-cli FLUSHALL

# Remove all dependencies
rm -rf node_modules backend/node_modules frontend/node_modules
rm -rf backend/dist frontend/dist
rm package-lock.json backend/package-lock.json frontend/package-lock.json

# Reinstall from scratch
npm install
cd backend && npm run migrate
cd ..
npm run dev
```

## VS Code Setup

### Recommended Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "eamodio.gitlens"
  ]
}
```

### Workspace Settings

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.next": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/build": true
  }
}
```

## Next Steps

After completing setup:

1. Read [Architecture Overview](./docs/ARCHITECTURE_OVERVIEW.md) to understand system design
2. Explore [Component Documentation](./docs/components/) for detailed information
3. Review [API Examples](./backend/API_EXAMPLES.md) for usage patterns
4. Check [Testing Guide](./backend/TESTING.md) to write tests
5. See [Deployment Guide](./DEPLOYMENT.md) for production deployment

## Getting Help

- Check existing [Issues](https://github.com/your-org/brew_me_in/issues)
- Review [Architecture Docs](./docs/ARCHITECTURE_OVERVIEW.md)
- Contact the development team

---

**Last Updated**: 2025-11-19
