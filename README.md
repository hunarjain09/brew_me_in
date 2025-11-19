# Brew Me In - Interest Matching & Poke System

A social networking platform for cafes that enables interest-based user discovery, poke matching, and direct messaging.

## Features

- **Interest-Based Discovery**: Find users with shared interests in your cafe
- **Poke System**: Send pokes to interesting users with privacy protection
- **Mutual Matching**: Create DM channels when both users poke each other
- **Direct Messaging**: Chat privately with matched users
- **Real-Time Notifications**: Socket.IO powered notifications for pokes and messages
- **Rate Limiting**: Prevent spam with configurable rate limits
- **Auto-Expiration**: Pokes automatically expire after 24 hours

## Tech Stack

- **Backend**: Node.js + TypeScript + Express
- **Database**: PostgreSQL
- **Real-Time**: Socket.IO
- **Background Jobs**: node-cron

## Getting Started

### Prerequisites

- Node.js >= 18
- PostgreSQL >= 14
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd brew_me_in
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. Set up the database:
```bash
# Create the database
createdb brew_me_in

# Run migrations
npm run migrate
```

5. Start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:3000`

### Build for Production

```bash
npm run build
npm start
```

## API Documentation

### Authentication

All endpoints (except `/health`) require authentication via the `X-User-Id` header:

```http
X-User-Id: <user-uuid>
```

> **Note**: In production, replace this with proper JWT authentication.

### Endpoints

#### Health Check

**GET** `/health`

Returns server health status.

```json
{
  "status": "healthy",
  "timestamp": "2025-11-19T10:00:00.000Z",
  "uptime": 123.456,
  "connectedUsers": 5
}
```

---

### Interest Matching

#### Discover Users

**GET** `/api/matching/discover`

Find users with shared interests.

**Query Parameters:**
- `cafeId` (required): UUID of the cafe
- `interests` (optional): Comma-separated list of interests
- `limit` (optional): Max results (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Example:**
```http
GET /api/matching/discover?cafeId=123e4567-e89b-12d3-a456-426614174000&interests=coffee,books&limit=10
X-User-Id: user-uuid
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "userId": "user-uuid",
      "username": "johndoe",
      "sharedInterests": ["coffee", "books"],
      "totalSharedInterests": 2
    }
  ],
  "count": 1
}
```

#### Get User Interests

**GET** `/api/matching/interests`

Get current user's interests.

**Response:**
```json
{
  "success": true,
  "data": ["coffee", "books", "music"]
}
```

#### Set User Interests

**POST** `/api/matching/interests`

Replace all user interests.

**Request Body:**
```json
{
  "interests": ["coffee", "books", "music"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Interests updated successfully"
}
```

#### Add Interest

**POST** `/api/matching/interests/add`

Add a single interest.

**Request Body:**
```json
{
  "interest": "hiking"
}
```

#### Remove Interest

**POST** `/api/matching/interests/remove`

Remove a single interest.

**Request Body:**
```json
{
  "interest": "hiking"
}
```

---

### Poke System

#### Send Poke

**POST** `/api/pokes/send`

Send a poke to another user.

**Rate Limit:** 10 pokes per hour (configurable)

**Request Body:**
```json
{
  "toUserId": "recipient-uuid",
  "sharedInterest": "coffee"
}
```

**Response:**
```json
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
```

**Errors:**
- `404`: User not found or has pokes disabled
- `409`: Pending poke already exists or cannot poke yourself
- `429`: Rate limit exceeded

#### Respond to Poke

**POST** `/api/pokes/respond`

Accept or decline a poke.

**Request Body:**
```json
{
  "pokeId": "poke-uuid",
  "action": "accept"  // or "decline"
}
```

**Response (No Match):**
```json
{
  "success": true,
  "data": {
    "poke": { /* poke object */ },
    "matched": false
  },
  "message": "Poke accepted"
}
```

**Response (Match!):**
```json
{
  "success": true,
  "data": {
    "poke": { /* poke object */ },
    "matched": true,
    "channelId": "channel-uuid"
  },
  "message": "It's a match! DM channel created"
}
```

#### Get Pending Pokes

**GET** `/api/pokes/pending`

Get incoming pokes.

**Response:**
```json
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

#### Get Sent Pokes

**GET** `/api/pokes/sent`

Get outgoing pokes.

---

### Direct Messaging

#### Get DM Channels

**GET** `/api/dm/channels`

Get all DM conversations.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "channelId": "channel-uuid",
      "user1Id": "user-uuid-1",
      "user2Id": "user-uuid-2",
      "cafeId": "cafe-uuid",
      "createdAt": "2025-11-19T10:00:00.000Z",
      "lastMessageAt": "2025-11-19T11:00:00.000Z"
    }
  ],
  "count": 1
}
```

#### Get Channel Messages

**GET** `/api/dm/:channelId/messages`

Get messages from a DM channel.

**Query Parameters:**
- `limit` (optional): Max messages (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
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

**POST** `/api/dm/:channelId/messages`

Send a message in a DM channel.

**Request Body:**
```json
{
  "content": "Hey! Love coffee too!"
}
```

**Response:**
```json
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

**DELETE** `/api/dm/messages/:messageId`

Delete your own message.

**Response:**
```json
{
  "success": true,
  "message": "Message deleted successfully"
}
```

---

## Real-Time Notifications

Connect to Socket.IO for real-time notifications:

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

### Notification Types

1. **poke_received**: Someone poked you
2. **poke_matched**: Mutual poke - DM channel created
3. **dm_message**: New DM message received

---

## Database Schema

### Tables

- **users**: User accounts with poke preferences
- **cafes**: Cafe locations
- **user_interests**: User interest mappings
- **pokes**: Poke records with expiration
- **dm_channels**: DM conversation channels
- **dm_messages**: DM message history

See `src/db/schema.sql` for the complete schema.

---

## Background Jobs

### Poke Expiration Job

Runs every 5 minutes to expire pokes older than 24 hours.

Configured in `src/jobs/poke-expiration.job.ts`

---

## Configuration

Environment variables in `.env`:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=brew_me_in
DB_USER=postgres
DB_PASSWORD=postgres

# Rate Limiting
POKE_RATE_LIMIT_WINDOW_MS=3600000  # 1 hour
POKE_RATE_LIMIT_MAX=10             # 10 pokes per hour

# Poke Expiration
POKE_EXPIRATION_HOURS=24
```

---

## Project Structure

```
brew_me_in/
├── src/
│   ├── db/
│   │   ├── connection.ts      # Database connection pool
│   │   ├── schema.sql         # Database schema
│   │   └── migrate.ts         # Migration runner
│   ├── jobs/
│   │   └── poke-expiration.job.ts  # Background jobs
│   ├── middleware/
│   │   ├── auth.middleware.ts      # Authentication
│   │   └── rateLimit.middleware.ts # Rate limiting
│   ├── routes/
│   │   ├── matching.routes.ts  # Interest matching endpoints
│   │   ├── poke.routes.ts      # Poke system endpoints
│   │   └── dm.routes.ts        # DM endpoints
│   ├── services/
│   │   ├── matching.service.ts      # Matching logic
│   │   ├── poke.service.ts          # Poke logic
│   │   ├── dm.service.ts            # DM logic
│   │   └── notification.service.ts  # Socket.IO notifications
│   ├── types/
│   │   └── matching.types.ts   # TypeScript interfaces
│   └── index.ts                # Express server
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

---

## Key Features Explained

### Privacy-First Poke System

- Users can't see who poked them until they poke back
- Only mutual pokes create DM channels
- Pokes expire after 24 hours for privacy

### Intelligent Matching

- Prioritizes users with multiple shared interests
- Filters out poke-disabled users
- Excludes users you've already matched with

### Rate Limiting

- Prevents spam: 10 pokes per hour (configurable)
- No rate limit on DM messages within matched channels

### Real-Time Updates

- Instant notifications for pokes and messages
- WebSocket-based for low latency
- Automatic reconnection handling

---

## Development

### Running Tests

```bash
npm test
```

### Type Checking

```bash
npx tsc --noEmit
```

### Linting

```bash
npx eslint src/
```

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## License

MIT

---

## Support

For issues and questions, please open an issue on GitHub.
