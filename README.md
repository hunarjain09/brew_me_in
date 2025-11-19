# brew_me_in

A location-based social networking app for coffee shops, enabling temporary connections and AI-powered conversations between cafe visitors.

## Overview

brew_me_in creates ephemeral social experiences within coffee shops by:
- Generating temporary usernames for customers upon purchase
- Enabling real-time chat with AI agent assistance
- Rewarding regular customers with badges and perks
- Validating physical presence through WiFi/geofencing
- **Interest-based matching and poke system for 1:1 connections**
- **Privacy-first direct messaging for matched users**

## Implementation Status

- **Component 1 (Auth & User Management)**: ✅ IMPLEMENTED
- **Component 2 (Real-time Chat)**: 🚧 PLANNED
- **Component 3 (Rate Limiting)**: 🚧 PLANNED
- **Component 4 (Interest Matching & Pokes)**: ✅ IMPLEMENTED
- **Component 5 (AI Agent Integration)**: 🚧 PLANNED
- **Component 6 (Admin Dashboard)**: 🚧 PLANNED
- **Component 7 (Network Validation)**: ✅ IMPLEMENTED (basic)
- **Component 8 (Background Jobs)**: 🚧 PLANNED

## Tech Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (user data, chat history, interests, pokes)
- **Cache**: Redis (sessions, rate limiting)
- **Real-time**: Socket.io (WebSocket connections for notifications)
- **AI**: Anthropic Claude API
- **Authentication**: JWT tokens
- **Background Jobs**: node-cron (poke expiration)

### Frontend
- React Native (iOS/Android)
- React Web
- Socket.io Client

## Project Structure

```
brew_me_in/
├── backend/
│   ├── src/
│   │   ├── config/         # Configuration management
│   │   ├── controllers/    # Request handlers
│   │   ├── db/            # Database connections and schemas
│   │   ├── middleware/    # Auth, validation, rate limiting
│   │   ├── models/        # Data models
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic services
│   │   ├── jobs/          # Background job schedulers
│   │   ├── utils/         # Utilities (JWT, validation)
│   │   ├── types/         # TypeScript interfaces
│   │   ├── app.ts         # Express app setup
│   │   └── index.ts       # Server entry point
│   ├── package.json
│   └── tsconfig.json
├── ARCHITECTURE.md         # Detailed architecture docs
├── Claude.md               # AI agent development guide
├── LIQUID_GLASS_DESIGN_GUIDE.md  # Design system
└── README.md               # This file
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 7+ (for sessions and rate limiting)
- npm or yarn

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration:
   - Database credentials
   - Redis connection
   - JWT secrets
   - Anthropic API key
   - Rate limiting configuration

4. **Set up database**

   Create PostgreSQL database:
   ```bash
   createdb brew_me_in
   ```

   Run migrations:
   ```bash
   npm run migrate
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3000`

### Production Build

```bash
npm run build
npm start
```

---

## API Documentation

All authenticated endpoints require `Authorization: Bearer <token>` header.

### Health Check

```http
GET /health

Response:
{
  "status": "healthy",
  "timestamp": "2025-11-19T10:00:00.000Z",
  "uptime": 123.456,
  "connectedUsers": 5
}
```

---

### Authentication Endpoints

#### Generate Username (Barista)
```http
POST /api/auth/barista/generate-username
Content-Type: application/json

{
  "cafeId": "uuid",
  "receiptId": "string"
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
  "wifiSsid": "CafeWiFi-Guest",  // Optional
  "latitude": 37.7749,            // Optional
  "longitude": -122.4194          // Optional
}

Response:
{
  "accessToken": "jwt-token",
  "refreshToken": "jwt-refresh-token",
  "user": { ... }
}
```

#### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "jwt-refresh-token"
}

Response:
{
  "accessToken": "new-jwt-token",
  "user": { ... }
}
```

---

### User Endpoints

#### Get Current User
```http
GET /api/users/me

Response:
{
  "user": {
    "id": "uuid",
    "username": "HappyOtter42",
    "cafeId": "uuid",
    "badgeStatus": "active",
    "tipCount": 7,
    "pokeEnabled": true,
    ...
  }
}
```

#### Update Interests
```http
PUT /api/users/me/interests
Content-Type: application/json

{
  "interests": ["coffee", "tech", "music"]
}
```

#### Toggle Poke Feature
```http
PATCH /api/users/me/poke-enabled
Content-Type: application/json

{
  "enabled": true
}
```

---

### Component 4: Interest Matching & Poke System

#### Discover Users with Shared Interests

Find users in the same cafe with shared interests, prioritized by number of matches.

```http
GET /api/matching/discover?cafeId=uuid&interests=coffee,books&limit=20&offset=0

Response:
{
  "success": true,
  "data": [
    {
      "userId": "uuid",
      "username": "HappyOtter42",
      "sharedInterests": ["coffee", "books"],
      "totalSharedInterests": 2
    }
  ],
  "count": 1
}
```

#### Get User Interests

```http
GET /api/matching/interests

Response:
{
  "success": true,
  "data": ["coffee", "books", "music"]
}
```

#### Set User Interests

Replace all interests for the current user.

```http
POST /api/matching/interests
Content-Type: application/json

{
  "interests": ["coffee", "books", "music"]
}

Response:
{
  "success": true,
  "message": "Interests updated successfully"
}
```

#### Add Single Interest

```http
POST /api/matching/interests/add
Content-Type: application/json

{
  "interest": "hiking"
}
```

#### Remove Single Interest

```http
POST /api/matching/interests/remove
Content-Type: application/json

{
  "interest": "hiking"
}
```

---

### Poke System

The poke system enables privacy-first connections between users. Features:
- Rate limited: 10 pokes per hour (configurable)
- Mutual reveal: Can't see who poked you until you poke back
- Auto-expiration: Pokes expire after 24 hours
- Match creation: Mutual pokes create DM channels

#### Send Poke

```http
POST /api/pokes/send
Content-Type: application/json

{
  "toUserId": "uuid",
  "sharedInterest": "coffee"
}

Response:
{
  "success": true,
  "data": {
    "id": "poke-uuid",
    "fromUserId": "sender-uuid",
    "toUserId": "recipient-uuid",
    "sharedInterest": "coffee",
    "status": "pending",
    "createdAt": "2025-11-19T10:00:00.000Z",
    "expiresAt": "2025-11-20T10:00:00.000Z"
  },
  "message": "Poke sent successfully"
}

Errors:
- 404: User not found or has pokes disabled
- 409: Pending poke already exists or cannot poke yourself
- 429: Rate limit exceeded (10 pokes/hour)
```

#### Respond to Poke

Accept or decline a poke. If both users have poked each other, a DM channel is created.

```http
POST /api/pokes/respond
Content-Type: application/json

{
  "pokeId": "uuid",
  "action": "accept"  // or "decline"
}

Response (No Match):
{
  "success": true,
  "data": {
    "poke": { ... },
    "matched": false
  },
  "message": "Poke accepted"
}

Response (Match!):
{
  "success": true,
  "data": {
    "poke": { ... },
    "matched": true,
    "channelId": "dm-channel-uuid"
  },
  "message": "It's a match! DM channel created"
}
```

#### Get Pending Pokes (Incoming)

```http
GET /api/pokes/pending

Response:
{
  "success": true,
  "data": [
    {
      "id": "poke-uuid",
      "fromUserId": "sender-uuid",
      "toUserId": "your-uuid",
      "sharedInterest": "coffee",
      "status": "pending",
      "createdAt": "2025-11-19T10:00:00.000Z",
      "expiresAt": "2025-11-20T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

#### Get Sent Pokes (Outgoing)

```http
GET /api/pokes/sent

Response:
{
  "success": true,
  "data": [ ... ],
  "count": 5
}
```

---

### Direct Messaging

DM channels are created automatically when two users mutually poke each other.

#### Get DM Channels

```http
GET /api/dm/channels

Response:
{
  "success": true,
  "data": [
    {
      "channelId": "uuid",
      "user1Id": "uuid",
      "user2Id": "uuid",
      "cafeId": "uuid",
      "createdAt": "2025-11-19T10:00:00.000Z",
      "lastMessageAt": "2025-11-19T11:00:00.000Z"
    }
  ],
  "count": 1
}
```

#### Get Channel Messages

```http
GET /api/dm/:channelId/messages?limit=50&offset=0

Response:
{
  "success": true,
  "data": [
    {
      "id": "message-uuid",
      "channelId": "channel-uuid",
      "senderId": "sender-uuid",
      "content": "Hey! Love coffee too!",
      "createdAt": "2025-11-19T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

#### Send Message

```http
POST /api/dm/:channelId/messages
Content-Type: application/json

{
  "content": "Hey! Love coffee too!"
}

Response:
{
  "success": true,
  "data": {
    "id": "message-uuid",
    "channelId": "channel-uuid",
    "senderId": "your-uuid",
    "content": "Hey! Love coffee too!",
    "createdAt": "2025-11-19T10:00:00.000Z"
  },
  "message": "Message sent successfully"
}
```

#### Delete Message

```http
DELETE /api/dm/messages/:messageId

Response:
{
  "success": true,
  "message": "Message deleted successfully"
}
```

---

### Real-Time Notifications (Socket.IO)

Connect to Socket.IO for real-time poke and message notifications:

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

// Authenticate
socket.emit('authenticate', 'your-user-uuid');

// Listen for notifications
socket.on('notification', (notification) => {
  console.log(notification);
  /*
  {
    type: 'poke_received' | 'poke_matched' | 'dm_message',
    data: {
      pokeId?: string,
      fromUserId?: string,
      channelId?: string,
      message?: string
    }
  }
  */
});
```

**Notification Types:**
1. `poke_received` - Someone poked you
2. `poke_matched` - Mutual poke created a DM channel
3. `dm_message` - New DM message received

---

## Database Schema

### Core Tables (Component 1)
- `users` - User accounts with temporary expiration
- `cafes` - Cafe locations and configuration
- `badges` - Badge tracking for regular customers
- `tips` - Customer purchase records
- `join_tokens` - Barista-generated join tokens

### Interest Matching Tables (Component 4)
- `user_interests` - User interest mappings
- `pokes` - Poke records with status and expiration
- `dm_channels` - Direct message conversation channels
- `dm_messages` - DM message history

See `backend/src/db/schema.sql` for complete schema definitions.

---

## Background Jobs

### Poke Expiration Job
Runs every 5 minutes to expire pokes older than 24 hours.

**Location:** `backend/src/jobs/poke-expiration.job.ts`

---

## Configuration

Environment variables (`.env`):

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=brew_me_in
DB_USER=postgres
DB_PASSWORD=your-password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# Anthropic
ANTHROPIC_API_KEY=sk-...

# Rate Limiting (Poke System)
POKE_RATE_LIMIT_WINDOW_MS=3600000  # 1 hour
POKE_RATE_LIMIT_MAX=10             # 10 pokes per hour

# Poke Expiration
POKE_EXPIRATION_HOURS=24
```

---

## Development

### Available Scripts

```bash
# Start development server (auto-reload)
npm run dev

# Build TypeScript
npm run build

# Start production server
npm start

# Run database migrations
npm run migrate

# Type checking
npx tsc --noEmit
```

### Testing Locally

Use the provided API examples with tools like:
- curl
- Postman
- Thunder Client (VS Code)

---

## Key Features

### Privacy-First Poke System
- Users can't see who poked them until they poke back
- Only mutual pokes create DM channels
- Pokes expire after 24 hours for privacy

### Intelligent Matching Algorithm
- Prioritizes users with multiple shared interests
- Filters out poke-disabled users
- Excludes users you've already matched with

### Rate Limiting
- Prevents spam: 10 pokes per hour (configurable)
- No rate limit on DM messages within matched channels
- Redis-backed token bucket algorithm

### Real-Time Updates
- Instant notifications for pokes and messages
- WebSocket-based for low latency
- Automatic reconnection handling

---

## Documentation

- **Architecture Guide**: See `ARCHITECTURE.md`
- **AI Agent Guide**: See `Claude.md` for development guidelines
- **Design System**: See `LIQUID_GLASS_DESIGN_GUIDE.md`
- **Database Schema**: See `backend/src/db/schema.sql`

---

## License

MIT

---

## Support

For issues and questions, please check the documentation or open an issue on GitHub.
