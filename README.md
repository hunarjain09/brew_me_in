# brew_me_in

A location-based social networking platform for coffee shops, enabling temporary connections and AI-powered conversations between cafe visitors.

## Overview

brew_me_in creates ephemeral social experiences within coffee shops by:
- **Temporary User Accounts**: Customers receive 24-hour usernames upon purchase
- **Physical Presence Validation**: WiFi SSID matching and GPS geofencing
- **AI Agent Integration**: Claude-powered virtual baristas with customizable personalities
- **Real-time Communication**: Socket.IO-based chat with streaming AI responses
- **Badge System**: Rewards for regular customers (5 tips in 7 days → 30-day perks)
- **Interest Matching**: Connect with like-minded cafe visitors

## Features

### 🔐 Component 1: Authentication & User Management
- Temporary username generation (24-hour validity)
- Barista portal for receipt-to-username mapping
- Network validation (WiFi SSID + GPS geofencing)
- JWT-based authentication (access + refresh tokens)
- Badge system with automatic tip tracking

### 🤖 Component 5: AI Agent Integration
- **Claude API Integration**: Powered by Claude Sonnet 4.5
- **Multiple Personalities**: Bartender, Quirky, Historian, Sarcastic, Professional, or Custom
- **Context-Aware Responses**: Agent knows cafe stats, popular orders, peak hours
- **Streaming Responses**: Real-time response streaming via Socket.IO
- **Smart Caching**: Redis-based caching with automatic invalidation
- **Rate Limiting**: Global and per-user limits to manage costs
- **Proactive Messaging**: Context-aware announcements

### 📊 Analytics & Insights
- Query analytics (popular questions, response times, cache hit rates)
- User engagement metrics
- Badge eligibility tracking
- Performance monitoring

## Tech Stack

### Backend
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL 14+ (user data, chat history)
- **Cache**: Redis 7+ (sessions, rate limiting, AI cache)
- **Real-time**: Socket.IO (WebSocket connections)
- **AI**: Anthropic Claude API (Claude Sonnet 4.5)
- **Authentication**: JWT tokens
- **Validation**: Zod schemas

### Frontend (Planned)
- React Native (iOS/Android)
- React Web
- Socket.IO Client

## Project Structure

```
brew_me_in/
├── backend/
│   ├── src/
│   │   ├── config/           # Environment and personality configs
│   │   ├── controllers/      # Request handlers (thin layer)
│   │   ├── db/              # Database schema and migrations
│   │   ├── middleware/      # Auth, validation, rate limiting
│   │   ├── models/          # Business logic & data access
│   │   ├── routes/          # API route definitions
│   │   ├── services/        # AI agent services
│   │   ├── socket/          # Socket.IO handlers
│   │   ├── types/           # TypeScript interfaces
│   │   ├── utils/           # JWT, validation utilities
│   │   ├── app.ts           # Express app setup
│   │   └── index.ts         # Server entry point
│   ├── package.json
│   └── tsconfig.json
├── ARCHITECTURE.md          # Detailed architecture
├── Claude.md                # AI agent development guide
└── README.md                # This file
```

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- Anthropic API key ([Get one here](https://console.anthropic.com/))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/brew_me_in.git
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
   # Edit .env with your credentials:
   # - Database connection
   # - Redis connection
   # - JWT secrets
   # - Anthropic API key
   ```

4. **Set up database**
   ```bash
   createdb brew_me_in
   npm run migrate
   ```

5. **Start Redis**
   ```bash
   redis-server
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3000`

## API Documentation

### Authentication Endpoints

#### Generate Username (Barista)
```http
POST /api/auth/barista/generate-username
Content-Type: application/json

{
  "cafeId": "uuid",
  "receiptId": "RCPT123"
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
  "wifiSsid": "CafeWiFi-Guest",
  "latitude": 37.7749,
  "longitude": -122.4194
}

Response:
{
  "accessToken": "jwt-token",
  "refreshToken": "jwt-refresh-token",
  "user": { ... }
}
```

### AI Agent Endpoints

#### Query Agent
```http
POST /api/agent/query
Content-Type: application/json
Authorization: Bearer <token>

{
  "cafeId": "cafe_123",
  "question": "What's popular today?",
  "userId": "user_456"
}

Response:
{
  "response": "Today's popular items include...",
  "responseTime": 1234,
  "cached": false,
  "queryId": "query_...",
  "remaining": 95
}
```

#### Configure Agent Personality
```http
PUT /api/agent/config/:cafeId
Content-Type: application/json

{
  "personality": "quirky",
  "proactivity": "active",
  "enabledQueries": ["orders", "menu", "community"]
}
```

#### Get Analytics
```http
GET /api/agent/analytics/:cafeId
Authorization: Bearer <token>

Response:
{
  "totalQueries": 150,
  "cachedQueries": 45,
  "cacheHitRate": 30,
  "averageResponseTime": 1250,
  "popularQuestions": [...]
}
```

### Socket.IO Events

**Namespace**: `/agent`

```javascript
// Connect
const socket = io('http://localhost:3000/agent');

// Stream a query
socket.emit('query:stream', {
  cafeId: 'cafe_123',
  question: 'What should I order?',
  userId: 'user_456'
});

// Listen for responses
socket.on('query:start', (data) => { ... });
socket.on('query:chunk', (data) => { ... });
socket.on('query:complete', (data) => { ... });

// Join cafe for proactive messages
socket.emit('cafe:join', { cafeId: 'cafe_123', userId: 'user_456' });
socket.on('proactive:message', (data) => { ... });
```

## AI Agent Personalities

### 🍺 Bartender
Warm, attentive, and knowledgeable. Like a skilled bartender who knows their regulars.
- **Best for**: Professional cafes, welcoming atmosphere
- **Example**: "Hey there! What can I get started for you today?"

### ✨ Quirky
Playful, enthusiastic, and full of personality. Makes every interaction fun.
- **Best for**: Youth-oriented cafes, creative spaces
- **Example**: "Heyyyy coffee adventurer! ☕✨ Ready to discover something amazing?"

### 📚 Historian
Knowledgeable and thoughtful. Shares interesting facts about coffee.
- **Best for**: Educational environments, specialty cafes
- **Example**: "Welcome! Did you know our espresso beans come from..."

### 😏 Sarcastic
Witty with dry humor. Playfully sarcastic but never mean.
- **Best for**: Casual cafes, tech-savvy audiences
- **Example**: "Oh look, another coffee seeker. Lucky you 😏"

### 💼 Professional
Efficient, clear, and service-oriented.
- **Best for**: Business environments, corporate cafes
- **Example**: "Good day. How may I assist you?"

### 🎨 Custom
Define your own personality with a custom prompt.

## Configuration

### Environment Variables

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

# Claude API
ANTHROPIC_API_KEY=sk-ant-...

# Badge Settings
BADGE_TIP_THRESHOLD=5
BADGE_TIP_WINDOW_DAYS=7
BADGE_DURATION_DAYS=30

# User Settings
USER_SESSION_DURATION_HOURS=24
```

## Development

### Running Tests
```bash
npm test
```

### Building for Production
```bash
npm run build
npm start
```

### Database Migrations
```bash
npm run migrate
```

## Security Features

- JWT token-based authentication with refresh tokens
- Network validation (WiFi SSID + GPS geofencing)
- Rate limiting on all endpoints
- Parameterized SQL queries (SQL injection prevention)
- Helmet.js for security headers
- CORS configuration
- Input validation with Zod schemas

## Performance

- **Cached AI Responses**: ~50-100ms
- **Uncached AI Responses**: ~1-2s (depends on Claude API)
- **Streaming**: Starts in <500ms, chunks every 50-100ms
- **Database Queries**: Indexed for optimal performance
- **Redis Caching**: Sub-millisecond lookups

## Cost Management

### AI Agent Costs
Based on Claude Sonnet 4.5 pricing:
- **Cached Query**: ~$0.0001 (cache hit)
- **New Query**: ~$0.003-0.005 (typical)
- **1000 queries/day**: ~$1-2 (with 40% cache hit rate)

### Optimization Strategies
1. Smart caching with 1-hour TTL
2. Pre-cache common questions
3. Rate limiting (2s global, 100/day per user)
4. Token limits (300 max tokens default)

## Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Use strong `JWT_SECRET`
- [ ] Configure CORS origins
- [ ] Set up SSL/TLS
- [ ] Enable database backups
- [ ] Configure Redis persistence
- [ ] Set up monitoring/logging
- [ ] Review rate limits

### Recommended Infrastructure
- **Backend**: Railway, Render, or AWS
- **Database**: Managed PostgreSQL (Railway, Neon, or AWS RDS)
- **Redis**: Redis Cloud, AWS ElastiCache, or Railway
- **Monitoring**: Datadog, New Relic, or custom logging

## Roadmap

### Implemented
- ✅ Component 1: Authentication & User Management
- ✅ Component 5: AI Agent Integration
- ✅ Network Validation (basic version)

### Planned
- 🚧 Component 2: Real-time Chat
- 🚧 Component 3: Enhanced Rate Limiting
- 🚧 Component 4: Interest Matching & Pokes
- 🚧 Component 6: Moderator Dashboard
- 🚧 Component 7: Advanced Network Validation
- 🚧 Component 8: Background Jobs & Cleanup

## Documentation

- **Backend README**: [backend/README.md](./backend/README.md)
- **Architecture Guide**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- **AI Agent Guide**: [Claude.md](./Claude.md)
- **API Examples**: [backend/API_EXAMPLES.md](./backend/API_EXAMPLES.md)

## Troubleshooting

### Database Connection Failed
```
Solution: Check DATABASE_URL in .env and ensure PostgreSQL is running
$ pg_isready
```

### Redis Connection Failed
```
Solution: Ensure Redis is running
$ redis-cli ping
# Should return PONG
```

### Invalid API Key
```
Solution: Check ANTHROPIC_API_KEY in .env
```

### Rate Limit Exceeded
```
Solution: Wait for rate limit reset or increase limits in .env
```

## Contributing

This is a private project. For questions or suggestions, please contact the development team.

## License

MIT License - see LICENSE file for details

## Support

- **Issues**: GitHub Issues
- **Email**: support@brewmein.com
- **Documentation**: See /backend/README.md and Claude.md

## Acknowledgments

- Built with [Anthropic's Claude API](https://www.anthropic.com/)
- Powered by [Express](https://expressjs.com/) and [Socket.IO](https://socket.io/)
- Database: [PostgreSQL](https://www.postgresql.org/)
- Cache: [Redis](https://redis.io/)

---

**Made with ☕ and 🤖 by the Brew Me In team**
