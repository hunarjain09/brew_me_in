# Claude.md - AI Agent Guide for brew_me_in

## Project Overview

**brew_me_in** is a location-based, ephemeral social networking platform for coffee shops that creates temporary, AI-enhanced social experiences for cafe visitors.

### Core Concept
- Customers receive temporary usernames (24h validity) upon purchase
- Users join real-time cafe chats validated by physical presence (WiFi/GPS)
- AI agent (Claude) facilitates conversations and answers questions
- Regular customers earn badges (5 tips in 7 days → 30-day badge with perks)
- Interest-based matching enables 1:1 connections via "poke" system

### Current Status
- **Component 1 (Auth & User Management)**: ✅ IMPLEMENTED
- **Component 2 (Real-time Chat)**: 🚧 PLANNED
- **Component 3 (Rate Limiting)**: 🚧 PLANNED
- **Component 4 (Interest Matching)**: 🚧 PLANNED
- **Component 5 (AI Agent Integration)**: 🚧 PLANNED
- **Component 6 (Admin Dashboard)**: 🚧 PLANNED
- **Component 7 (Network Validation)**: ✅ IMPLEMENTED (basic version)
- **Component 8 (Background Jobs)**: 🚧 PLANNED

---

## Quick Start for AI Agents

### Understanding the Codebase

**Project Structure:**
```
brew_me_in/
├── backend/                  # Node.js + TypeScript backend
│   ├── src/
│   │   ├── config/          # Environment configuration
│   │   ├── controllers/     # HTTP request handlers (thin layer)
│   │   ├── db/              # Database connection, schema, migrations
│   │   ├── middleware/      # Auth, validation, rate limiting
│   │   ├── models/          # Business logic & data access layer
│   │   ├── routes/          # Express route definitions
│   │   ├── types/           # TypeScript interfaces
│   │   ├── utils/           # Pure utility functions (JWT, validation)
│   │   ├── app.ts           # Express app setup
│   │   └── index.ts         # Server entry point
│   ├── package.json
│   └── tsconfig.json
├── ARCHITECTURE.md          # Detailed architecture documentation
├── README.md                # User-facing documentation
└── Claude.md                # This file (AI agent guide)
```

### Key Files to Know

**Configuration:**
- `backend/src/config/index.ts` - Environment variables, app configuration
- `backend/.env` - Environment-specific settings (not in repo)

**Database:**
- `backend/src/db/schema.sql` - Complete database schema with functions
- `backend/src/db/connection.ts` - PostgreSQL connection pool
- `backend/src/db/redis.ts` - Redis client configuration

**Core Models:**
- `backend/src/models/User.ts` - User management (create, find, expire)
- `backend/src/models/Badge.ts` - Badge eligibility and tracking
- `backend/src/models/Tip.ts` - Tip recording and counting
- `backend/src/models/JoinToken.ts` - Barista token generation
- `backend/src/models/Cafe.ts` - Cafe configuration

**Authentication Flow:**
- `backend/src/controllers/authController.ts` - Auth endpoints
- `backend/src/middleware/auth.ts` - JWT validation middleware
- `backend/src/utils/jwt.ts` - Token generation/verification
- `backend/src/utils/networkValidation.ts` - WiFi/GPS validation

---

## Tech Stack & Dependencies

### Backend
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL 14+ (primary data store)
- **Cache**: Redis 7+ (sessions, rate limiting, real-time)
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: Zod schemas
- **Security**: Helmet, CORS, express-rate-limit

### Future Dependencies (Not Yet Added)
- **Real-time**: Socket.io (Component 2)
- **AI**: @anthropic-ai/sdk (Component 5)
- **Background Jobs**: node-cron or BullMQ (Component 8)

---

## Architecture Patterns

### 1. MVC-ish Pattern (with Models as Business Logic Layer)

```
Request → Route → Middleware → Controller → Model → Database
                      ↓
                 Validation
                 Authentication
                 Rate Limiting
```

**Controllers** (`src/controllers/`):
- Handle HTTP requests/responses
- Thin layer that delegates to models
- No business logic, just orchestration
- Example: `authController.ts`

**Models** (`src/models/`):
- Contain all business logic
- Direct database access via `pg` queries
- Return typed data, not HTTP responses
- Reusable across different controllers
- Example: `User.ts`

**Middleware** (`src/middleware/`):
- Authentication (JWT validation)
- Request validation (Zod schemas)
- Rate limiting (Redis-backed)
- Error handling

### 2. Database Access Pattern

**Always use parameterized queries:**
```typescript
// ✅ CORRECT - Safe from SQL injection
const result = await db.query(
  'SELECT * FROM users WHERE id = $1',
  [userId]
);

// ❌ WRONG - Vulnerable to SQL injection
const result = await db.query(
  `SELECT * FROM users WHERE id = '${userId}'`
);
```

**Use PostgreSQL functions for complex operations:**
```sql
-- Example: Badge eligibility check (in schema.sql)
CREATE FUNCTION check_badge_eligibility(p_user_id UUID)
RETURNS TABLE(...) AS $$
  -- Complex logic here
$$ LANGUAGE plpgsql;
```

### 3. Configuration Management

**Environment Variables:**
```typescript
// src/config/index.ts
export const config = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET!,
  database: {
    host: process.env.DB_HOST || 'localhost',
    // ...
  }
};
```

**Never hardcode secrets** - always use environment variables.

### 4. Error Handling

**Use try-catch in controllers:**
```typescript
export const getUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
```

**Throw descriptive errors in models:**
```typescript
export class User {
  static async findById(id: string): Promise<User> {
    const result = await db.query(...);
    if (result.rows.length === 0) {
      throw new Error(`User not found: ${id}`);
    }
    return result.rows[0];
  }
}
```

---

## Component Development Guide

### Working on Component 2: Real-Time Chat

**Files to create:**
- `backend/src/socket/chatHandler.ts` - Socket.io event handlers
- `backend/src/models/Message.ts` - Message persistence
- `backend/src/models/ChatRoom.ts` - Room management
- `backend/src/controllers/chatController.ts` - REST endpoints for history

**Key considerations:**
- Use Redis for message buffering (last 100 messages per cafe)
- Implement message batching (collect 100ms worth, then broadcast)
- Track presence (online vs in-cafe) via Redis sets
- Persist messages to PostgreSQL asynchronously
- Implement topic extraction for "trending conversations"

**Database tables needed:**
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  cafe_id UUID REFERENCES cafes(id),
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Working on Component 3: Rate Limiting

**Files to modify:**
- `backend/src/middleware/rateLimit.ts` - Expand rate limiting logic
- Create: `backend/src/models/RateLimit.ts` - Custom rate limit checks

**Rate limit configurations:**
```typescript
const rateLimits = {
  message: {
    free: { count: 30, window: '1h', cooldown: 30 },
    badgeHolder: { count: 60, window: '1h', cooldown: 15 }
  },
  agent: {
    personal: { count: 2, window: 'session' },
    global: { cooldown: 120 } // 2 min between ANY agent query
  },
  poke: { count: 5, window: '24h' }
};
```

**Use Redis token bucket algorithm:**
```typescript
// Pseudo-code
async function checkRateLimit(userId: string, resource: string) {
  const key = `ratelimit:${resource}:${userId}`;
  const remaining = await redis.decr(key);
  if (remaining < 0) {
    return { allowed: false, resetAt: ... };
  }
  return { allowed: true, remaining };
}
```

### Working on Component 4: Interest Matching & Pokes

**Files to create:**
- `backend/src/models/Poke.ts` - Poke creation, matching
- `backend/src/models/DirectMessage.ts` - DM channel management
- `backend/src/controllers/matchingController.ts` - Discovery endpoint
- `backend/src/controllers/pokeController.ts` - Poke endpoints

**Database tables needed:**
```sql
CREATE TABLE user_interests (
  user_id UUID REFERENCES users(id),
  interest VARCHAR(50) NOT NULL,
  PRIMARY KEY (user_id, interest)
);

CREATE TABLE pokes (
  id UUID PRIMARY KEY,
  from_user_id UUID REFERENCES users(id),
  to_user_id UUID REFERENCES users(id),
  shared_interest VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);

CREATE TABLE dm_channels (
  id UUID PRIMARY KEY,
  user1_id UUID REFERENCES users(id),
  user2_id UUID REFERENCES users(id),
  cafe_id UUID REFERENCES cafes(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Key logic:**
```typescript
// Match algorithm: prioritize multiple shared interests
async function discoverMatches(userId: string, cafeId: string) {
  const userInterests = await getUserInterests(userId);

  // Find users in same cafe with shared interests
  const matches = await db.query(`
    SELECT u.id, u.username,
           COUNT(ui.interest) as shared_count,
           ARRAY_AGG(ui.interest) as shared_interests
    FROM users u
    JOIN user_interests ui ON u.id = ui.user_id
    WHERE u.cafe_id = $1
      AND u.id != $2
      AND ui.interest = ANY($3)
      AND u.poke_enabled = true
    GROUP BY u.id
    ORDER BY shared_count DESC
  `, [cafeId, userId, userInterests]);

  return matches.rows;
}
```

### Working on Component 5: AI Agent Integration

**Files to create:**
- `backend/src/services/claude.ts` - Claude API client
- `backend/src/models/AgentConfig.ts` - Per-cafe agent personality
- `backend/src/models/AgentQuery.ts` - Query logging
- `backend/src/controllers/agentController.ts` - Agent endpoints

**Example Claude integration:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function queryAgent(
  question: string,
  cafeContext: CafeContext,
  agentConfig: AgentConfig
): Promise<string> {
  const systemPrompt = buildSystemPrompt(agentConfig, cafeContext);

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: question
    }]
  });

  return message.content[0].text;
}

function buildSystemPrompt(
  config: AgentConfig,
  context: CafeContext
): string {
  return `You are the AI agent for ${context.cafeName}, a ${config.personality} virtual barista.

Personality: ${config.personality}

You have access to:
- Today's popular orders: ${context.orderStats}
- Peak hours: ${context.peakHours}
- Community interests: ${context.popularInterests}

Guidelines:
- Keep responses under 100 words
- Be helpful and engaging
- Reference cafe data when relevant
- Respect user privacy`;
}
```

**Rate limiting for agent queries:**
- Personal limit: 2 queries per session
- Global cooldown: 2 minutes between ANY agent query (prevents spam)
- Cache common questions in Redis (1-hour TTL)

### Working on Component 6: Moderator Dashboard

**Files to create:**
- `backend/src/models/Moderator.ts` - Moderator authentication
- `backend/src/models/ModerationAction.ts` - Moderation logging
- `backend/src/controllers/adminController.ts` - Admin endpoints
- `backend/src/socket/adminHandler.ts` - Real-time dashboard events

**Database tables needed:**
```sql
CREATE TABLE moderators (
  id UUID PRIMARY KEY,
  cafe_id UUID REFERENCES cafes(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL
);

CREATE TABLE moderation_actions (
  id UUID PRIMARY KEY,
  moderator_id UUID REFERENCES moderators(id),
  target_user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE cafe_analytics (
  cafe_id UUID REFERENCES cafes(id),
  date DATE NOT NULL,
  total_messages INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  peak_hour INTEGER,
  agent_queries INTEGER DEFAULT 0,
  PRIMARY KEY (cafe_id, date)
);
```

---

## Development Workflow

### Setting Up Development Environment

1. **Install dependencies:**
```bash
cd backend
npm install
```

2. **Set up PostgreSQL database:**
```bash
createdb brew_me_in
```

3. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your credentials
```

4. **Run migrations:**
```bash
npm run migrate
# This executes backend/src/db/schema.sql
```

5. **Start development server:**
```bash
npm run dev
# Server runs on http://localhost:3000
```

### Running Database Migrations

**Manual migration:**
```bash
psql brew_me_in < backend/src/db/schema.sql
```

**Or use the migrate script:**
```bash
cd backend
npm run migrate
```

### Testing API Endpoints

**Example: Generate username (barista)**
```bash
curl -X POST http://localhost:3000/api/auth/barista/generate-username \
  -H "Content-Type: application/json" \
  -d '{
    "cafeId": "123e4567-e89b-12d3-a456-426614174000",
    "receiptId": "RECEIPT-001"
  }'
```

**Example: Join cafe (customer)**
```bash
curl -X POST http://localhost:3000/api/auth/join \
  -H "Content-Type: application/json" \
  -d '{
    "username": "HappyOtter42",
    "joinToken": "token-from-barista",
    "cafeId": "123e4567-e89b-12d3-a456-426614174000",
    "wifiSsid": "CafeWiFi-Guest"
  }'
```

**Example: Get current user (authenticated)**
```bash
curl http://localhost:3000/api/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Debugging Tips

**Check database state:**
```sql
-- See active users
SELECT * FROM users WHERE expires_at > NOW();

-- Check badge eligibility
SELECT user_id, tips_in_period, earned_at
FROM badges
WHERE expires_at > NOW();

-- View recent tips
SELECT * FROM tips ORDER BY created_at DESC LIMIT 10;
```

**Check Redis state:**
```bash
redis-cli
> KEYS *                    # See all keys
> GET ratelimit:message:userId
> HGETALL user:userId:presence
```

**Common issues:**
- **Database connection error**: Check `DATABASE_URL` in `.env`
- **Redis connection error**: Ensure Redis is running (`redis-server`)
- **JWT validation failing**: Verify `JWT_SECRET` matches between token generation and validation
- **Rate limit not working**: Ensure Redis is accessible

---

## Code Conventions

### TypeScript Style

**Use interfaces for data structures:**
```typescript
interface User {
  id: string;
  username: string;
  cafeId: string;
  expiresAt: Date;
}
```

**Use type for unions:**
```typescript
type BadgeStatus = 'none' | 'active' | 'expired';
type MessageType = 'user' | 'agent' | 'system' | 'barista';
```

**Prefer async/await over promises:**
```typescript
// ✅ GOOD
async function getUser(id: string) {
  const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0];
}

// ❌ AVOID
function getUser(id: string) {
  return db.query('SELECT * FROM users WHERE id = $1', [id])
    .then(result => result.rows[0]);
}
```

### Naming Conventions

**Files:**
- Controllers: `authController.ts`, `userController.ts`
- Models: `User.ts`, `Badge.ts` (capitalized)
- Routes: `authRoutes.ts`, `userRoutes.ts`
- Middleware: `auth.ts`, `validation.ts`
- Utils: `jwt.ts`, `networkValidation.ts`

**Functions:**
- camelCase: `generateUsername()`, `checkBadgeEligibility()`
- Use descriptive verbs: `create`, `find`, `update`, `delete`, `check`, `validate`

**Variables:**
- camelCase: `userId`, `cafeId`, `joinToken`
- Use descriptive names, avoid abbreviations

**Database:**
- Tables: snake_case: `users`, `join_tokens`, `cafe_analytics`
- Columns: snake_case: `user_id`, `created_at`, `wifi_ssid`

### Error Handling

**Controller level:**
```typescript
export const someEndpoint = async (req: Request, res: Response) => {
  try {
    // Logic here
    res.json({ success: true });
  } catch (error) {
    console.error('Error in someEndpoint:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
```

**Model level:**
```typescript
export class SomeModel {
  static async someMethod(id: string) {
    const result = await db.query(...);

    if (!result.rows.length) {
      throw new Error(`Resource not found: ${id}`);
    }

    return result.rows[0];
  }
}
```

---

## Security Guidelines

### Authentication

**Always validate JWT tokens:**
```typescript
// middleware/auth.ts
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

### Input Validation

**Use Zod schemas:**
```typescript
import { z } from 'zod';

const joinCafeSchema = z.object({
  username: z.string().min(3).max(50),
  joinToken: z.string().min(1),
  cafeId: z.string().uuid(),
  wifiSsid: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

// In middleware/validation.ts
export const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      res.status(400).json({ error: 'Validation failed', details: error });
    }
  };
};
```

### SQL Injection Prevention

**ALWAYS use parameterized queries:**
```typescript
// ✅ SAFE
const result = await db.query(
  'SELECT * FROM users WHERE username = $1 AND cafe_id = $2',
  [username, cafeId]
);

// ❌ DANGEROUS - NEVER DO THIS
const result = await db.query(
  `SELECT * FROM users WHERE username = '${username}'`
);
```

### Rate Limiting

**Apply appropriate limits:**
```typescript
// Different limits for different endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many login attempts'
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests'
});
```

---

## Testing Strategy (Future Implementation)

### Unit Tests
```typescript
// tests/models/User.test.ts
describe('User Model', () => {
  it('should create a user with valid data', async () => {
    const user = await User.create({
      username: 'TestUser',
      cafeId: 'cafe-id',
      receiptId: 'receipt-123'
    });

    expect(user.username).toBe('TestUser');
    expect(user.expiresAt).toBeInstanceOf(Date);
  });

  it('should throw error for duplicate username in same cafe', async () => {
    await expect(
      User.create({ username: 'TestUser', cafeId: 'cafe-id', receiptId: 'r2' })
    ).rejects.toThrow();
  });
});
```

### Integration Tests
```typescript
// tests/api/auth.test.ts
describe('POST /api/auth/join', () => {
  it('should create user with valid token and network', async () => {
    const response = await request(app)
      .post('/api/auth/join')
      .send({
        username: 'TestUser',
        joinToken: validToken,
        cafeId: cafeId,
        wifiSsid: 'CafeWiFi'
      });

    expect(response.status).toBe(201);
    expect(response.body.accessToken).toBeDefined();
  });
});
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] Environment variables configured (`.env` file)
- [ ] Database migrations run
- [ ] Redis connection verified
- [ ] TypeScript compilation successful (`npm run build`)
- [ ] No console.log statements (use proper logging)
- [ ] CORS origins configured correctly
- [ ] Rate limits configured appropriately
- [ ] SSL/TLS certificates installed

### Database
- [ ] Connection pooling configured (pgBouncer recommended)
- [ ] Indexes created (see schema.sql)
- [ ] Backup strategy implemented
- [ ] Cleanup cron jobs scheduled (hourly recommended)

### Monitoring
- [ ] Health check endpoint accessible (`/api/health`)
- [ ] Logging configured (Winston/Pino recommended)
- [ ] Error tracking (Sentry recommended)
- [ ] Database metrics monitored
- [ ] Redis metrics monitored

---

## FAQs for AI Agents

**Q: Where should I add a new API endpoint?**
1. Create/update route file in `src/routes/`
2. Create controller function in `src/controllers/`
3. Add business logic in `src/models/`
4. Add validation schema in controller or middleware
5. Register route in `src/routes/index.ts`

**Q: How do I add a new database table?**
1. Add CREATE TABLE statement to `src/db/schema.sql`
2. Create model class in `src/models/`
3. Add TypeScript interface in `src/types/index.ts`
4. Run migration: `npm run migrate`

**Q: How do I implement rate limiting for a new endpoint?**
1. Use existing rate limiters in `src/middleware/rateLimit.ts`
2. Or create custom rate limiter with Redis
3. Apply middleware to route:
   ```typescript
   router.post('/endpoint', rateLimiter, controller);
   ```

**Q: How do I test network validation locally?**
- Use the optional fields in `/api/auth/join`
- Pass `wifiSsid` matching the cafe's configured SSID
- Or pass `latitude`/`longitude` within the geofence radius
- For testing, you can temporarily disable validation or use mock data

**Q: Where are secrets stored?**
- Environment variables in `.env` file (not committed to git)
- Access via `process.env.VARIABLE_NAME`
- Configure in `src/config/index.ts`

**Q: How do I add a new Socket.io event?**
(When Component 2 is implemented)
1. Add handler in `src/socket/chatHandler.ts`
2. Register event listener in socket initialization
3. Document event format in comments
4. Add client-side listener documentation

**Q: How do I integrate with Claude API?**
(For Component 5)
1. Install: `npm install @anthropic-ai/sdk`
2. Create service: `src/services/claude.ts`
3. Add API key to `.env`: `ANTHROPIC_API_KEY=sk-...`
4. Implement rate limiting (2 min global cooldown)
5. Cache common queries in Redis

**Q: What's the difference between a controller and a model?**
- **Controller**: Handles HTTP (request/response), thin orchestration layer
- **Model**: Contains business logic, database access, reusable functions

---

## Useful Commands

### Development
```bash
# Start development server (with auto-reload)
npm run dev

# Build TypeScript
npm run build

# Start production server
npm start

# Run migrations
npm run migrate

# Lint code
npm run lint
```

### Database
```bash
# Connect to PostgreSQL
psql brew_me_in

# Run SQL file
psql brew_me_in < backend/src/db/schema.sql

# Backup database
pg_dump brew_me_in > backup.sql

# Restore database
psql brew_me_in < backup.sql
```

### Redis
```bash
# Start Redis server
redis-server

# Connect to Redis CLI
redis-cli

# Flush all data (development only!)
redis-cli FLUSHALL
```

### Git
```bash
# Checkout feature branch
git checkout -b claude/feature-name-[SESSION_ID]

# Commit changes
git add .
git commit -m "Implement feature X"

# Push to remote
git push -u origin claude/feature-name-[SESSION_ID]
```

---

## Key Principles

1. **Security First**: Always validate input, use parameterized queries, apply rate limits
2. **Type Safety**: Leverage TypeScript for compile-time error checking
3. **Separation of Concerns**: Controllers handle HTTP, models handle business logic
4. **Stateless API**: Use JWT tokens, design for horizontal scalability
5. **Privacy by Design**: 24-hour user sessions, minimal data retention
6. **Performance**: Use Redis for caching, indexes for queries, connection pooling
7. **Observability**: Log important events, track metrics, monitor health

---

## Resources

- **Main Documentation**: `README.md` (user guide)
- **Architecture**: `ARCHITECTURE.md` (technical deep-dive)
- **Database Schema**: `backend/src/db/schema.sql`
- **API Examples**: See README.md "API Documentation" section
- **Technical Plan**: See original implementation plan (8 components)

---

## Contact & Support

For questions or issues while developing:
1. Check existing documentation (`README.md`, `ARCHITECTURE.md`)
2. Review database schema (`backend/src/db/schema.sql`)
3. Examine similar implemented features (Component 1 is complete)
4. Consult the technical implementation plan for component details

---

**Last Updated**: 2025-11-19
**Project Version**: 0.1.0 (Component 1 Implemented)
**AI Agent Compatibility**: Claude Sonnet 4.5+
