# Chat System Documentation

## Overview

The brew_me_in chat system (Component 2) enables real-time communication between cafe visitors using WebSockets (Socket.io) and REST APIs.

## Architecture

### Technologies
- **Socket.io**: WebSocket library for real-time bidirectional communication
- **Redis**: Message caching, user presence tracking, and live topic extraction
- **PostgreSQL**: Persistent message storage
- **Express**: REST API endpoints for message history

### Components

1. **Socket Handler** (`src/socket/chatHandler.ts`)
   - Manages WebSocket connections
   - Handles real-time events (join, leave, message, typing)
   - Broadcasts messages to cafe rooms
   - Tracks user presence

2. **Message Model** (`src/models/Message.ts`)
   - Database operations for messages
   - Message creation and retrieval
   - Soft deletion support

3. **Chat Controller** (`src/controllers/chatController.ts`)
   - REST API endpoints
   - Message history retrieval
   - Presence and topic endpoints

4. **Chat Routes** (`src/routes/chatRoutes.ts`)
   - API route definitions
   - Authentication middleware

## Database Schema

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  username VARCHAR(50) NOT NULL,
  cafe_id UUID REFERENCES cafes(id),
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'user',
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

### Message Types
- `user`: Regular user messages
- `agent`: AI agent responses (future)
- `system`: System notifications (join/leave)
- `barista`: Messages from cafe staff

## Redis Data Structures

### Active Users
```
SET cafe:{cafeId}:users -> [userId1, userId2, ...]
TTL: 30 minutes
```

### User Presence
```
HASH user:{userId}:presence -> {
  online: 'true',
  inCafe: 'true',
  cafeId: 'uuid',
  lastSeen: '2025-11-19T...'
}
TTL: 1 hour
```

### Recent Messages Cache
```
LIST cafe:{cafeId}:messages -> [message1, message2, ...]
Limit: 100 messages
TTL: 1 hour
```

### Live Topics
```
ZSET cafe:{cafeId}:topics -> { "coffee": 8, "music": 5 }
TTL: 1 hour
```

## Socket.io Events

### Client → Server

#### `join:cafe`
Join a cafe chat room
```typescript
socket.emit('join:cafe', {
  cafeId: 'uuid',
  userId: 'uuid',
  location: { lat: 37.7749, lng: -122.4194 }
});
```

#### `leave:cafe`
Leave a cafe chat room
```typescript
socket.emit('leave:cafe', {
  cafeId: 'uuid'
});
```

#### `message:send`
Send a message to the cafe
```typescript
socket.emit('message:send', {
  content: 'Hello everyone!',
  cafeId: 'uuid'
});
```

#### `typing:start`
Indicate user is typing
```typescript
socket.emit('typing:start', {
  cafeId: 'uuid'
});
```

#### `presence:update`
Update user presence status
```typescript
socket.emit('presence:update', {
  inCafe: true,
  cafeId: 'uuid'
});
```

### Server → Client

#### `connected`
Confirmation of successful connection
```typescript
socket.on('connected', (data) => {
  // { userId: 'uuid', cafeId: 'uuid' }
});
```

#### `message:new`
New message received
```typescript
socket.on('message:new', (message) => {
  // {
  //   id: 'uuid',
  //   userId: 'uuid',
  //   username: 'HappyOtter42',
  //   cafeId: 'uuid',
  //   content: 'Hello!',
  //   messageType: 'user',
  //   createdAt: Date
  // }
});
```

#### `users:update`
Active user count updated
```typescript
socket.on('users:update', (data) => {
  // { total: 12, inCafe: 8 }
});
```

#### `typing:indicator`
Another user is typing
```typescript
socket.on('typing:indicator', (data) => {
  // { username: 'HappyOtter42', cafeId: 'uuid' }
});
```

#### `topics:update`
Trending topics updated
```typescript
socket.on('topics:update', (data) => {
  // { topics: [{ word: 'coffee', count: 8 }, ...] }
});
```

#### `error`
Error occurred
```typescript
socket.on('error', (data) => {
  // { message: 'Error message', code: 'ERROR_CODE' }
});
```

## REST API Endpoints

### GET `/api/chat/messages/:cafeId`
Retrieve message history for a cafe

**Query Parameters:**
- `limit`: Number of messages to retrieve (default: 50)
- `before`: Timestamp to get messages before (pagination)

**Response:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "userId": "uuid",
      "username": "HappyOtter42",
      "cafeId": "uuid",
      "content": "Hello!",
      "messageType": "user",
      "createdAt": "2025-11-19T..."
    }
  ]
}
```

### DELETE `/api/chat/messages/:messageId`
Delete a message (soft delete, user can only delete their own)

**Response:**
```json
{
  "success": true,
  "messageId": "uuid"
}
```

### GET `/api/chat/presence/:cafeId`
Get active users in a cafe

**Query Parameters:**
- `includeUsers`: Set to 'true' to include user list

**Response:**
```json
{
  "cafeId": "uuid",
  "total": 12,
  "inCafe": 8,
  "userList": ["userId1", "userId2"]
}
```

### GET `/api/chat/topics/:cafeId`
Get trending topics/words in a cafe

**Query Parameters:**
- `limit`: Number of topics to return (default: 10)

**Response:**
```json
{
  "topics": [
    { "word": "coffee", "count": 8 },
    { "word": "music", "count": 5 }
  ]
}
```

## Rate Limiting

### Message Sending
- **Limit**: 30 messages per minute per user
- **Implementation**: Redis INCR with 60-second TTL
- **Error**: `RATE_LIMIT` error emitted to client

### API Endpoints
- Inherits from general API rate limiter
- Protected by authentication middleware

## Features

### Message Batching
Messages are buffered for 100ms before broadcasting to reduce socket spam.

### Topic Extraction
- Extracts words > 4 characters from messages
- Filters out URLs
- Stores in Redis sorted set by frequency
- Updates clients every 10 messages

### Message Persistence
- Messages written to PostgreSQL asynchronously
- Cached in Redis for quick retrieval (last 100 messages)
- Soft deletion supported

### Presence Tracking
- Tracks who's online vs who's physically in cafe
- 30-minute expiry for active user sets
- 1-hour expiry for presence data

### Connection Recovery
- Clients automatically rejoin cafe room on reconnection
- Recent messages loaded from cache/database

## Client Integration Example

```typescript
import io from 'socket.io-client';

// Connect with JWT token
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Listen for connection
socket.on('connected', (data) => {
  console.log('Connected:', data);

  // Join cafe
  socket.emit('join:cafe', {
    cafeId: 'cafe-uuid',
    userId: 'user-uuid'
  });
});

// Listen for messages
socket.on('message:new', (message) => {
  console.log('New message:', message);
});

// Send message
const sendMessage = (content: string, cafeId: string) => {
  socket.emit('message:send', { content, cafeId });
};

// Clean up on unmount
socket.on('disconnect', () => {
  console.log('Disconnected');
});
```

## Testing

### Manual Testing with WebSocket Client

1. Install wscat: `npm install -g wscat`
2. Generate a JWT token via `/api/auth/join`
3. Connect:
```bash
wscat -c ws://localhost:3000 -H "Authorization: Bearer YOUR_TOKEN"
```

### Testing REST Endpoints

```bash
# Get messages
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/chat/messages/CAFE_ID

# Get presence
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/chat/presence/CAFE_ID

# Get topics
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/chat/topics/CAFE_ID
```

## Security

### Authentication
- All Socket.io connections require valid JWT token
- Token verified in middleware before connection established
- Invalid tokens rejected with error

### Message Validation
- Content cannot be empty
- Maximum length: 1000 characters
- Rate limiting prevents spam

### Authorization
- Users can only delete their own messages
- Cafe membership verified before joining room

## Performance Optimizations

1. **Redis Caching**: Last 100 messages cached for instant load
2. **Connection Pooling**: PostgreSQL connection pool configured
3. **Message Batching**: Reduces socket overhead
4. **TTL Expiry**: Automatic cleanup of old presence/cache data

## Future Enhancements

- [ ] Implement message reactions/emojis
- [ ] Add file/image upload support
- [ ] Implement message threads/replies
- [ ] Add user mentions (@username)
- [ ] Implement message search
- [ ] Add moderation tools (kick, mute)
- [ ] Support for multiple cafe rooms per user
- [ ] Message delivery receipts
- [ ] Typing indicator optimization

## Troubleshooting

### Connection Issues
- Verify JWT token is valid and not expired
- Check CORS settings in config
- Ensure Redis is running and accessible

### Messages Not Persisting
- Check PostgreSQL connection
- Verify `messages` table exists
- Check database logs for errors

### Users Not Showing as Active
- Verify Redis connection
- Check TTL settings
- Ensure `join:cafe` event is emitted

## Maintenance

### Database Cleanup
Run periodically to remove old messages:
```sql
SELECT cleanup_old_messages(); -- Removes messages > 7 days old
```

### Redis Monitoring
```bash
redis-cli
> KEYS cafe:*
> ZRANGE cafe:CAFE_ID:topics 0 -1 WITHSCORES
```

---

**Status**: ✅ Component 2 (Real-Time Chat) - IMPLEMENTED
**Last Updated**: 2025-11-19
**Version**: 1.0.0
