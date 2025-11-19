# Brew Me In - Moderator Dashboard & Admin Tools

A comprehensive moderator dashboard and admin tools system for cafe management, featuring real-time monitoring, user moderation, analytics, and AI agent configuration.

## Features

### Core Features
- **Real-time Activity Monitoring** - Live feed of all cafe activities via WebSocket
- **User Management** - View, search, mute, and ban users
- **Moderation Tools** - Mute users, delete messages, manage bans
- **Analytics Dashboard** - Visualize cafe metrics with interactive charts
- **Agent Configuration** - Configure AI agent behavior and personality
- **Export Functionality** - Export analytics data as CSV reports
- **JWT Authentication** - Secure moderator authentication
- **Role-based Access Control** - Owner and moderator roles with permissions

### Technical Stack

**Backend:**
- Node.js + Express + TypeScript
- PostgreSQL (database)
- Redis (caching & real-time data)
- Socket.io (WebSocket for real-time updates)
- JWT (authentication)
- bcrypt (password hashing)

**Frontend:**
- React + TypeScript
- Tailwind CSS (styling)
- React Router (navigation)
- Recharts (analytics visualization)
- Socket.io Client (real-time updates)
- Axios (API client)

**Infrastructure:**
- Docker & Docker Compose
- Nginx (frontend serving)

## Project Structure

```
brew_me_in/
├── backend/                 # Backend API server
│   ├── src/
│   │   ├── config/         # Database & Redis configuration
│   │   ├── middleware/     # Authentication middleware
│   │   ├── routes/         # API route handlers
│   │   ├── types/          # TypeScript type definitions
│   │   ├── utils/          # Utility functions
│   │   ├── websocket/      # WebSocket server setup
│   │   └── index.ts        # Application entry point
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── frontend/               # React frontend
│   ├── src/
│   │   ├── api/           # API client
│   │   ├── components/    # React components
│   │   ├── context/       # React context (Auth)
│   │   ├── hooks/         # Custom React hooks
│   │   ├── pages/         # Page components
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── vite.config.ts
├── database/               # Database schema
│   └── schema.sql
├── docker-compose.yml      # Docker orchestration
├── .env.example           # Environment variables template
└── README.md              # This file
```

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)
- PostgreSQL 15+ (for local development)
- Redis 7+ (for local development)

### Option 1: Docker (Recommended)

1. Clone the repository:
```bash
git clone <repository-url>
cd brew_me_in
```

2. Copy environment variables:
```bash
cp .env.example .env
# Edit .env and update JWT_SECRET
```

3. Start all services:
```bash
docker-compose up -d
```

4. Access the application:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Database: localhost:5432
- Redis: localhost:6379

5. Login with demo credentials:
- Email: `admin@brewhouse.com`
- Password: `admin123`

### Option 2: Local Development

1. Install dependencies:
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..
```

2. Set up PostgreSQL database:
```bash
# Create database
createdb brew_me_in

# Run schema
psql brew_me_in < database/schema.sql
```

3. Set up Redis:
```bash
# Start Redis (using Homebrew on macOS)
brew services start redis

# Or using Docker
docker run -d -p 6379:6379 redis:7-alpine
```

4. Configure environment:
```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your database credentials

# Frontend
cd ../frontend
echo "VITE_API_URL=http://localhost:3000" > .env
```

5. Start development servers:
```bash
# From root directory
npm run dev

# Or separately:
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

## API Documentation

### Authentication Endpoints

**POST /api/admin/auth/login**
```json
Request:
{
  "email": "admin@brewhouse.com",
  "password": "admin123"
}

Response:
{
  "token": "jwt-token",
  "moderator": { ... },
  "cafe": { ... }
}
```

### User Management

**GET /api/admin/cafes/:cafeId/users**
- Query params: `search`, `banned`, `limit`, `offset`
- Returns list of users with moderation status

### Moderation Actions

**POST /api/admin/moderation/mute**
```json
{
  "userId": "uuid",
  "duration": 60,
  "reason": "Spamming"
}
```

**POST /api/admin/moderation/ban**
```json
{
  "userId": "uuid",
  "reason": "Violation of terms",
  "permanent": true
}
```

**DELETE /api/admin/messages/:messageId**
- Soft deletes a message

### Analytics

**GET /api/admin/analytics/:cafeId**
- Query params: `startDate`, `endDate`
- Returns analytics data and summary

**GET /api/admin/analytics/:cafeId/export**
- Returns CSV file with analytics data

### Agent Configuration

**GET /api/admin/agent/config/:cafeId**
- Returns current agent configuration

**PUT /api/admin/agent/config/:cafeId**
```json
{
  "enabled": true,
  "responseTime": "fast",
  "personality": "friendly",
  "specializations": ["coffee", "brewing"]
}
```

## WebSocket Events

### Server → Client

**activity:new** - New activity event
**stats:update** - Dashboard statistics update
**flag:message** - Message flagged for review

### Client → Server

**join:cafe** - Join cafe room for updates
**moderate:message** - Execute moderation action on message
**moderate:user** - Execute moderation action on user

## Database Schema

See `database/schema.sql` for the complete schema. Key tables:

- **cafes** - Cafe information
- **users** - Cafe customers
- **moderators** - Cafe staff with admin access
- **messages** - User messages
- **moderation_actions** - Audit log of all moderation actions
- **cafe_analytics** - Daily aggregated statistics
- **agent_queries** - AI agent query logs
- **agent_config** - AI agent configuration per cafe
- **cafe_events** - Cafe events

## Security Considerations

1. **Authentication**: All routes except login require JWT authentication
2. **Password Hashing**: bcrypt with salt rounds of 10
3. **SQL Injection**: Parameterized queries using pg library
4. **CORS**: Configured to allow specific origins only

## License

MIT License
