# Brew Me In

AI-powered virtual cafe platform with Claude API integration. Create immersive cafe experiences with intelligent AI agents that engage with your community.

## Overview

Brew Me In is a virtual cafe platform that brings the warmth and community of a physical cafe into the digital space. Each cafe features an AI agent powered by Anthropic's Claude, capable of answering questions, making recommendations, and engaging with visitors based on customizable personalities and real-time cafe data.

## Features

### 🤖 AI Agent Integration (Component 5)
- **Claude API Integration**: Powered by Claude Sonnet 4.5
- **Multiple Personalities**: Choose from Bartender, Quirky, Historian, Sarcastic, Professional, or create your own
- **Context-Aware Responses**: Agent has access to cafe stats, popular orders, peak hours, and community interests
- **Query Types**: Orders, Stats, Menu, Events, Community insights

### 💬 Intelligent Conversations
- **Streaming Responses**: Real-time response streaming via Socket.IO
- **Smart Caching**: Redis-based caching with automatic invalidation
- **Rate Limiting**: Global and per-user rate limiting to manage costs
- **Fallback Handling**: Graceful degradation when API is unavailable

### 📊 Analytics & Insights
- **Query Analytics**: Track popular questions, response times, cache hit rates
- **Performance Metrics**: Monitor agent performance and optimize costs
- **Proactive Messaging**: Context-aware automated announcements

### ⚡ High Performance
- **Response Caching**: Typical response time under 100ms for cached queries
- **Pre-generation**: Common questions pre-cached for instant responses
- **Streaming Support**: Better UX for longer responses

## Architecture

```
brew_me_in/
├── backend/                    # Node.js + Express + Socket.IO
│   ├── src/
│   │   ├── config/            # Environment and personality configs
│   │   ├── types/             # TypeScript type definitions
│   │   ├── services/          # Core business logic
│   │   │   ├── claude-agent.service.ts    # Claude API integration
│   │   │   ├── prompt-builder.service.ts  # System prompt builder
│   │   │   └── redis-cache.service.ts     # Caching layer
│   │   ├── controllers/       # HTTP request handlers
│   │   ├── routes/            # API endpoints
│   │   ├── middleware/        # Express middleware
│   │   ├── socket/            # Socket.IO handlers
│   │   └── server.ts          # Main server
│   └── package.json
└── README.md
```

## Quick Start

### Prerequisites

- Node.js 18+
- Redis server
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
   # Edit .env and add your ANTHROPIC_API_KEY
   ```

4. **Start Redis** (if not already running)
   ```bash
   redis-server
   ```

5. **Start the backend**
   ```bash
   npm run dev
   ```

The server will start at `http://localhost:3000`

## API Overview

### REST Endpoints

```
POST   /api/agent/query              - Query the AI agent
GET    /api/agent/config/:cafeId     - Get agent configuration
PUT    /api/agent/config/:cafeId     - Update agent configuration
PUT    /api/agent/context/:cafeId    - Update cafe context
POST   /api/agent/proactive-message  - Generate proactive message
GET    /api/agent/analytics/:cafeId  - Get analytics
POST   /api/agent/pregenerate/:cafeId - Pre-cache common responses
```

### Socket.IO Events

**Namespace**: `/agent`

```
Emit:   query:stream     - Stream a query response
Emit:   cafe:join        - Join cafe room for proactive messages
Emit:   cafe:leave       - Leave cafe room

Listen: query:start      - Query started
Listen: query:chunk      - Response chunk received
Listen: query:complete   - Query completed
Listen: query:error      - Query error
Listen: proactive:message - Proactive message from agent
```

## Usage Examples

### Basic Query

```javascript
const response = await fetch('http://localhost:3000/api/agent/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    cafeId: 'cafe_123',
    question: "What's popular today?",
    userId: 'user_456'
  })
});

const data = await response.json();
console.log(data.response); // Agent's answer
```

### Streaming Response

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/agent');

socket.emit('query:stream', {
  cafeId: 'cafe_123',
  question: 'What should I order?',
  userId: 'user_456'
});

socket.on('query:chunk', (data) => {
  process.stdout.write(data.chunk); // Stream to console
});

socket.on('query:complete', (data) => {
  console.log(`\nResponse time: ${data.responseTime}ms`);
});
```

### Configure Personality

```javascript
const response = await fetch('http://localhost:3000/api/agent/config/cafe_123', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    personality: 'quirky',
    proactivity: 'active',
    enabledQueries: ['orders', 'menu', 'community']
  })
});
```

## Personality Types

### 🍺 Bartender
Warm, attentive, and knowledgeable. Like a skilled bartender who knows their regulars.
- **Best for**: Professional cafes, welcoming atmosphere
- **Example**: "Hey there! What can I get started for you today?"

### ✨ Quirky
Playful, enthusiastic, and full of personality. Makes every interaction fun.
- **Best for**: Youth-oriented cafes, creative spaces
- **Example**: "Heyyyy coffee adventurer! ☕✨ Ready to discover something amazing?"

### 📚 Historian
Knowledgeable and thoughtful. Shares interesting facts about coffee and the cafe.
- **Best for**: Educational environments, specialty cafes
- **Example**: "Welcome! Did you know our espresso beans come from..."

### 😏 Sarcastic
Witty with dry humor. Playfully sarcastic but never mean-spirited.
- **Best for**: Casual cafes, tech-savvy audiences
- **Example**: "Oh look, another coffee seeker. Lucky you, we're *totally* not judging 😏"

### 💼 Professional
Efficient, clear, and service-oriented. Focuses on accurate information.
- **Best for**: Business environments, corporate cafes
- **Example**: "Good day. How may I assist you with your order?"

### 🎨 Custom
Define your own personality with a custom prompt.
- **Best for**: Unique brand identities, special themes
- **Configuration**: Provide your own system prompt

## Configuration

### Environment Variables

```env
# Required
ANTHROPIC_API_KEY=sk-ant-...
REDIS_HOST=localhost

# Optional (with defaults)
PORT=3000
REDIS_PORT=6379
NODE_ENV=development
GLOBAL_RATE_LIMIT_MS=2000
USER_RATE_LIMIT_DAILY=100
AGENT_CACHE_TTL=3600
```

### Agent Configuration

```typescript
interface AgentConfig {
  cafeId: string;
  personality: 'bartender' | 'quirky' | 'historian' | 'sarcastic' | 'professional' | 'custom';
  customPrompt?: string;           // For custom personality
  proactivity: 'silent' | 'occasional' | 'active' | 'hype';
  enabledQueries: QueryType[];     // ['orders', 'stats', 'menu', 'events', 'community']
  maxTokens?: number;              // Default: 300
  temperature?: number;            // Default: 0.7
}
```

### Cafe Context

```typescript
interface CafeContext {
  cafeId: string;
  cafeName: string;
  orderStats: OrderStat[];         // Popular items
  peakHours: PeakHour[];          // Busiest times
  popularInterests: string[];      // Community interests
  upcomingEvents: UpcomingEvent[];
  customKnowledge: string;         // Owner-provided context
  totalCustomers?: number;
  averageOrderValue?: number;
}
```

## Rate Limiting

- **Global**: 2 seconds between any queries (configurable)
- **Per User**: 100 queries per day (configurable)

Rate limits prevent abuse and manage API costs while ensuring fair access for all users.

## Caching Strategy

### Query Cache
- **TTL**: 1 hour (default)
- **Invalidation**: On context or config changes
- **Hit Rate Target**: 40%+

### Common Queries Cache
- **TTL**: 2 hours
- **Pre-generated**: "What's popular?", "When are you busiest?", etc.
- **Refresh**: On context updates

## Performance

- **Cached Responses**: ~50-100ms
- **Uncached Responses**: ~1-2s (depends on Claude API)
- **Streaming**: Starts in <500ms, chunks every 50-100ms

## Cost Management

### Optimization Strategies
1. **Smart Caching**: Pre-cache common questions
2. **Context Pruning**: Only include relevant data
3. **Token Limits**: Set appropriate maxTokens
4. **Rate Limiting**: Prevent excessive usage

### Estimated Costs
Based on Claude Sonnet 4.5 pricing:
- **Cached Query**: ~$0.0001 (cache hit)
- **New Query**: ~$0.003-0.005 (typical)
- **1000 queries/day**: ~$1-2 (with 40% cache hit rate)

## Development

### Project Structure
- **Types**: TypeScript definitions in `src/types/`
- **Services**: Business logic, no HTTP concerns
- **Controllers**: Request/response handling
- **Routes**: API endpoint definitions
- **Middleware**: Request processing

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

## Documentation

- [Backend README](./backend/README.md) - Detailed backend documentation
- [API Examples](./backend/API_EXAMPLES.md) - Complete API usage examples

## Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Use secure Redis connection (TLS)
- [ ] Configure proper CORS origins
- [ ] Set up HTTPS
- [ ] Enable logging and monitoring
- [ ] Configure rate limits for your scale
- [ ] Set up error tracking (e.g., Sentry)
- [ ] Monitor API usage and costs

### Recommended Infrastructure
- **Backend**: Railway, Render, or AWS
- **Redis**: Redis Cloud, AWS ElastiCache, or Railway
- **Monitoring**: Datadog, New Relic, or custom logging

## Troubleshooting

### Common Issues

**Redis Connection Failed**
```
Solution: Ensure Redis is running (redis-cli ping)
```

**Invalid API Key**
```
Solution: Check ANTHROPIC_API_KEY in .env
```

**Rate Limit Exceeded**
```
Solution: Wait for rate limit reset or increase limits
```

**High Response Times**
```
Solution: Check cache hit rate, pre-generate common responses
```

## Roadmap

### Upcoming Features
- [ ] Database integration (PostgreSQL/MongoDB)
- [ ] User authentication and authorization
- [ ] Multi-language support
- [ ] Voice responses (text-to-speech)
- [ ] Agent training on cafe-specific data
- [ ] Dashboard for cafe owners
- [ ] Advanced analytics and insights

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/brew_me_in/issues)
- **Email**: support@brewmein.com
- **Documentation**: [Full Docs](https://docs.brewmein.com)

## Acknowledgments

- Built with [Anthropic's Claude API](https://www.anthropic.com/)
- Powered by [Express](https://expressjs.com/) and [Socket.IO](https://socket.io/)
- Cached with [Redis](https://redis.io/)

---

**Made with ☕ and 🤖 by the Brew Me In team**
