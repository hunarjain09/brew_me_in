# brew_me_in

A location-based social networking app for coffee shops, enabling temporary connections and AI-powered conversations between cafe visitors.

## Overview

brew_me_in creates ephemeral social experiences within coffee shops by:
- Generating temporary usernames for customers upon purchase
- Enabling real-time chat with AI agent assistance
- Rewarding regular customers with badges and perks
- Validating physical presence through WiFi/geofencing
- Automating background jobs for user management and analytics

## Tech Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (user data, chat history)
- **Cache**: Redis (sessions, rate limiting)
- **Real-time**: Socket.io (WebSocket connections)
- **AI**: Anthropic Claude API
- **Authentication**: JWT tokens
- **Job Scheduling**: node-cron

### Frontend
- React Native (iOS/Android)
- React Web
- Socket.io Client

## Project Structure

```
brew_me_in/
├── backend/
│   ├── src/
│   │   ├── config/         # Configuration management
│   │   ├── controllers/    # Request handlers
│   │   ├── db/            # Database connections and schemas
│   │   ├── middleware/    # Express middleware
│   │   ├── models/        # Data models
│   │   ├── routes/        # API routes
│   │   ├── scheduler/     # Background jobs & cron tasks
│   │   ├── utils/         # Utilities (JWT, validation)
│   │   ├── types/         # TypeScript types
│   │   ├── app.ts         # Express app setup
│   │   └── index.ts       # Server entry point
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- npm or yarn

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration:
   - Database credentials
   - Redis connection
   - JWT secrets
   - Anthropic API key

4. **Set up database**

   Create PostgreSQL database:
   ```bash
   createdb brew_me_in
   ```

   Run migrations:
   ```bash
   npm run migrate
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3000`

### Production Build

```bash
npm run build
npm start
```

## API Documentation

### Authentication Endpoints

#### Generate Username (Barista)
```http
POST /api/auth/barista/generate-username
Content-Type: application/json

{
  "cafeId": "uuid",
  "receiptId": "string"
}

Response:
{
  "username": "HappyOtter42",
  "joinToken": "token-string",
  "expiresAt": "2024-01-01T12:00:00Z"
}
```

#### Join Cafe (Customer)
```http
POST /api/auth/join
Content-Type: application/json

{
  "username": "HappyOtter42",
  "joinToken": "token-string",
  "cafeId": "uuid",
  "wifiSsid": "CafeWiFi-Guest",  // Optional
  "latitude": 37.7749,            // Optional
  "longitude": -122.4194          // Optional
}

Response:
{
  "accessToken": "jwt-token",
  "refreshToken": "jwt-refresh-token",
  "user": { ... }
}
```

#### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "jwt-refresh-token"
}

Response:
{
  "accessToken": "new-jwt-token",
  "user": { ... }
}
```

### User Endpoints

All user endpoints require `Authorization: Bearer <token>` header.

#### Get Current User
```http
GET /api/users/me

Response:
{
  "user": {
    "id": "uuid",
    "username": "HappyOtter42",
    "cafeId": "uuid",
    "badgeStatus": "active",
    "tipCount": 7,
    ...
  }
}
```

#### Update Interests
```http
PUT /api/users/me/interests
Content-Type: application/json

{
  "interests": ["coffee", "tech", "music"]
}
```

#### Toggle Poke Feature
```http
PUT /api/users/me/poke-enabled
Content-Type: application/json

{
  "enabled": true
}
```

### Badge Endpoints

#### Record Tip
```http
POST /api/badges/record-tip
Content-Type: application/json

{
  "userId": "uuid",
  "amount": 5.00
}

Response:
{
  "tip": { ... },
  "eligibility": {
    "eligible": true,
    "tipsInWindow": 5,
    "tipsNeeded": 0
  },
  "badge": { ... }
}
```

#### Get Badge Status
```http
GET /api/badges/status
Authorization: Bearer <token>

Response:
{
  "hasBadge": true,
  "badgeStatus": "active",
  "eligibility": {
    "tipsInWindow": 7,
    "tipsNeeded": 0,
    "tipThreshold": 5,
    "windowDays": 7
  },
  "perks": ["Priority in chat", "Extended session", ...]
}
```

## Features

### 1. User Management & Authentication
- **Temporary Usernames**: 24-hour session-based usernames
- **Barista Portal**: Receipt-to-username mapping
- **Network Validation**: WiFi SSID + Geofencing fallback
- **JWT Authentication**: Access and refresh tokens

### 2. Badge System
- **Criteria**: 5 tips within 7 days
- **Duration**: 30-day badge validity
- **Perks**: Priority features, extended sessions
- **Tracking**: Automatic tip counting and badge assignment

### 3. Background Jobs & Scheduled Tasks

Automated scheduler agent handles the following background jobs:

#### Scheduled Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| expireUsers | `0 * * * *` | Every hour - Expires inactive users and clears cache |
| expireBadges | `0 0 * * *` | Daily at midnight - Expires time-limited badges |
| calculateBadges | `5 0 * * *` | Daily at 12:05 AM - Awards new badges (Early Bird, Night Owl, Social Butterfly, Frequent Visitor) |
| expirePokes | `*/5 * * * *` | Every 5 minutes - Cleans up expired poke interactions |
| aggregateAnalytics | `5 * * * *` | Every hour at :05 - Aggregates activity metrics per café |
| proactiveMessages | `*/2 * * * *` | Every 2 minutes - Sends AI-generated contextual messages |

#### Job Features
- Comprehensive error handling with Winston logging
- Automatic Redis cache invalidation
- Graceful shutdown support
- Rate limiting for proactive messages
- Detailed execution logging

#### Scheduler API Endpoints

```http
# Health Check (includes scheduler status)
GET /health

# Scheduler Status
GET /api/scheduler/status

# Manual Job Trigger (Testing/Admin)
POST /api/scheduler/trigger/:jobName
# Available jobs: expireUsers, expireBadges, calculateBadges, expirePokes, aggregateAnalytics, proactiveMessages
```

### 4. Security Features
- Rate limiting on all endpoints
- JWT token rotation
- Network-based authentication
- SQL injection prevention
- XSS protection via Helmet.js

## Database Schema

### Core Tables
- `cafes` - Cafe information and WiFi networks
- `users` - Temporary user accounts (24h expiration)
- `badges` - User badge status and eligibility
- `tips` - Tip tracking for badge system
- `join_tokens` - Barista-generated invitation tokens
- `refresh_tokens` - JWT refresh token storage
- `analytics` - Aggregated hourly metrics per café
- `agent_messages` - AI-generated proactive messages

### Automatic Cleanup
Database functions and scheduled jobs automatically clean up:
- Expired users (24h sessions) - via hourly job
- Expired join tokens (15min validity) - via database triggers
- Expired badges (30 days) - via daily job
- Expired pokes - via 5-minute job
- Revoked refresh tokens - via database cleanup functions

## Configuration

Key environment variables:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/brew_me_in

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-here
JWT_EXPIRES_IN=24h

# Badge Settings
BADGE_TIP_THRESHOLD=5
BADGE_TIP_WINDOW_DAYS=7
BADGE_DURATION_DAYS=30

# User Settings
USER_SESSION_DURATION_HOURS=24

# Scheduler
ENABLE_SCHEDULER=true
ENABLE_PROACTIVE_MESSAGES=true

# Logging
LOG_LEVEL=info
```

## Development Workflow

### Running Migrations
```bash
npm run migrate
```

### Development Mode
```bash
npm run dev
```

### Start Scheduler Only
```bash
npm run scheduler
```

### Building for Production
```bash
npm run build
```

### Linting
```bash
npm run lint
```

## Architecture Decisions

### Why PostgreSQL?
- ACID compliance for user/transaction data
- Complex queries for badge eligibility
- Reliable data integrity

### Why Redis?
- Fast session storage
- Distributed rate limiting
- Real-time pub/sub for Socket.io scaling
- Job scheduling and caching

### Why JWT?
- Stateless authentication
- Mobile-friendly
- Easy token rotation

### Why node-cron?
- Lightweight and reliable
- Easy cron syntax
- Good TypeScript support
- No additional dependencies needed

### Network Validation Strategy
1. **Primary**: WiFi SSID matching (most reliable)
2. **Fallback**: GPS geofencing (when WiFi unavailable)
3. **Radius**: Configurable per-cafe (default 100m)

## Monitoring

Monitor system health via:
1. `/health` endpoint - Overall system status including scheduler
2. `/api/scheduler/status` - Detailed scheduler and job status
3. Winston logs in `logs/` directory
4. Database analytics table for historical metrics

## Troubleshooting

### Scheduler Not Starting
- Check `ENABLE_SCHEDULER` environment variable
- Verify database and Redis connections
- Check logs in `logs/error.log`

### Jobs Not Running
- Verify scheduler is running: `GET /api/scheduler/status`
- Check cron schedule syntax
- Review job-specific logs

### Database Connection Issues
- Verify PostgreSQL is running
- Check `DATABASE_URL` configuration
- Ensure database schema is initialized

### Redis Connection Issues
- Verify Redis is running
- Check `REDIS_URL` configuration
- Review Redis logs

## Future Enhancements

- [ ] Socket.io real-time chat implementation (Component 2)
- [ ] Advanced rate limiting (Component 3)
- [ ] Interest matching & pokes (Component 4)
- [ ] Claude AI agent integration (Component 5)
- [ ] Moderator dashboard (Component 6)
- [ ] React Native mobile apps
- [ ] Admin dashboard for cafe owners
- [ ] Multi-language support

## License

MIT

## Contributing

This is a private project. For questions or suggestions, please contact the development team.
