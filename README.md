# Brew Me In

Real-time location-based social chat application for coffee shops and cafes.

## Component 3: Rate Limiting & Spam Prevention

This implementation provides comprehensive rate limiting and spam detection for the Brew Me In platform.

## Architecture

### Tech Stack
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL (user data) + Redis (rate limiting & caching)
- **Real-time**: Socket.io (planned)
- **AI Agent**: Anthropic Claude API (planned)

### Features Implemented

#### ✅ Rate Limiting
- **Token Bucket Algorithm** for efficient rate limiting
- **Message Rate Limits**:
  - Free users: 30 messages/hour with 30s cooldown
  - Badge holders: 60 messages/hour with 15s cooldown
- **Agent Query Limits**:
  - 2 queries per user session
  - Global 2-minute cooldown between ANY agent queries
- **Poke Limits**: 5 pokes per 24 hours
- **Redis-backed** for distributed rate limiting

#### ✅ Spam Detection
Heuristic-based spam detection with multiple checks:
- **Duplicate Message Detection**: Same content within 5 minutes
- **Excessive Caps**: >50% uppercase characters
- **URL Spam**: >2 URLs in a single message
- **Repeated Characters**: Patterns like "aaaaaaa"
- **Profanity Filter**: Configurable word list

#### ✅ Auto-Moderation
- **Soft Warning**: Toast notification for minor violations
- **Hard Block**: Message rejection for spam
- **24-Hour Mute**: Automatic mute for severe violations

## Project Structure

```
brew_me_in/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration files
│   │   │   ├── env.ts       # Environment validation (Zod)
│   │   │   ├── redis.ts     # Redis client singleton
│   │   │   └── logger.ts    # Winston logger
│   │   ├── types/           # TypeScript interfaces
│   │   │   ├── rateLimit.ts # Rate limit types
│   │   │   └── api.ts       # API response types
│   │   ├── services/        # Business logic
│   │   │   ├── rateLimitService.ts    # Token bucket implementation
│   │   │   └── spamDetectionService.ts # Spam heuristics
│   │   ├── middleware/      # Express middleware
│   │   │   ├── rateLimitMiddleware.ts # Route protection
│   │   │   └── errorHandler.ts        # Error handling
│   │   ├── controllers/     # Request handlers
│   │   │   └── rateLimitController.ts # API endpoints
│   │   ├── routes/          # Route definitions
│   │   │   └── rateLimitRoutes.ts
│   │   ├── utils/           # Utilities
│   │   │   └── apiResponse.ts # Response formatting
│   │   ├── server.ts        # Express app setup
│   │   └── index.ts         # Entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 18+
- Redis 6+
- PostgreSQL 14+ (for future components)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd brew_me_in
```

2. **Install backend dependencies**
```bash
cd backend
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start Redis** (using Docker)
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

5. **Run development server**
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
http://localhost:3000/api/v1
```

### Endpoints

#### Rate Limit Status
```http
GET /api/v1/ratelimit/status?userId=user123&userTier=free&sessionId=session1
```

**Response:**
```json
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
```

**Response:**
```json
{
  "success": true,
  "data": {
    "allowed": true,
    "remaining": 29,
    "resetAt": "2024-01-20T10:00:00.000Z"
  }
}
```

#### Consume Rate Limit
```http
POST /api/v1/ratelimit/consume
Content-Type: application/json

{
  "resource": "message",
  "userId": "user123",
  "userTier": "free"
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
```

**Response:**
```json
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

## Configuration

### Environment Variables

See `.env.example` for all available configuration options.

Key configurations:
- **Rate Limits**: Customize counts, windows, and cooldowns
- **Spam Detection**: Toggle features and set thresholds
- **Redis**: Connection settings
- **Logging**: Level and format

### Rate Limit Configuration

Edit `backend/src/config/env.ts` to modify rate limit rules:

```typescript
export const config = {
  rateLimit: {
    message: {
      free: {
        count: 30,        // messages per window
        window: 3600,     // seconds
        cooldown: 30,     // seconds between messages
      },
      badgeHolder: {
        count: 60,
        window: 3600,
        cooldown: 15,
      },
    },
    // ...
  },
};
```

## Redis Key Schema

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

## Implementation Details

### Token Bucket Algorithm

The rate limiting uses a **token bucket** algorithm:

1. Each user has a bucket with a fixed capacity (e.g., 30 tokens)
2. Each action consumes one token
3. Tokens refill when the window expires
4. Additional cooldown enforced between actions

### Spam Detection Flow

1. Check if user is muted (immediate rejection)
2. Run parallel spam checks:
   - Duplicate message detection
   - Excessive caps detection
   - URL spam detection
   - Repeated character detection
   - Profanity filter
3. Calculate violation severity
4. Determine action (allow/warn/block/mute)
5. Execute auto-moderation if needed

### Fail-Safe Design

Both rate limiting and spam detection **fail open**:
- If Redis is down, requests are allowed
- If spam detection fails, messages go through
- Errors are logged but don't block users

## Logging

Structured JSON logging with Winston:

```json
{
  "level": "warn",
  "message": "Message rate limit exceeded",
  "userId": "user123",
  "userTier": "free",
  "reason": "Cooldown active. Wait 15s",
  "timestamp": "2024-01-20 09:00:00"
}
```

## Future Enhancements

- [ ] PostgreSQL integration for persistent user data
- [ ] WebSocket integration for real-time updates
- [ ] JWT authentication
- [ ] User badge system
- [ ] Machine learning spam detection
- [ ] Distributed rate limiting across multiple servers
- [ ] Admin dashboard for moderation
- [ ] Analytics and reporting

## License

ISC

## Contributing

Please follow the existing code style and add tests for new features.
