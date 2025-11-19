# API Examples

Complete examples for using the Brew Me In AI Agent API.

## Table of Contents

1. [REST API Examples](#rest-api-examples)
2. [Socket.IO Examples](#socketio-examples)
3. [Integration Examples](#integration-examples)

## REST API Examples

### 1. Basic Query

```javascript
// Using fetch
const response = await fetch('http://localhost:3000/api/agent/query', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    cafeId: 'cafe_123',
    question: "What's the most popular drink today?",
    userId: 'user_456'
  })
});

const data = await response.json();
console.log(data.response); // Agent's response
console.log(`Response time: ${data.responseTime}ms`);
console.log(`Cached: ${data.cached}`);
console.log(`Queries remaining today: ${data.remaining}`);
```

### 2. Configure Agent Personality

```javascript
// Get current configuration
const config = await fetch('http://localhost:3000/api/agent/config/cafe_123')
  .then(res => res.json());

console.log('Current personality:', config.personality);

// Update to quirky personality
const updated = await fetch('http://localhost:3000/api/agent/config/cafe_123', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    personality: 'quirky',
    proactivity: 'active',
    enabledQueries: ['orders', 'menu', 'community']
  })
}).then(res => res.json());

console.log('Updated personality:', updated.personality);
```

### 3. Custom Personality

```javascript
const response = await fetch('http://localhost:3000/api/agent/config/cafe_123', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    personality: 'custom',
    customPrompt: `You are a wise coffee sage who speaks in poetic phrases.
    You have centuries of coffee knowledge and share it with metaphors and wisdom.
    Keep responses mystical yet helpful.`,
    proactivity: 'occasional',
    temperature: 0.8,
    maxTokens: 250
  })
}).then(res => res.json());

console.log('Custom personality configured');
```

### 4. Update Cafe Context

```javascript
// Update cafe context with current data
const context = await fetch('http://localhost:3000/api/agent/context/cafe_123', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    cafeName: 'The Digital Brew',
    orderStats: [
      { item: 'Cappuccino', count: 45, revenue: 157.50 },
      { item: 'Espresso', count: 32, revenue: 96.00 },
      { item: 'Latte', count: 28, revenue: 112.00 }
    ],
    peakHours: [
      { hour: 8, customerCount: 23, orderCount: 35 },
      { hour: 14, customerCount: 31, orderCount: 42 }
    ],
    popularInterests: ['coding', 'design', 'coffee', 'indie music'],
    upcomingEvents: [
      {
        name: 'Coffee Tasting Workshop',
        date: new Date('2024-02-15T18:00:00'),
        description: 'Learn about different coffee origins',
        attendeeCount: 12
      }
    ],
    customKnowledge: 'We source beans from small farms in Colombia and Ethiopia. Our house blend is called "Digital Dreams".',
    totalCustomers: 156,
    averageOrderValue: 4.25
  })
}).then(res => res.json());

console.log('Context updated for:', context.cafeName);
```

### 5. Generate Proactive Message

```javascript
// When a milestone is reached
const message = await fetch('http://localhost:3000/api/agent/proactive-message', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    cafeId: 'cafe_123',
    trigger: 'milestone',
    metadata: {
      milestone: '1000 customers',
      totalOrders: 1247,
      topItem: 'Cappuccino'
    }
  })
}).then(res => res.json());

console.log('Proactive message:', message.message);
// Example: "🎉 Incredible! We just served our 1000th customer!
//           Thanks to all of you for making this cafe special!"
```

### 6. Get Analytics

```javascript
// Get today's analytics
const analytics = await fetch('http://localhost:3000/api/agent/analytics/cafe_123')
  .then(res => res.json());

console.log(`Total queries: ${analytics.totalQueries}`);
console.log(`Cache hit rate: ${analytics.cacheHitRate.toFixed(1)}%`);
console.log(`Average response time: ${analytics.averageResponseTime}ms`);
console.log('Popular questions:');
analytics.popularQuestions.forEach((q, i) => {
  console.log(`${i + 1}. "${q.question}" (asked ${q.count} times)`);
});

// Get specific date
const historicalAnalytics = await fetch(
  'http://localhost:3000/api/agent/analytics/cafe_123?date=2024-01-15'
).then(res => res.json());
```

### 7. Pre-generate Common Responses

```javascript
// Trigger pre-generation (runs in background)
const response = await fetch('http://localhost:3000/api/agent/pregenerate/cafe_123', {
  method: 'POST'
}).then(res => res.json());

console.log(response.message); // "Pre-generation started"
// Common questions will be cached for faster responses
```

## Socket.IO Examples

### 1. Basic Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/agent');

socket.on('connect', () => {
  console.log('Connected to agent namespace');
});

socket.on('disconnect', () => {
  console.log('Disconnected from agent namespace');
});
```

### 2. Streaming Query

```javascript
const socket = io('http://localhost:3000/agent');

function askQuestion(cafeId, question, userId) {
  return new Promise((resolve, reject) => {
    let fullResponse = '';
    const startTime = Date.now();

    // Emit query
    socket.emit('query:stream', {
      cafeId,
      question,
      userId
    });

    // Query started
    socket.on('query:start', (data) => {
      console.log('Query started:', data.queryId);
    });

    // Receive chunks
    socket.on('query:chunk', (data) => {
      process.stdout.write(data.chunk); // Print as it streams
      fullResponse += data.chunk;
    });

    // Query complete
    socket.on('query:complete', (data) => {
      console.log('\n--- Complete ---');
      console.log(`Response time: ${data.responseTime}ms`);
      console.log(`Queries remaining: ${data.remaining}`);
      resolve(data);
    });

    // Handle errors
    socket.on('query:error', (data) => {
      console.error('Error:', data.error);
      reject(new Error(data.error));
    });
  });
}

// Usage
askQuestion('cafe_123', "What's popular right now?", 'user_456')
  .then(data => console.log('Done!'))
  .catch(err => console.error('Failed:', err));
```

### 3. Join Cafe for Proactive Messages

```javascript
const socket = io('http://localhost:3000/agent');

// Join cafe room
socket.emit('cafe:join', {
  cafeId: 'cafe_123',
  userId: 'user_456'
});

// Confirm joined
socket.on('cafe:joined', (data) => {
  console.log(`Joined cafe: ${data.cafeId}`);
});

// Listen for proactive messages
socket.on('proactive:message', (data) => {
  console.log('\n=== Agent Announcement ===');
  console.log(data.message);
  console.log(`Cafe: ${data.cafeId}`);
  console.log(`Time: ${data.timestamp}`);
  console.log('=========================\n');
});

// Leave when done
function leaveCafe(cafeId) {
  socket.emit('cafe:leave', { cafeId });
  socket.on('cafe:left', () => {
    console.log('Left cafe room');
  });
}
```

### 4. React Integration

```jsx
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

function AgentChat({ cafeId, userId }) {
  const [socket, setSocket] = useState(null);
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [streaming, setStreaming] = useState(false);

  useEffect(() => {
    const newSocket = io('http://localhost:3000/agent');
    setSocket(newSocket);

    // Join cafe for proactive messages
    newSocket.emit('cafe:join', { cafeId, userId });

    return () => newSocket.close();
  }, [cafeId, userId]);

  useEffect(() => {
    if (!socket) return;

    socket.on('query:start', () => {
      setStreaming(true);
      setResponse('');
    });

    socket.on('query:chunk', (data) => {
      setResponse(prev => prev + data.chunk);
    });

    socket.on('query:complete', () => {
      setStreaming(false);
    });

    socket.on('query:error', (data) => {
      setStreaming(false);
      alert(`Error: ${data.error}`);
    });

    socket.on('proactive:message', (data) => {
      // Show notification or toast
      console.log('Agent says:', data.message);
    });
  }, [socket]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!question.trim() || !socket) return;

    socket.emit('query:stream', {
      cafeId,
      question,
      userId
    });

    setQuestion('');
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask the agent..."
          disabled={streaming}
        />
        <button type="submit" disabled={streaming}>
          {streaming ? 'Thinking...' : 'Ask'}
        </button>
      </form>

      {response && (
        <div className="response">
          <p>{response}</p>
          {streaming && <span className="cursor">▊</span>}
        </div>
      )}
    </div>
  );
}
```

## Integration Examples

### 1. Express Middleware for Rate Limiting

```javascript
import { RateLimiter } from './rate-limiter';

const limiter = new RateLimiter(redisCacheService);

app.use('/api/agent/query', async (req, res, next) => {
  const { userId } = req.body;

  const allowed = await limiter.checkLimit(userId);
  if (!allowed) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: await limiter.getRetryAfter(userId)
    });
  }

  next();
});
```

### 2. Scheduled Proactive Messages

```javascript
import cron from 'node-cron';
import { broadcastProactiveMessage } from './socket/agent-socket.handler';

// Send daily stats at 6 PM
cron.schedule('0 18 * * *', async () => {
  const cafes = await getAllCafes();

  for (const cafe of cafes) {
    const config = await getAgentConfig(cafe.id);
    const context = await getCafeContext(cafe.id);

    if (config.proactivity !== 'silent') {
      const message = await claudeAgentService.generateProactiveMessage(
        config,
        context,
        'scheduled',
        { time: 'evening', type: 'daily_recap' }
      );

      broadcastProactiveMessage(io, cafe.id, message);
    }
  }
});
```

### 3. Event-Driven Proactive Messages

```javascript
import EventEmitter from 'events';

class CafeEvents extends EventEmitter {}
const cafeEvents = new CafeEvents();

// Listen for events
cafeEvents.on('order:milestone', async (data) => {
  const { cafeId, orderCount, milestone } = data;

  const config = await getAgentConfig(cafeId);
  if (config.proactivity === 'silent') return;

  const context = await getCafeContext(cafeId);
  const message = await claudeAgentService.generateProactiveMessage(
    config,
    context,
    'milestone',
    { orderCount, milestone }
  );

  broadcastProactiveMessage(io, cafeId, message);
});

// Emit when milestone reached
if (orderCount % 100 === 0) {
  cafeEvents.emit('order:milestone', {
    cafeId: cafe.id,
    orderCount,
    milestone: orderCount
  });
}
```

### 4. Testing with Jest

```javascript
import { ClaudeAgentService } from './services/claude-agent.service';

describe('ClaudeAgentService', () => {
  let service;

  beforeEach(() => {
    service = new ClaudeAgentService();
  });

  test('validates questions correctly', async () => {
    const valid = await service.validateQuestion('What is popular today?');
    expect(valid.valid).toBe(true);

    const empty = await service.validateQuestion('');
    expect(empty.valid).toBe(false);
    expect(empty.reason).toBe('Question cannot be empty');

    const tooLong = await service.validateQuestion('a'.repeat(501));
    expect(tooLong.valid).toBe(false);
  });

  test('returns fallback response on API failure', async () => {
    // Mock API failure
    service.anthropic.messages.create = jest.fn().mockRejectedValue(
      new Error('API Error')
    );

    const result = await service.queryAgent(
      'What should I order?',
      mockConfig,
      mockContext,
      'user_123'
    );

    expect(result.response).toContain('trouble connecting');
  });
});
```

### 5. Monitoring and Logging

```javascript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Log all agent queries
app.post('/api/agent/query', async (req, res) => {
  const startTime = Date.now();
  const { cafeId, userId, question } = req.body;

  try {
    const result = await claudeAgentService.queryAgent(
      question,
      config,
      context,
      userId
    );

    logger.info('Agent query successful', {
      cafeId,
      userId,
      questionLength: question.length,
      responseTime: result.responseTime,
      cached: result.cached
    });

    res.json(result);
  } catch (error) {
    logger.error('Agent query failed', {
      cafeId,
      userId,
      error: error.message,
      duration: Date.now() - startTime
    });

    res.status(500).json({ error: 'Internal server error' });
  }
});
```

## Error Handling Examples

### Client-Side Error Handling

```javascript
async function askAgent(cafeId, question, userId) {
  try {
    const response = await fetch('http://localhost:3000/api/agent/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cafeId, question, userId })
    });

    if (!response.ok) {
      const error = await response.json();

      if (response.status === 429) {
        // Rate limited
        return {
          error: 'You\'ve asked too many questions. Take a coffee break! ☕',
          retryAfter: error.retryAfter
        };
      }

      if (response.status === 400) {
        // Validation error
        return { error: error.error || 'Invalid question' };
      }

      throw new Error(error.error || 'Unknown error');
    }

    return await response.json();
  } catch (error) {
    console.error('Network error:', error);
    return {
      error: 'Connection failed. Please check your internet connection.',
      offline: true
    };
  }
}
```

## Performance Tips

1. **Use streaming for long responses**: Provides better UX
2. **Pre-cache common questions**: Run `/api/agent/pregenerate/:cafeId`
3. **Update context strategically**: Only when significant changes occur
4. **Monitor cache hit rate**: Aim for >40% for good performance
5. **Adjust rate limits**: Based on your usage patterns and costs

## Cost Optimization

```javascript
// Implement smart caching strategy
const CACHE_PRIORITIES = {
  high: ['what', 'popular', 'recommend', 'busy'],
  medium: ['how', 'when', 'where'],
  low: ['why', 'tell me about']
};

function getCacheTTL(question) {
  const lower = question.toLowerCase();

  for (const priority of CACHE_PRIORITIES.high) {
    if (lower.includes(priority)) return 7200; // 2 hours
  }

  for (const priority of CACHE_PRIORITIES.medium) {
    if (lower.includes(priority)) return 3600; // 1 hour
  }

  return 1800; // 30 minutes for low priority
}
```
