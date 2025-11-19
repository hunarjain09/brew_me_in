# Component Integration Guide

## Overview

This document describes how Components 1, 2, and 3 integrate together in the brew_me_in system.

## Component Status

- **Component 1 (Auth & User Management)**: ✅ IMPLEMENTED
- **Component 2 (Real-time Chat)**: ✅ IMPLEMENTED
- **Component 3 (Rate Limiting & Spam Prevention)**: ✅ IMPLEMENTED

## Integration Points

### 1. Authentication Flow (Component 1 → Component 2)

**Socket.io Authentication**:
- Component 2's `ChatHandler` uses JWT tokens from Component 1
- Socket middleware validates JWT using `config.jwtSecret` (line 44 in `chatHandler.ts`)
- User data (userId, username, cafeId) extracted from JWT and attached to socket

**Flow**:
```
User → Component 1: POST /api/auth/join
     ← JWT token returned
User → Component 2: WebSocket connection with JWT
     ← Socket authenticated, user can chat
```

### 2. Badge-Aware Rate Limiting (Component 1 + Component 3)

**Current State**: Component 2 has basic rate limiting (30 messages/minute, hardcoded)

**Integration Needed**: Use Component 3's sophisticated rate limiting

**Location**: `backend/src/socket/chatHandler.ts:218-228`

**Current Implementation**:
```typescript
// Basic rate limiting (Component 2)
const rateLimitKey = `message:ratelimit:${socket.data.userId}`;
const current = await redisClient.incr(rateLimitKey);
if (current === 1) {
  await redisClient.expire(rateLimitKey, 60); // 1 minute window
}
if (current > 30) {
  socket.emit('error', { message: 'Sending too fast.', code: 'RATE_LIMIT' });
  return;
}
```

**Enhanced Implementation** (using Component 3):
```typescript
import { rateLimitService } from '../services/rateLimitService';
import { spamDetectionService } from '../services/spamDetectionService';

// In handleSendMessage, before line 231:

// 1. Get user's badge status from Component 1
const userTier = socket.data.badgeStatus === 'active' ? 'badgeHolder' : 'free';

// 2. Check rate limit with Component 3
const rateLimitResult = await rateLimitService.checkRateLimit(
  socket.data.userId,
  'message',
  userTier
);

if (!rateLimitResult.allowed) {
  socket.emit('error', {
    message: rateLimitResult.reason || 'Rate limit exceeded',
    code: 'RATE_LIMIT',
    retryAfter: rateLimitResult.retryAfter,
    resetAt: rateLimitResult.resetAt,
  });
  return;
}

// 3. Check for spam with Component 3
const spamResult = await spamDetectionService.checkSpam({
  content: content.trim(),
  userId: socket.data.userId,
  timestamp: new Date(),
  cafeId,
});

if (spamResult.isSpam) {
  if (spamResult.action === 'block' || spamResult.action === 'mute') {
    socket.emit('error', {
      message: spamResult.message || 'Message blocked by spam filter',
      code: 'SPAM_DETECTED',
      violations: spamResult.violations,
      action: spamResult.action,
    });
    return;
  } else if (spamResult.action === 'warn') {
    // Send warning but allow message
    socket.emit('warning', {
      message: spamResult.message,
      violations: spamResult.violations,
    });
  }
}

// 4. Consume rate limit token
await rateLimitService.consumeMessageToken(socket.data.userId, userTier);

// Continue with message creation...
```

### 3. Badge Status in Socket Data

**Needed Enhancement**: Add badge status to socket.data during authentication

**Location**: `backend/src/socket/chatHandler.ts:34-54`

**Current Implementation**:
```typescript
this.io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  // ...
  const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;

  socket.data.userId = decoded.userId;
  socket.data.username = decoded.username;
  socket.data.cafeId = decoded.cafeId;

  next();
});
```

**Enhanced Implementation**:
```typescript
import { User } from '../models/User';

this.io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  // ...
  const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;

  socket.data.userId = decoded.userId;
  socket.data.username = decoded.username;
  socket.data.cafeId = decoded.cafeId;

  // Fetch badge status for rate limiting
  try {
    const user = await User.findById(decoded.userId);
    socket.data.badgeStatus = user?.badgeStatus || 'none';
  } catch (error) {
    socket.data.badgeStatus = 'none';
  }

  next();
});
```

**Update SocketData type** in `backend/src/types/index.ts`:
```typescript
export interface SocketData {
  userId: string;
  username: string;
  cafeId?: string;
  badgeStatus?: 'none' | 'active' | 'expired';  // ADD THIS
}
```

### 4. Redis Connection Sharing

**Status**: ✅ Already Integrated

All components use the same Redis connection:
- Component 1: Session storage
- Component 2: Message cache, presence, topics
- Component 3: Rate limiting, spam detection

**Connection**: `backend/src/db/redis.ts`

**Key Namespaces**:
```
Component 1 (Auth):
  - session:{sessionId}
  - user:{userId}:refresh_token

Component 2 (Chat):
  - cafe:{cafeId}:users
  - cafe:{cafeId}:messages
  - cafe:{cafeId}:topics
  - user:{userId}:presence

Component 3 (Rate Limiting):
  - ratelimit:message:{userId}
  - ratelimit:message:{userId}:last
  - ratelimit:agent:global
  - ratelimit:agent:{userId}:{sessionId}
  - ratelimit:poke:{userId}:count
  - spam:duplicate:{userId}
  - spam:mute:{userId}

Component 2 (Basic Rate Limit - TO BE REMOVED):
  - message:ratelimit:{userId}  ← Replace with Component 3
```

### 5. API Route Integration

**Status**: ✅ Already Integrated

All routes registered in `backend/src/routes/index.ts`:
```typescript
import authRoutes from './authRoutes';        // Component 1
import userRoutes from './userRoutes';        // Component 1
import badgeRoutes from './badgeRoutes';      // Component 1
import chatRoutes from './chatRoutes';        // Component 2
import rateLimitRoutes from './rateLimitRoutes'; // Component 3

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/badges', badgeRoutes);
router.use('/chat', chatRoutes);
router.use('/v1', rateLimitRoutes);  // Namespaced to avoid conflicts
```

### 6. Database Schema Integration

**Status**: ✅ Integrated

Component 2 added `messages` table to existing schema:

**File**: `backend/src/db/schema.sql`

**Tables by Component**:
- Component 1: `cafes`, `users`, `badges`, `tips`, `join_tokens`, `refresh_tokens`
- Component 2: `messages`
- Component 3: No tables (Redis-only)

## Implementation Checklist

### Completed ✅
- [x] All components use shared Redis connection
- [x] Socket.io uses JWT from Component 1
- [x] All API routes registered and namespaced
- [x] Database schema includes all tables
- [x] Server startup integrates all components
- [x] Documentation for all components

### Pending Integration 🔄
- [ ] Replace basic rate limiting in `chatHandler.ts` with Component 3 services
- [ ] Add spam detection to `message:send` event
- [ ] Include badge status in socket authentication
- [ ] Apply tier-based rate limits (free vs badge holders)
- [ ] Add cooldown enforcement between messages
- [ ] Remove redundant `message:ratelimit:{userId}` Redis keys

## File Locations

### Component 1 (Auth & User Management)
```
backend/src/
├── controllers/
│   ├── authController.ts
│   ├── userController.ts
│   └── badgeController.ts
├── models/
│   ├── User.ts
│   ├── Badge.ts
│   ├── Tip.ts
│   ├── JoinToken.ts
│   └── Cafe.ts
├── routes/
│   ├── authRoutes.ts
│   ├── userRoutes.ts
│   └── badgeRoutes.ts
└── utils/
    ├── jwt.ts
    └── networkValidation.ts
```

### Component 2 (Real-time Chat)
```
backend/src/
├── controllers/
│   └── chatController.ts
├── models/
│   └── Message.ts
├── routes/
│   └── chatRoutes.ts
└── socket/
    └── chatHandler.ts  ← NEEDS INTEGRATION
```

### Component 3 (Rate Limiting & Spam Prevention)
```
backend/src/
├── config/
│   ├── env.ts
│   ├── logger.ts
│   └── redis.ts  ← SHARED BY ALL
├── controllers/
│   └── rateLimitController.ts
├── middleware/
│   ├── errorHandler.ts
│   └── rateLimitMiddleware.ts
├── routes/
│   └── rateLimitRoutes.ts
├── services/
│   ├── rateLimitService.ts  ← USE IN chatHandler.ts
│   └── spamDetectionService.ts  ← USE IN chatHandler.ts
├── types/
│   ├── api.ts
│   └── rateLimit.ts
└── utils/
    └── apiResponse.ts
```

## Testing Integration

### Test Badge-Aware Rate Limiting

1. **Create free user (no badge)**:
   - Send 30 messages in 1 hour → Should succeed
   - Send 31st message → Should be rate limited
   - Wait 30 seconds → Should be able to send again (cooldown)

2. **Create badge holder**:
   - Record 5 tips within 7 days
   - Send 60 messages in 1 hour → Should succeed
   - Send 61st message → Should be rate limited
   - Wait 15 seconds → Should be able to send again (shorter cooldown)

### Test Spam Detection

1. **Duplicate messages**:
   - Send same message twice within 5 minutes → Second should be blocked

2. **Excessive caps**:
   - Send "HELLO THIS IS SPAM" → Should be warned or blocked

3. **URL spam**:
   - Send message with 3+ URLs → Should be blocked

4. **Auto-mute**:
   - Trigger multiple spam violations → User should be muted for 24 hours

## Benefits of Integration

1. **Unified Rate Limiting**:
   - Badge holders get priority (60 vs 30 messages/hour)
   - Consistent rate limiting across REST and WebSocket APIs
   - Token bucket algorithm prevents burst abuse

2. **Spam Protection**:
   - Automatic detection of spam patterns
   - Progressive enforcement (warn → block → mute)
   - Protects chat quality and user experience

3. **Shared Infrastructure**:
   - Single Redis connection for all components
   - Consistent logging with Winston
   - Unified configuration management

4. **Scalability**:
   - Redis-backed rate limiting works across multiple server instances
   - Fail-safe design (allows requests if Redis is down)
   - Efficient token bucket algorithm

## Next Steps

To fully integrate Component 3 with Component 2:

1. **Update `backend/src/socket/chatHandler.ts`**:
   - Import `rateLimitService` and `spamDetectionService`
   - Replace basic rate limiting (lines 218-228)
   - Add spam detection before message creation
   - Add badge status to socket authentication

2. **Update `backend/src/types/index.ts`**:
   - Add `badgeStatus` to `SocketData` interface

3. **Test the integration**:
   - Verify badge-aware rate limiting works
   - Test spam detection in real-time chat
   - Confirm mute functionality blocks messages

4. **Remove redundant code**:
   - Delete old rate limiting keys from Redis
   - Update documentation

## Support

For questions about component integration:
- Review `ARCHITECTURE.md` for technical details
- Check `Claude.md` for development guidelines
- See individual component docs: `CHAT_SYSTEM.md`, etc.

---

**Last Updated**: 2025-11-19
**Status**: Components 1, 2, 3 merged; integration pending
