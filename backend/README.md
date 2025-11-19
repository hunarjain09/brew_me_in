# Brew Me In - AI Agent Backend

AI-powered virtual cafe platform with Claude API integration for intelligent conversational agents.

## Features

- **Claude API Integration**: Powered by Anthropic's Claude Sonnet 4.5
- **Multiple Personalities**: Bartender, Quirky, Historian, Sarcastic, Professional, or Custom
- **Intelligent Caching**: Redis-based caching with smart invalidation
- **Rate Limiting**: Global and per-user rate limiting
- **Streaming Responses**: Real-time streaming via Socket.IO
- **Proactive Messaging**: Context-aware automated messages
- **Analytics**: Query tracking and performance metrics
- **Fallback Handling**: Graceful degradation when API unavailable

## Architecture

```
backend/
├── src/
│   ├── config/           # Configuration and environment setup
│   │   ├── env.ts
│   │   └── personalities.ts
│   ├── types/            # TypeScript type definitions
│   │   └── agent.types.ts
│   ├── services/         # Business logic services
│   │   ├── claude-agent.service.ts
│   │   ├── prompt-builder.service.ts
│   │   └── redis-cache.service.ts
│   ├── controllers/      # Request handlers
│   │   └── agent.controller.ts
│   ├── routes/           # API routes
│   │   └── agent.routes.ts
│   ├── middleware/       # Express middleware
│   │   ├── error-handler.ts
│   │   └── validation.ts
│   ├── socket/           # Socket.IO handlers
│   │   └── agent-socket.handler.ts
│   └── server.ts         # Main server entry point
└── package.json
```

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Redis server running locally or remotely
- Anthropic API key

### Installation

1. Clone the repository
2. Install dependencies:

```bash
cd backend
npm install
```

3. Create `.env` file:

```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:

```env
ANTHROPIC_API_KEY=your-api-key-here
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=3000
```

### Running the Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm start
```

The server will start on `http://localhost:3000`

## API Documentation

### REST Endpoints

#### Query Agent
```http
POST /api/agent/query
Content-Type: application/json

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

#### Get Agent Configuration
```http
GET /api/agent/config/:cafeId

Response:
{
  "cafeId": "cafe_123",
  "personality": "bartender",
  "proactivity": "occasional",
  "enabledQueries": ["orders", "stats", "menu", "events", "community"],
  "maxTokens": 300,
  "temperature": 0.7
}
```

#### Update Agent Configuration
```http
PUT /api/agent/config/:cafeId
Content-Type: application/json

{
  "personality": "quirky",
  "proactivity": "active",
  "customPrompt": "You are a fun and energetic barista..."
}
```

#### Generate Proactive Message
```http
POST /api/agent/proactive-message
Content-Type: application/json

{
  "cafeId": "cafe_123",
  "trigger": "milestone",
  "metadata": {
    "milestone": "100 customers"
  }
}
```

#### Get Analytics
```http
GET /api/agent/analytics/:cafeId?date=2024-01-15

Response:
{
  "totalQueries": 150,
  "cachedQueries": 45,
  "cacheHitRate": 30,
  "averageResponseTime": 1250,
  "popularQuestions": [
    { "question": "What's popular today?", "count": 23 }
  ]
}
```

### Socket.IO Events

Connect to namespace `/agent`:

```javascript
const socket = io('http://localhost:3000/agent');
```

#### Streaming Query

**Emit:**
```javascript
socket.emit('query:stream', {
  cafeId: 'cafe_123',
  question: 'What should I order?',
  userId: 'user_456'
});
```

**Listen:**
```javascript
socket.on('query:start', (data) => {
  console.log('Query started:', data.queryId);
});

socket.on('query:chunk', (data) => {
  console.log('Chunk:', data.chunk);
});

socket.on('query:complete', (data) => {
  console.log('Complete response:', data.response);
  console.log('Response time:', data.responseTime);
});

socket.on('query:error', (data) => {
  console.error('Error:', data.error);
});
```

#### Join/Leave Cafe

```javascript
// Join cafe room to receive proactive messages
socket.emit('cafe:join', { cafeId: 'cafe_123', userId: 'user_456' });

// Listen for proactive messages
socket.on('proactive:message', (data) => {
  console.log('Agent says:', data.message);
});

// Leave cafe room
socket.emit('cafe:leave', { cafeId: 'cafe_123' });
```

## Personality Types

### Bartender
Warm, attentive, and knowledgeable. Professional yet friendly.
- **Tone**: Conversational with professional edge
- **Emoji Usage**: Minimal

### Quirky
Playful, enthusiastic, and full of personality.
- **Tone**: Upbeat and energetic
- **Emoji Usage**: Frequent ✨☕🎉

### Historian
Knowledgeable and thoughtful. Shares interesting facts.
- **Tone**: Educational yet approachable
- **Emoji Usage**: Minimal

### Sarcastic
Witty with dry humor. Playfully sarcastic but never mean.
- **Tone**: Clever and cheeky
- **Emoji Usage**: Moderate 😏

### Professional
Efficient, clear, and service-oriented.
- **Tone**: Polite and direct
- **Emoji Usage**: None

### Custom
User-defined personality with custom prompt.
- **Configuration**: Requires `customPrompt` field

## Rate Limiting

- **Global**: 2000ms between any queries (configurable)
- **Per User**: 100 queries per day (configurable)

Configure in `.env`:
```env
GLOBAL_RATE_LIMIT_MS=2000
USER_RATE_LIMIT_DAILY=100
```

## Caching Strategy

### Query Cache
- **Key Pattern**: `agent:cache:{cafeId}:{questionHash}`
- **TTL**: 3600 seconds (1 hour)
- **Invalidation**: On context or config changes

### Common Queries Cache
- **TTL**: 7200 seconds (2 hours)
- **Pre-generated**: "What's popular today?", "When are you busiest?", etc.

### Rate Limit Tracking
- **Global**: `agent:query:global:last`
- **User**: `agent:query:{userId}:count` (expires after 24 hours)

### Analytics
- **Total Queries**: `agent:analytics:{cafeId}:{date}:total`
- **Response Times**: `agent:analytics:{cafeId}:{date}:times`
- **Cache Hits**: `agent:analytics:{cafeId}:{date}:cached`
- **Popular Questions**: `agent:analytics:{cafeId}:questions` (sorted set)

## Error Handling

The API uses standard HTTP status codes:

- `200 OK`: Successful request
- `400 Bad Request`: Invalid input
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

All errors return JSON:
```json
{
  "error": "Error message",
  "status": 400
}
```

## Development

### Project Structure

- **Types**: All TypeScript types in `src/types/`
- **Services**: Business logic, no HTTP concerns
- **Controllers**: HTTP request/response handling
- **Routes**: API endpoint definitions
- **Middleware**: Request processing and validation

### Adding a New Endpoint

1. Define types in `src/types/agent.types.ts`
2. Add business logic to service in `src/services/`
3. Create controller method in `src/controllers/agent.controller.ts`
4. Add route in `src/routes/agent.routes.ts`
5. Add validation schema in `src/middleware/validation.ts`

### Testing

```bash
# Run tests (when implemented)
npm test

# Lint code
npm run lint
```

## Deployment

### Environment Variables

Ensure all required environment variables are set:
- `ANTHROPIC_API_KEY` (required)
- `REDIS_HOST` (required)
- `REDIS_PORT` (default: 6379)
- `PORT` (default: 3000)

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use secure Redis connection
- [ ] Enable HTTPS
- [ ] Set up proper logging
- [ ] Configure rate limits appropriately
- [ ] Monitor API usage and costs
- [ ] Set up error tracking (e.g., Sentry)

## Monitoring

### Health Check
```bash
curl http://localhost:3000/health
```

### Logs
The server logs all requests using Morgan:
- Development: Colorful, detailed logs
- Production: Combined Apache-style logs

## Troubleshooting

### Redis Connection Issues
```
Error: Redis Client Error: connect ECONNREFUSED
```
**Solution**: Ensure Redis is running: `redis-cli ping` should return `PONG`

### Claude API Errors
```
Error: Invalid API key
```
**Solution**: Check `ANTHROPIC_API_KEY` in `.env`

### Rate Limit Issues
```
429 Too Many Requests
```
**Solution**: Wait for rate limit to reset or adjust limits in `.env`

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
