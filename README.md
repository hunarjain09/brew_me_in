# brew_me_in

A location-based social networking app for coffee shops, enabling temporary connections and AI-powered conversations between cafe visitors.

## Overview

brew_me_in creates ephemeral social experiences within coffee shops by:
- Generating temporary usernames for customers upon purchase (24h validity)
- Enabling real-time chat with AI agent assistance
- Rewarding regular customers with badges and perks
- Validating physical presence through WiFi/geofencing
- Preventing spam and abuse through intelligent rate limiting
- Interest-based matching and poke system for 1:1 connections
- Privacy-first direct messaging for matched users

## Implementation Status

- **Component 1 (Auth & User Management)**: ✅ IMPLEMENTED
- **Component 2 (Real-time Chat)**: ✅ IMPLEMENTED
- **Component 3 (Rate Limiting & Spam Prevention)**: ✅ IMPLEMENTED
- **Component 4 (Interest Matching & Poke System)**: ✅ IMPLEMENTED
- **Component 5 (AI Agent Integration)**: ✅ IMPLEMENTED
- **Component 6 (Admin Dashboard)**: 🚧 PLANNED
- **Component 7 (Network Validation)**: ✅ IMPLEMENTED
- **Component 8 (Background Jobs)**: ✅ IMPLEMENTED

## Tech Stack

### Backend
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL 14+ (user data, chat history)
- **Cache**: Redis 7+ (sessions, rate limiting, real-time)
- **Real-time**: Socket.io (WebSocket connections)
- **AI**: Anthropic Claude API (Claude Sonnet 4.5)
- **Authentication**: JWT tokens
- **Logging**: Winston (structured JSON logs)
- **Validation**: Zod schemas
- **Job Scheduling**: node-cron (background tasks)

### Frontend (Planned)
- React Native (iOS/Android)
- React Web
- Socket.io Client

## Project Structure

```
brew_me_in/
├── backend/
│   ├── src/
│   │   ├── config/         # Configuration management
│   │   │   ├── index.ts    # Main config
│   │   │   ├── env.ts      # Environment validation (Zod)
│   │   │   ├── logger.ts   # Winston logger
│   │   │   └── redis.ts    # Redis client singleton (Component 3)
│   │   ├── controllers/    # Request handlers
│   │   │   ├── authController.ts
│   │   │   ├── userController.ts
│   │   │   ├── badgeController.ts
│   │   │   └── rateLimitController.ts  # Component 3
│   │   ├── db/             # Database connections and schemas
│   │   │   ├── connection.ts
│   │   │   ├── redis.ts
│   │   │   ├── schema.sql
│   │   │   └── migrate.ts
│   │   ├── middleware/     # Express middleware
│   │   │   ├── auth.ts
│   │   │   ├── errorHandler.ts         # Component 3
│   │   │   └── rateLimitMiddleware.ts  # Component 3
│   │   ├── models/         # Data models (business logic)
│   │   │   ├── User.ts
│   │   │   ├── Badge.ts
│   │   │   ├── Tip.ts
│   │   │   ├── JoinToken.ts
│   │   │   └── Cafe.ts
│   │   ├── routes/         # API routes
│   │   ├── scheduler/     # Background jobs & cron tasks (Component 8)
│   │   │   ├── index.ts              # Main scheduler orchestrator
│   │   │   └── jobs/
│   │   │       ├── expireUsers.ts    # User expiration job
│   │   │       ├── expireBadges.ts   # Badge expiration job
│   │   │       ├── calculateBadges.ts # Badge calculation job
│   │   │       ├── expirePokes.ts    # Poke cleanup job
│   │   │       ├── aggregateAnalytics.ts # Analytics job
│   │   │       └── proactiveMessages.ts  # AI message job
│   │   │   ├── authRoutes.ts
│   │   │   ├── userRoutes.ts
│   │   │   ├── badgeRoutes.ts
│   │   │   ├── rateLimitRoutes.ts      # Component 3
│   │   │   └── index.ts
│   │   ├── services/       # Business logic services
│   │   │   ├── claude-agent.service.ts  # Component 5
│   │   │   ├── prompt-builder.service.ts # Component 5
│   │   │   ├── redis-cache.service.ts   # Component 5
│   │   │   ├── rateLimitService.ts      # Component 3
│   │   │   └── spamDetectionService.ts  # Component 3
│   │   ├── types/          # TypeScript types
│   │   │   ├── index.ts
│   │   │   ├── api.ts                  # Component 3
│   │   │   └── rateLimit.ts            # Component 3
│   │   ├── utils/          # Utilities (JWT, validation)
│   │   │   ├── jwt.ts
│   │   │   ├── networkValidation.ts
│   │   │   └── apiResponse.ts          # Component 3
│   │   ├── app.ts          # Express app setup
│   │   └── index.ts        # Server entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── ARCHITECTURE.md          # Detailed architecture docs
├── Claude.md                # AI agent development guide
├── .gitignore
└── README.md
```

## Features

### 1. User Management & Authentication (Component 1)
- **Temporary Usernames**: 24-hour session-based usernames
- **Barista Portal**: Receipt-to-username mapping
- **Network Validation**: WiFi SSID + Geofencing fallback
- **JWT Authentication**: Access and refresh tokens
- **Session Management**: Automatic expiration after 24 hours

### 2. Badge System (Component 1)
- **Criteria**: 5 tips within 7 days
- **Duration**: 30-day badge validity
- **Perks**: Priority features, extended sessions, reduced rate limits
- **Tracking**: Automatic tip counting and badge assignment
- **Eligibility**: Real-time badge status checking

### 3. Real-time Chat (Component 2)
- **WebSocket Communication**: Socket.io for bidirectional real-time messaging
- **Message Persistence**: PostgreSQL storage with soft deletion
- **Message Caching**: Redis cache of last 100 messages per cafe
- **User Presence**: Real-time tracking of online users in each cafe
- **Typing Indicators**: Live typing status notifications
- **System Messages**: Join/leave notifications
- **Topic Extraction**: Automatic detection of trending conversation topics
- **Message History**: REST API for retrieving past messages
- **Room Management**: Automatic cafe room joining/leaving

### 4. Rate Limiting & Spam Prevention (Component 3)

#### Rate Limiting
- **Token Bucket Algorithm** for efficient, distributed rate limiting
- **Message Limits**:
  - Free users: 30 messages/hour with 30-second cooldown
  - Badge holders: 60 messages/hour with 15-second cooldown
- **Agent Query Limits**:
  - 2 queries per user session
  - Global 2-minute cooldown between ANY agent queries
- **Poke Limits**: 5 pokes per 24 hours
- **Redis-backed** for distributed rate limiting

#### Spam Detection
Heuristic-based spam detection with multiple checks:
- **Duplicate Message Detection**: Same content within 5 minutes
- **Excessive Caps**: >50% uppercase characters
- **URL Spam**: >2 URLs in a single message
- **Repeated Characters**: Patterns like "aaaaaaa"
- **Profanity Filter**: Configurable word list

#### Auto-Moderation
- **Soft Warning**: Toast notification for minor violations
- **Hard Block**: Message rejection for spam
- **24-Hour Mute**: Automatic mute for severe violations

### 5. Interest Matching & Poke System (Component 4)

#### Interest-Based Discovery
- **Intelligent Matching**: Find users with shared interests in the same cafe
- **Priority Sorting**: Users with multiple shared interests ranked higher
- **Privacy Filters**: Excludes poke-disabled users automatically
- **Interest Management**: Add/remove individual interests or bulk update

#### Poke System
- **Privacy-First Design**: Can't see who poked you until you poke back
- **Mutual Reveal**: Only when both users poke each other, identities are revealed
- **Rate Limited**: 10 pokes per hour (configurable)
- **Auto-Expiration**: Pokes expire after 24 hours
- **Status Tracking**: pending, matched, declined, expired
- **Match Creation**: Mutual pokes automatically create DM channels

#### Direct Messaging
- **1:1 Conversations**: Private channels for matched users
- **Message Persistence**: Full message history with timestamps
- **Soft Deletion**: Message deletion support
- **No Rate Limits**: Unlimited messaging within matched channels
- **Auto-Updated**: Last message timestamp tracked automatically

#### Background Jobs
- **Poke Expiration**: Runs every 5 minutes to expire old pokes
- **Automatic Cleanup**: Cleans up pending pokes older than 24 hours

#### Real-Time Notifications
- **Socket.IO Integration**: Real-time poke and message notifications
- **Event Types**:
  - `poke_received` - Someone poked you
  - `poke_matched` - Mutual match, DM channel created
  - `dm_message` - New direct message received


### 6. AI Agent Integration (Component 5)
- **Claude Sonnet 4.5**: Latest Anthropic AI model
- **Contextual Responses**: Agent aware of cafe context, popular drinks, peak hours
- **Personality System**: Configurable per-cafe personalities (friendly, professional, quirky)
- **Rate Limiting**: 2 queries per user session, 2-minute global cooldown
- **Smart Caching**: Common questions cached in Redis (1-hour TTL)
- **Prompt Engineering**: Dynamic system prompts with cafe-specific context
- **Error Handling**: Graceful fallbacks for API failures
- **Socket.IO Integration**: Real-time agent responses in chat

### 7. Background Jobs & Scheduled Tasks (Component 8)

Automated scheduler agent with 6 comprehensive background jobs:

#### Scheduled Jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| **expireUsers** | Every hour (`0 * * * *`) | Expires inactive users, clears Redis cache, updates café statistics |
| **expireBadges** | Daily at midnight (`0 0 * * *`) | Expires time-limited badges (Early Bird, Night Owl, etc.) |
| **calculateBadges** | Daily at 12:05 AM (`5 0 * * *`) | Awards new badges based on user behavior patterns |
| **expirePokes** | Every 5 minutes (`*/5 * * * *`) | Cleans up expired poke interactions (24h expiration) |
| **aggregateAnalytics** | Every hour at :05 (`5 * * * *`) | Aggregates user activity metrics per café |
| **proactiveMessages** | Every 2 minutes (`*/2 * * * *`) | Generates AI-powered contextual messages |

#### Badge Types Awarded
- **Early Bird**: Users who check in before 8 AM (7-day validity)
- **Night Owl**: Users who check in after 10 PM (7-day validity)
- **Social Butterfly**: Users with 10+ pokes in the last week (30-day validity)
- **Frequent Visitor**: Users with 5+ tips in the last month (60-day validity)

#### Job Features
- **Comprehensive Error Handling**: Winston logging with detailed execution traces
- **Automatic Cache Invalidation**: Redis cache updates on data changes
- **Graceful Degradation**: Jobs handle missing tables/features gracefully
- **Rate Limiting**: Proactive messages rate-limited to prevent spam
- **Table Auto-Creation**: Creates `cafe_analytics` and `agent_messages` tables as needed
- **Manual Triggers**: Admin API endpoints for testing individual jobs

#### Scheduler API Endpoints
```http
# Health Check (includes scheduler status)
GET /health

# Scheduler Status
GET /api/scheduler/status
Response: { isRunning: boolean, jobCount: number, jobs: string[] }

# Manual Job Trigger (Testing/Admin)
POST /api/scheduler/trigger/:jobName
Available jobs: expireUsers, expireBadges, calculateBadges, expirePokes, aggregateAnalytics, proactiveMessages
```

#### NPM Scripts
```bash
npm run scheduler  # Run scheduler standalone (for testing)
npm run dev        # Run full app with scheduler enabled
```

#### Configuration
```env
ENABLE_SCHEDULER=true              # Enable/disable scheduler
ENABLE_PROACTIVE_MESSAGES=true     # Enable AI proactive messages
LOG_LEVEL=info                     # Logging verbosity
```

### 8. Security Features
- Rate limiting on all endpoints
- JWT token rotation
- Network-based authentication
- SQL injection prevention (parameterized queries)
- XSS protection via Helmet.js
- CORS configuration
- Input validation with Zod schemas

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
   - Rate limit settings
   - Spam detection thresholds

4. **Set up database**

   Create PostgreSQL database:
   ```bash
   createdb brew_me_in
   ```

   Run migrations:
   ```bash
   npm run migrate
   # Or manually: psql brew_me_in < src/db/schema.sql
   ```

5. **Start Redis** (if not already running)
   ```bash
   redis-server
   # Or using Docker:
   docker run -d -p 6379:6379 redis:7-alpine
   ```

6. **Start development server**
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

### Base URL
```
http://localhost:3000/api
```

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

### Rate Limiting Endpoints (Component 3)

#### Get Rate Limit Status
```http
GET /api/v1/ratelimit/status?userId=user123&userTier=free&sessionId=session1

Response:
{
  "success": true,
  "data": {
    "message": {
      "allowed": true,
      "remaining": 28,
      "resetAt": "2024-01-20T10:00:00.000Z",
      "cooldown": 30
    },
    "agent": {
      "personal": {
        "allowed": true,
        "remaining": 2,
        "resetAt": "2024-01-20T10:00:00.000Z"
      },
      "global": {
        "allowed": true,
        "nextAvailable": "2024-01-20T09:00:00.000Z"
      }
    },
    "poke": {
      "allowed": true,
      "remaining": 5,
      "resetAt": "2024-01-21T09:00:00.000Z"
    }
  }
}
```

#### Check Rate Limit
```http
POST /api/v1/ratelimit/check
Content-Type: application/json

{
  "resource": "message",
  "userId": "user123",
  "userTier": "free"
}

Response:
{
  "success": true,
  "data": {
    "allowed": true,
    "remaining": 29,
    "resetAt": "2024-01-20T10:00:00.000Z"
  }
}
```

#### Check Spam
```http
POST /api/v1/spam/check
Content-Type: application/json

{
  "content": "Hello everyone!",
  "userId": "user123",
  "cafeId": "cafe456"
}

Response:
{
  "success": true,
  "data": {
    "isSpam": false,
    "violations": [],
    "action": "allow"
  }
}
```

#### Get Mute Info
```http
GET /api/v1/spam/mute/user123
```

#### Unmute User (Admin)
```http
DELETE /api/v1/spam/mute/user123
```

#### Reset Rate Limit (Admin)
```http
POST /api/v1/ratelimit/reset
Content-Type: application/json

{
  "userId": "user123",
  "resource": "message"
}
```

### Health Check
```http
GET /api/health

Response:
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected"
}
```

---

### Component 4: Interest Matching & Poke System

#### Discover Users with Shared Interests

```http
GET /api/matching/discover?cafeId=uuid&interests=coffee,books&limit=20&offset=0
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "userId": "uuid",
      "username": "HappyOtter42",
      "sharedInterests": ["coffee", "books"],
      "totalSharedInterests": 2
    }
  ],
  "count": 1
}
```

#### Manage User Interests

```http
# Get interests
GET /api/matching/interests
Authorization: Bearer <token>

# Set all interests (replaces existing)
POST /api/matching/interests
Authorization: Bearer <token>
Content-Type: application/json

{
  "interests": ["coffee", "books", "music"]
}

# Add single interest
POST /api/matching/interests/add
Authorization: Bearer <token>
Content-Type: application/json

{
  "interest": "hiking"
}

# Remove single interest
POST /api/matching/interests/remove
Authorization: Bearer <token>
Content-Type: application/json

{
  "interest": "hiking"
}
```

#### Send Poke

```http
POST /api/pokes/send
Authorization: Bearer <token>
Content-Type: application/json

{
  "toUserId": "uuid",
  "sharedInterest": "coffee"
}

Response:
{
  "success": true,
  "data": {
    "id": "poke-uuid",
    "fromUserId": "sender-uuid",
    "toUserId": "recipient-uuid",
    "sharedInterest": "coffee",
    "status": "pending",
    "createdAt": "2025-11-19T10:00:00.000Z",
    "expiresAt": "2025-11-20T10:00:00.000Z"
  },
  "message": "Poke sent successfully"
}

# Errors:
# - 404: User not found or has pokes disabled
# - 409: Pending poke already exists
# - 429: Rate limit exceeded (10 pokes/hour)
```

#### Respond to Poke

```http
POST /api/pokes/respond
Authorization: Bearer <token>
Content-Type: application/json

{
  "pokeId": "uuid",
  "action": "accept"  // or "decline"
}

# Response when matched:
{
  "success": true,
  "data": {
    "poke": { ... },
    "matched": true,
    "channelId": "dm-channel-uuid"
  },
  "message": "It's a match! DM channel created"
}
```

#### Get Pokes

```http
# Get incoming pokes
GET /api/pokes/pending
Authorization: Bearer <token>

# Get outgoing pokes
GET /api/pokes/sent
Authorization: Bearer <token>
```

#### Direct Messaging

```http
# Get all DM channels
GET /api/dm/channels
Authorization: Bearer <token>

# Get messages from a channel
GET /api/dm/:channelId/messages?limit=50&offset=0
Authorization: Bearer <token>

# Send message
POST /api/dm/:channelId/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Hey! Love coffee too!"
}

# Delete message
DELETE /api/dm/messages/:messageId
Authorization: Bearer <token>
```

---

## Middleware Usage

### Protect Message Routes
```typescript
import { protectMessage } from './middleware/rateLimitMiddleware';

router.post('/messages', protectMessage(), async (req, res) => {
  // Your message handler
});
```

### Protect Agent Routes
```typescript
import { rateLimitAgent } from './middleware/rateLimitMiddleware';

router.post('/agent/query', rateLimitAgent(), async (req, res) => {
  // Your agent query handler
});
```

### Protect Poke Routes
```typescript
import { rateLimitPoke } from './middleware/rateLimitMiddleware';

router.post('/pokes', rateLimitPoke(), async (req, res) => {
  // Your poke handler
});
```

## Database Schema

### Core Tables (Component 1)
- `cafes` - Cafe information and WiFi networks
- `users` - Temporary user accounts (24h expiration)
- `badges` - User badge status and eligibility
- `tips` - Tip tracking for badge system
- `join_tokens` - Barista-generated invitation tokens
- `refresh_tokens` - JWT refresh token storage

### Chat Tables (Component 2)
- `messages` - Real-time chat messages with soft deletion

### Interest Matching Tables (Component 4)
- `user_interests` - User interest mappings for matching
- `pokes` - Poke records with status and 24h expiration
- `dm_channels` - Private direct message channels for matched users
- `dm_messages` - DM message history

### Redis Keys (Component 3)
```
# Rate Limiting
ratelimit:message:{userId}           -> remaining count (EXPIRE: window)
ratelimit:message:{userId}:last      -> last message timestamp
ratelimit:agent:global               -> last agent query timestamp
ratelimit:agent:{userId}:{sessionId} -> session query count
ratelimit:poke:{userId}:count        -> poke count (EXPIRE: 24h)

# Spam Detection
spam:duplicate:{userId}              -> last message content
spam:mute:{userId}                   -> mute record JSON (EXPIRE: 24h)
```

### Automatic Cleanup
Database functions automatically clean up:
- Expired users (24h sessions)
- Expired join tokens (15min validity)
- Expired badges (30 days)
- Revoked refresh tokens
- Old chat messages (7 days) - Component 2
- Expired pokes (24 hours) - Component 4

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

# Rate Limiting
RATE_LIMIT_MESSAGE_FREE_COUNT=30
RATE_LIMIT_MESSAGE_BADGE_COUNT=60
RATE_LIMIT_AGENT_PERSONAL_COUNT=2
RATE_LIMIT_AGENT_GLOBAL_COOLDOWN=120
RATE_LIMIT_POKE_COUNT=5

# Spam Detection
SPAM_DETECTION_ENABLED=true
SPAM_MAX_CAPS_PERCENTAGE=50
SPAM_MAX_URLS=2
SPAM_MUTE_DURATION=86400

# Badge Settings
BADGE_TIP_THRESHOLD=5
BADGE_TIP_WINDOW_DAYS=7
BADGE_DURATION_DAYS=30

# User Settings
USER_SESSION_DURATION_HOURS=24
```

## Testing

### Manual Testing with curl

**Check rate limit status:**
```bash
curl "http://localhost:3000/api/v1/ratelimit/status?userId=test1&userTier=free"
```

**Send a message (check rate limit):**
```bash
curl -X POST http://localhost:3000/api/v1/ratelimit/consume \
  -H "Content-Type: application/json" \
  -d '{"resource":"message","userId":"test1","userTier":"free"}'
```

**Check for spam:**
```bash
curl -X POST http://localhost:3000/api/v1/spam/check \
  -H "Content-Type: application/json" \
  -d '{"content":"HELLO THIS IS SPAM!!!","userId":"test1"}'
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
- Distributed rate limiting (token bucket algorithm)
- Real-time pub/sub for Socket.io scaling (future)
- Spam detection caching

### Why JWT?
- Stateless authentication
- Mobile-friendly
- Easy token rotation

### Network Validation Strategy
1. **Primary**: WiFi SSID matching (most reliable)
2. **Fallback**: GPS geofencing (when WiFi unavailable)
3. **Radius**: Configurable per-cafe (default 100m)

### Rate Limiting Strategy (Component 3)
- **Token Bucket Algorithm**: Efficient, distributed
- **Fail-Safe Design**: Fail open if Redis is down
- **User-Tier Aware**: Badge holders get higher limits
- **Multi-Resource**: Separate limits for messages, agent queries, pokes

## Future Enhancements

- [x] ~~Socket.io real-time chat implementation (Component 2)~~ ✅ **DONE**
- [x] ~~Interest matching & poke system (Component 4)~~ ✅ **DONE**
- [ ] Claude AI agent integration (Component 5)
- [ ] React Native mobile apps
- [ ] Admin dashboard for cafe owners (Component 6)
- [ ] Machine learning spam detection (enhance Component 3)
- [ ] Analytics and insights
- [ ] Multi-language support
- [ ] Group chat rooms within cafes
- [ ] Photo sharing in DMs

## Documentation

- **README.md** - This file (user guide)
- **ARCHITECTURE.md** - Detailed technical documentation
- **Claude.md** - AI agent development guide
- **backend/src/db/schema.sql** - Complete database schema

## License

MIT

## Contributing

This is a private project. For questions or suggestions, please contact the development team.

---

**Last Updated**: 2025-11-19
**Version**: 0.5.0 (Components 1, 2, 3, 4, 5 Implemented)

### 5. AI Agent Integration (Component 5)

#### Claude API Integration
- **Powered by Claude Sonnet 4.5**: Advanced AI responses
- **6 Personality Types**: Bartender, Quirky, Historian, Sarcastic, Professional, Custom
- **Context-Aware**: Agent knows cafe stats, popular orders, peak hours, community interests
- **Streaming Responses**: Real-time response streaming via Socket.IO
- **Smart Caching**: Redis-based caching with 1-hour TTL
- **Rate Limiting**: 2-second global cooldown + 100 queries/day per user
- **Fallback Handling**: Graceful degradation when API unavailable
- **Query Analytics**: Track popular questions, response times, cache hit rates

#### AI Personality Types
1. **Bartender** - Warm, attentive, professional
2. **Quirky** - Playful, enthusiastic, frequent emojis
3. **Historian** - Educational, shares coffee facts
4. **Sarcastic** - Witty, dry humor
5. **Professional** - Efficient, direct
6. **Custom** - User-defined personality with custom prompt

#### Caching Strategy
- **Query Cache**: `agent:cache:{cafeId}:{questionHash}` (1h TTL)
- **Analytics**: Total queries, response times, cache hits, popular questions
- **Pre-generation**: Common questions pre-cached for instant responses

#### Socket.IO Events (Namespace: `/agent`)
- `query:stream` - Start streaming query
- `cafe:join` - Join cafe room for proactive messages
- `cafe:leave` - Leave cafe room
- Listeners: `query:start`, `query:chunk`, `query:complete`, `query:error`, `proactive:message`
