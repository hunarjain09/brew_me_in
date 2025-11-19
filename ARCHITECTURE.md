# brew_me_in Architecture

## System Overview

brew_me_in is a location-based, ephemeral social networking platform for coffee shops. The system validates user presence, manages temporary accounts, and rewards regular customers.

## Core Components

### 1. Authentication & User Management
**Status**: ✅ Implemented (Component 1)

#### Workflow
```
Barista → Generate Username → Join Token (15min validity)
         ↓
Customer → Provides Username + Token → Location Validation → User Session (24h)
```

#### Key Features
- **Barista Portal**: Generates unique usernames tied to receipts
- **Join Tokens**: Short-lived (15min) tokens for secure user creation
- **Network Validation**: WiFi SSID (primary) + Geofencing (fallback)
- **Session Management**: 24-hour user sessions with automatic cleanup
- **JWT Authentication**: Access tokens (24h) + Refresh tokens (7d)

#### Database Tables
- `users` - Temporary user accounts
- `join_tokens` - Barista-generated invitation tokens
- `refresh_tokens` - JWT refresh token storage
- `cafes` - Cafe configuration and network info

### 2. Badge & Rewards System
**Status**: ✅ Implemented (Component 1)

#### Badge Eligibility
- **Requirement**: 5 tips within 7-day rolling window
- **Duration**: 30 days from earning
- **Perks**: Priority features, extended sessions, exclusive access

#### Workflow
```
Tip Recorded → Count Tips in Window → Check Threshold → Award Badge
                                                        ↓
                                              Badge (30 days validity)
```

#### Database Tables
- `tips` - Tip transaction history
- `badges` - User badge status and metadata

### 3. Network Validation System
**Status**: ✅ Implemented

#### Validation Methods

**Primary: WiFi SSID Matching**
```typescript
if (userWifiSsid === cafe.wifiSsid) {
  return { valid: true, method: 'wifi' };
}
```

**Fallback: Geofencing**
```typescript
const distance = haversineDistance(userLocation, cafeLocation);
if (distance <= cafe.geofenceRadius) {
  return { valid: true, method: 'geofence' };
}
```

#### Security Considerations
- WiFi SSID is easily spoofable → Combined with receipt validation
- Geofencing has ~10-50m GPS accuracy → Configurable radius per cafe
- Receipt ID ties user to physical transaction → Primary trust anchor

## Technology Stack

### Backend
```
Node.js 18+ (TypeScript)
├── Express.js - REST API framework
├── PostgreSQL - Primary data store
├── Redis - Caching & rate limiting
├── Socket.io - Real-time communication (future)
├── JWT - Authentication tokens
└── Anthropic Claude - AI chat agent (future)
```

### Key Libraries
- `pg` - PostgreSQL client
- `redis` - Redis client
- `jsonwebtoken` - JWT generation/validation
- `express-rate-limit` - Rate limiting
- `zod` - Request validation
- `helmet` - Security headers
- `cors` - CORS middleware

## API Architecture

### RESTful Endpoints

```
/api/auth
├── POST /barista/generate-username - Barista creates user
├── POST /join                       - Customer joins cafe
└── POST /refresh                    - Refresh access token

/api/users
├── GET  /me                         - Get current user
├── PUT  /me/interests               - Update interests
└── PUT  /me/poke-enabled            - Toggle poke feature

/api/badges
├── POST /record-tip                 - Record tip transaction
└── GET  /status                     - Get badge eligibility

/api/health
└── GET  /                           - Health check
```

### Request Flow

```
Client Request
    ↓
CORS + Helmet (Security)
    ↓
Rate Limiter (Redis-backed)
    ↓
Request Validation (Zod)
    ↓
Authentication Middleware (JWT)
    ↓
Controller Logic
    ↓
Model/Database Layer
    ↓
Response
```

## Database Architecture

### Schema Design

```sql
cafes (cafe configuration)
  ↓ (one-to-many)
users (temporary 24h accounts)
  ↓ (one-to-many)
tips (tip transaction history)
  ↓ (aggregation)
badges (user badge status)

join_tokens (barista-generated, 15min validity)
refresh_tokens (JWT refresh, 7d validity)
```

### Critical Indexes

```sql
-- User lookups by cafe
idx_users_cafe_expires ON users(cafe_id, expires_at)

-- Tip counting for badge eligibility
idx_tips_user_date ON tips(user_id, created_at DESC)

-- Badge expiration checks
idx_badges_expires ON badges(expires_at)

-- Token validation
idx_refresh_tokens_user ON refresh_tokens(user_id)
idx_join_tokens_cafe ON join_tokens(cafe_id)
```

### Automatic Cleanup

Database functions run periodically to clean up:
- `cleanup_expired_users()` - Remove users after 24h
- `cleanup_expired_join_tokens()` - Remove tokens after 15min
- `cleanup_expired_badges()` - Remove badges after 30d

Recommended cron job:
```bash
# Run every hour
0 * * * * psql brew_me_in -c "SELECT cleanup_expired_users(), cleanup_expired_join_tokens(), cleanup_expired_badges();"
```

## Security Architecture

### Authentication Flow

```
1. Barista generates username
   → Creates join_token (15min expiry)
   → Returns token to barista

2. Customer receives username + token
   → Submits join request with location data
   → System validates location (WiFi/GPS)
   → System validates token (unused, not expired)
   → Creates user session

3. User receives JWT tokens
   → Access token (24h) for API requests
   → Refresh token (7d) for token renewal
   → Access token in Authorization header
```

### Rate Limiting

```typescript
// Different limits per endpoint type
authRateLimiter:       5 req/15min    // Login attempts
usernameGenerator:    10 req/hour     // Per cafe
tipRateLimiter:        3 req/min      // Tip recording
generalApiLimiter:   100 req/15min    // All other endpoints
```

### Input Validation

All requests validated with Zod schemas:
```typescript
schemas.joinCafe = z.object({
  username: z.string().min(3).max(50),
  joinToken: z.string().min(1),
  cafeId: z.string().uuid(),
  wifiSsid: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});
```

### SQL Injection Prevention

- Parameterized queries via `pg` library
- No string concatenation in SQL
- Input validation before database layer

```typescript
// Safe - parameterized
await db.query('SELECT * FROM users WHERE id = $1', [userId]);

// Unsafe - NEVER do this
await db.query(`SELECT * FROM users WHERE id = '${userId}'`);
```

## Data Flow Diagrams

### User Onboarding Flow

```
[Customer] → [Makes Purchase] → [Receipt]
                                    ↓
[Barista] → [Admin Portal] → [Generate Username]
                                    ↓
                          [Join Token Created]
                          (15 min expiry)
                                    ↓
[Customer] → [Mobile App] → [Enter Username + Token]
                                    ↓
                          [Location Validation]
                          - WiFi SSID check
                          - OR GPS geofence
                                    ↓
                          [User Session Created]
                          (24 hour expiry)
                                    ↓
                          [JWT Tokens Issued]
                          - Access (24h)
                          - Refresh (7d)
```

### Badge Earning Flow

```
[Customer] → [Leaves Tip] → [Tip Recorded]
                                ↓
                    [Count Tips in 7-day Window]
                                ↓
                        [Threshold Check]
                        (5 tips required)
                                ↓
                      [Badge Awarded]
                      (30 day validity)
                                ↓
                    [Perks Activated]
                    - Priority chat
                    - Extended session
                    - Badge icon
```

## Scalability Considerations

### Current Architecture (MVP)
- Single PostgreSQL instance
- Single Redis instance
- Stateless API servers (horizontally scalable)

### Future Scaling (Production)

**Database Layer**
- PostgreSQL read replicas for user/badge lookups
- Connection pooling (pgBouncer)
- Partitioning users table by cafe_id

**Cache Layer**
- Redis Cluster for high availability
- Separate Redis for rate limiting vs sessions
- Cache frequently accessed cafe configs

**API Layer**
- Load balancer (Nginx/HAProxy)
- Multiple Express instances
- Socket.io with Redis adapter for WebSocket scaling

**Background Jobs**
- Separate worker processes for cleanup tasks
- Queue system (BullMQ) for async operations
- Scheduled jobs for badge calculations

## Monitoring & Observability

### Recommended Metrics

**Application Metrics**
- Request rate by endpoint
- Response time P50/P95/P99
- Error rate by status code
- Active user sessions

**Database Metrics**
- Query execution time
- Connection pool utilization
- Table sizes (users, tips, badges)
- Index hit rate

**Business Metrics**
- Daily active users per cafe
- Average session duration
- Badge earn rate
- Tip volume and frequency

### Logging Strategy

```typescript
// Structured logging recommended (Winston, Pino)
{
  timestamp: "2024-01-01T12:00:00Z",
  level: "info",
  endpoint: "/api/auth/join",
  userId: "uuid",
  cafeId: "uuid",
  method: "wifi",
  duration: 145,
  statusCode: 201
}
```

## Future Components (Not Yet Implemented)

### Component 2: Real-time Chat System
- Socket.io WebSocket connections
- Chat room management per cafe
- Message persistence (PostgreSQL)
- Typing indicators, read receipts

### Component 3: AI Chat Agent
- Claude API integration
- Context-aware conversations
- Interest-based matching
- Conversation memory

### Component 4: Admin Dashboard
- Cafe owner portal
- Analytics and insights
- User management
- Configuration controls

### Component 5: Mobile Applications
- React Native (iOS/Android)
- Push notifications
- Offline support
- Location services integration

## Development Guidelines

### Code Organization
```
src/
├── config/       - Environment configuration
├── controllers/  - Request handlers (thin, delegate to models)
├── models/       - Business logic & data access
├── middleware/   - Express middleware (auth, validation, rate limiting)
├── routes/       - API route definitions
├── utils/        - Pure utility functions
└── types/        - TypeScript interfaces
```

### Testing Strategy (Future)
- Unit tests: Models, utils
- Integration tests: API endpoints
- E2E tests: User workflows
- Load tests: Rate limiting, concurrency

### Deployment Checklist
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Redis connection verified
- [ ] SSL/TLS certificates
- [ ] Rate limits configured
- [ ] CORS origins whitelisted
- [ ] Logging/monitoring enabled
- [ ] Backup strategy implemented
- [ ] Health check endpoint monitored

## Architecture Decision Records (ADRs)

### ADR-001: PostgreSQL for Primary Data Store
**Decision**: Use PostgreSQL instead of MongoDB

**Rationale**:
- ACID compliance critical for tip/badge transactions
- Complex queries needed (badge eligibility, tip counting)
- Strong consistency requirements
- Mature ecosystem and tooling

**Trade-offs**:
- More complex schema changes vs NoSQL flexibility
- Vertical scaling challenges at extreme scale

### ADR-002: JWT for Authentication
**Decision**: Use JWT tokens instead of session cookies

**Rationale**:
- Stateless authentication (horizontally scalable)
- Mobile-friendly (React Native)
- Cross-origin support
- Token refresh pattern for security

**Trade-offs**:
- Cannot revoke access tokens before expiry
- Larger request size (token in headers)
- Requires refresh token infrastructure

### ADR-003: Network Validation Strategy
**Decision**: WiFi SSID (primary) + GPS geofencing (fallback)

**Rationale**:
- WiFi SSID easy to implement, reliable when available
- GPS provides fallback for outdoor seating, mobile orders
- Combined with receipt validation for security

**Trade-offs**:
- WiFi SSID can be spoofed (mitigated by receipt)
- GPS has accuracy limitations (solved with radius config)
- No perfect solution without specialized hardware

### ADR-004: 24-hour User Sessions
**Decision**: User accounts expire after 24 hours

**Rationale**:
- Aligns with "ephemeral cafe experience" concept
- Reduces data retention requirements
- Encourages return visits
- Simplifies privacy compliance

**Trade-offs**:
- Users must rejoin daily
- Conversation history lost after 24h
- Badge system provides continuity for regulars

## Summary

The current implementation (Component 1) provides a solid foundation:
- ✅ Secure authentication with network validation
- ✅ Scalable API architecture
- ✅ Badge/rewards system
- ✅ Rate limiting and security
- ✅ Automatic data cleanup

Next priorities:
- Socket.io real-time chat (Component 2)
- Claude AI integration (Component 3)
- React Native mobile apps (Component 5)
