# brew_me_in Backend

Express.js backend API for brew_me_in - a location-based cafe social networking platform with AI agent integration.

## Overview

This backend supports two major components:

**Component 1: Authentication & User Management**
- Temporary user accounts (24-hour validity)
- JWT-based authentication
- Network validation (WiFi + GPS)
- Badge system and tip tracking

**Component 5: AI Agent Integration**
- Claude AI integration with multiple personalities
- Streaming responses via Socket.IO
- Redis-based caching and analytics
- Rate limiting for cost management

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Run production server
- `npm run migrate` - Run database migrations
- `npm run lint` - Lint TypeScript code

## API Structure

### Routes

**Authentication** (`/api/auth/*`)
- `POST /api/auth/barista/generate-username` - Generate temporary username
- `POST /api/auth/join` - Join cafe with network validation
- `POST /api/auth/refresh` - Refresh access token

**User Management** (`/api/users/*`)
- `GET /api/users/me` - Get current user info
- `PUT /api/users/me/interests` - Update user interests
- `PUT /api/users/me/poke-enabled` - Toggle poke feature

**Badges** (`/api/badges/*`)
- `POST /api/badges/record-tip` - Record tip and check eligibility
- `GET /api/badges/status` - Get badge status and perks

**AI Agent** (`/api/agent/*`)
- `POST /api/agent/query` - Query the AI agent
- `GET /api/agent/config/:cafeId` - Get agent configuration
- `PUT /api/agent/config/:cafeId` - Update agent configuration
- `PUT /api/agent/context/:cafeId` - Update cafe context
- `POST /api/agent/proactive-message` - Generate proactive message
- `GET /api/agent/analytics/:cafeId` - Get query analytics
- `POST /api/agent/pregenerate/:cafeId` - Pre-cache common responses

**Health**
- `GET /api/health` - Health check endpoint

### Models

**Component 1: Auth & User Management**
- `User` - Temporary user accounts
- `Badge` - User badge status and eligibility
- `Tip` - Tip tracking for badge system
- `Cafe` - Cafe information and configuration
- `JoinToken` - Barista-generated invitation tokens

**Component 5: AI Agent**
- Agent configurations (in-memory, migrate to database)
- Cafe contexts (in-memory, migrate to database)
- Query analytics (Redis-based)

### Middleware

- `authenticate` - JWT authentication
- `validate` - Request validation using Zod schemas
- `rateLimit` - Redis-backed rate limiting
- `errorHandler` - Centralized error handling

## Environment Variables

See `.env.example` for all required variables.

### Critical Variables

**Database**
- `DATABASE_URL` - PostgreSQL connection string
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - Database credentials

**Redis**
- `REDIS_HOST` - Redis server host
- `REDIS_PORT` - Redis server port

**Authentication**
- `JWT_SECRET` - Secret for signing JWT tokens
- `JWT_REFRESH_SECRET` - Secret for refresh tokens
- `JWT_EXPIRES_IN` - Token expiration time (default: 24h)

**Claude API**
- `ANTHROPIC_API_KEY` - Claude API key for AI agent

**Badge Settings**
- `BADGE_TIP_THRESHOLD` - Tips required for badge (default: 5)
- `BADGE_TIP_WINDOW_DAYS` - Days to count tips (default: 7)
- `BADGE_DURATION_DAYS` - Badge validity (default: 30)

**AI Agent**
- `GLOBAL_RATE_LIMIT_MS` - Global cooldown between queries (default: 2000)
- `USER_RATE_LIMIT_DAILY` - Per-user daily limit (default: 100)
- `AGENT_CACHE_TTL` - Cache TTL in seconds (default: 3600)

## Database

### Running Migrations

```bash
npm run migrate
```

This will:
1. Create all tables (users, badges, tips, cafes, join_tokens, refresh_tokens)
2. Set up indexes for performance
3. Create PostgreSQL helper functions
4. Insert sample cafe data

### Manual Database Operations

```bash
# Connect to database
psql brew_me_in

# Check users
SELECT * FROM users WHERE expires_at > NOW();

# Check badges
SELECT * FROM badges WHERE expires_at > NOW();

# Check tips
SELECT * FROM tips ORDER BY created_at DESC LIMIT 10;

# Clean up expired data
SELECT cleanup_expired_users();
SELECT cleanup_expired_badges();
SELECT cleanup_expired_join_tokens();
```

### Database Schema Highlights

**users table**
- 24-hour temporary accounts
- Username uniqueness per cafe
- Auto-expiration tracking

**badges table**
- 30-day validity
- Automatic eligibility checking
- Tip threshold tracking

**tips table**
- Tracks all tips for badge eligibility
- 7-day rolling window

## AI Agent Features

### Personalities

1. **Bartender** - Warm and professional
2. **Quirky** - Playful with frequent emojis
3. **Historian** - Educational and thoughtful
4. **Sarcastic** - Witty with dry humor
5. **Professional** - Efficient and direct
6. **Custom** - User-defined personality

### Caching Strategy

**Query Cache**
- Key: `agent:cache:{cafeId}:{questionHash}`
- TTL: 1 hour (configurable)
- Invalidation: On context/config changes

**Analytics Tracking**
- Total queries per day
- Response times
- Cache hit rate
- Popular questions (sorted set)

### Rate Limiting

**Global Limit**
- 2 seconds between ANY agent queries
- Prevents system-wide spam

**User Limit**
- 100 queries per day per user
- 24-hour rolling window

### Socket.IO Integration

**Namespace**: `/agent`

**Events:**
- `query:stream` - Start streaming query
- `cafe:join` - Join cafe room for proactive messages
- `cafe:leave` - Leave cafe room

**Listeners:**
- `query:start` - Query started
- `query:chunk` - Response chunk
- `query:complete` - Query complete
- `query:error` - Query error
- `proactive:message` - Agent announcement

## Development

### Project Structure

```
src/
├── config/           # Environment and personality configs
├── controllers/      # HTTP request handlers
├── db/              # Database connections and schema
├── middleware/      # Auth, validation, rate limiting
├── models/          # Business logic & data access
├── routes/          # API endpoint definitions
├── services/        # AI agent services
├── socket/          # Socket.IO handlers
├── types/           # TypeScript interfaces
├── utils/           # JWT, validation utilities
├── app.ts           # Express app setup
└── index.ts         # Server entry point
```

### Adding New Endpoints

1. Create controller in `src/controllers/`
2. Add route in `src/routes/`
3. Add validation schema in `src/middleware/validation.ts`
4. Update route index in `src/routes/index.ts`

### Adding New Models

1. Create model class in `src/models/`
2. Add TypeScript interface in `src/types/index.ts`
3. Update database schema in `src/db/schema.sql`
4. Run migrations

## Testing

### Manual API Testing

**Health check**
```bash
curl http://localhost:3000/api/health
```

**Generate username (barista)**
```bash
curl -X POST http://localhost:3000/api/auth/barista/generate-username \
  -H "Content-Type: application/json" \
  -d '{"cafeId": "cafe-uuid", "receiptId": "RCPT123"}'
```

**Join cafe (customer)**
```bash
curl -X POST http://localhost:3000/api/auth/join \
  -H "Content-Type: application/json" \
  -d '{
    "username": "HappyOtter42",
    "joinToken": "token-from-barista",
    "cafeId": "cafe-uuid",
    "wifiSsid": "CafeWiFi-Guest"
  }'
```

**Query AI agent**
```bash
curl -X POST http://localhost:3000/api/agent/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "cafeId": "cafe_123",
    "question": "What is popular today?",
    "userId": "user_456"
  }'
```

**Get current user**
```bash
curl http://localhost:3000/api/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Security

### Rate Limiting

Different limits for different endpoints:
- Auth endpoints: 5 req/15min
- Username generation: 10 req/hour per cafe
- Tips: 3 req/minute
- AI agent: 2s global cooldown + 100 req/day per user
- General API: 100 req/15min

### Authentication

All protected endpoints require:
```
Authorization: Bearer <jwt-token>
```

Tokens expire after 24 hours. Use refresh tokens to get new access tokens.

### Network Validation

User location verified via:
1. WiFi SSID matching (primary)
2. GPS geofencing (fallback, 100m radius)

### Input Validation

All endpoints use Zod schemas for validation. SQL injection prevented via parameterized queries.

## Monitoring

### Logs

Development mode includes detailed query logging:
- Query text
- Execution duration
- Row counts

### Health Check

```bash
curl http://localhost:3000/api/health
```

Returns:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### AI Agent Analytics

```bash
curl http://localhost:3000/api/agent/analytics/cafe_123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Returns:
- Total queries
- Cache hit rate
- Average response time
- Popular questions

## Troubleshooting

### Database Connection Failed

Check:
1. PostgreSQL is running: `pg_isready`
2. Database exists: `psql -l | grep brew_me_in`
3. Credentials in `.env` are correct

### Redis Connection Failed

Check:
1. Redis is running: `redis-cli ping`
2. Redis host/port in `.env` are correct

### Rate Limit Issues

Clear Redis rate limit keys:
```bash
redis-cli KEYS "rl:*" | xargs redis-cli DEL
```

### AI Agent Issues

**Invalid API key**
- Check `ANTHROPIC_API_KEY` in `.env`

**Rate limit exceeded**
- Wait for cooldown or increase limits

**Slow responses**
- Check cache hit rate
- Pre-generate common responses

## Performance

### Database Indexes

Critical indexes:
- `idx_users_cafe_expires` - User lookup by cafe
- `idx_tips_user_date` - Tip counting for badges
- `idx_badges_expires` - Badge expiration checks

### Caching Strategy

Redis used for:
- Rate limiting counters
- AI query responses
- Session storage
- Analytics tracking

### AI Response Times

- **Cached**: ~50-100ms
- **Uncached**: ~1-2s
- **Streaming**: Starts <500ms

## Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong `JWT_SECRET` and `JWT_REFRESH_SECRET`
- [ ] Configure CORS origins
- [ ] Set up SSL/TLS
- [ ] Enable database backups
- [ ] Configure Redis persistence
- [ ] Set up monitoring/logging
- [ ] Review rate limits for your scale
- [ ] Monitor Anthropic API usage and costs

### Building

```bash
npm run build
```

Output in `dist/` directory.

### Running Production

```bash
NODE_ENV=production npm start
```

Or with PM2:
```bash
pm2 start dist/index.js --name brew-me-in
```

## Cost Management

### AI Agent Costs

Based on Claude Sonnet 4.5 pricing:
- Cached query: ~$0.0001
- New query: ~$0.003-0.005
- 1000 queries/day: ~$1-2 (with 40% cache hit rate)

### Optimization Tips

1. Pre-cache common questions
2. Use appropriate maxTokens (default: 300)
3. Enable proactive caching
4. Monitor cache hit rate
5. Adjust rate limits based on usage

## Support

For issues or questions, refer to the main project README or contact the development team.

## Documentation

- **Main README**: [../README.md](../README.md)
- **Architecture**: [../ARCHITECTURE.md](../ARCHITECTURE.md)
- **AI Agent Guide**: [../Claude.md](../Claude.md)
- **API Examples**: [./API_EXAMPLES.md](./API_EXAMPLES.md)

## License

MIT
