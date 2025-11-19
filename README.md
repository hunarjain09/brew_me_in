# Brew Me In - Background Jobs & Scheduled Tasks

An AI-powered café social platform with comprehensive background job scheduling and automated task management.

## Overview

Brew Me In is a TypeScript-based Node.js application that implements a robust scheduler agent for managing background jobs and scheduled tasks. The system handles user session management, badge calculations, analytics aggregation, and proactive AI-generated messages.

## Features

### Background Jobs

1. **User Expiration** (Hourly)
   - Automatically expires inactive user sessions
   - Clears expired users from Redis cache
   - Updates café statistics in real-time

2. **Badge Management** (Daily)
   - Expires time-limited badges
   - Calculates and awards new badges based on user behavior
   - Badge types: Early Bird, Night Owl, Social Butterfly, Frequent Visitor

3. **Poke Cleanup** (Every 5 minutes)
   - Removes expired poke interactions
   - Maintains cache consistency

4. **Analytics Aggregation** (Hourly)
   - Aggregates user activity metrics
   - Tracks pokes, messages, and session durations
   - Stores hourly analytics per café

5. **Proactive Messages** (Every 2 minutes)
   - AI-generated contextual messages
   - Activity-based triggers
   - Rate-limited to prevent spam

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Load Balancer                     │
└─────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌──────▼──────┐ ┌─────▼───────┐
│   API        │ │   Socket.io  │ │   Static    │
│   Servers    │ │   Servers    │ │   Assets    │
│   (Node.js)  │ │   (Node.js)  │ │   (CDN)     │
└───────┬──────┘ └──────┬──────┘ └─────────────┘
        │               │
        └───────┬───────┘
                │
    ┌───────────┼───────────┐
    │           │           │
┌───▼────┐ ┌───▼────┐ ┌───▼────┐
│Postgres│ │ Redis  │ │ Claude │
│   DB   │ │ Cache  │ │  API   │
└────────┘ └────────┘ └────────┘
```

## Project Structure

```
brew_me_in/
├── src/
│   ├── scheduler/
│   │   ├── index.ts              # Main scheduler orchestrator
│   │   └── jobs/
│   │       ├── expireUsers.ts    # User expiration job
│   │       ├── expireBadges.ts   # Badge expiration job
│   │       ├── calculateBadges.ts # Badge calculation job
│   │       ├── expirePokes.ts    # Poke cleanup job
│   │       ├── aggregateAnalytics.ts # Analytics job
│   │       └── proactiveMessages.ts  # AI message job
│   ├── config/
│   │   ├── database.ts           # PostgreSQL configuration
│   │   └── redis.ts              # Redis configuration
│   ├── types/
│   │   └── index.ts              # TypeScript type definitions
│   ├── utils/
│   │   └── logger.ts             # Winston logger setup
│   └── index.ts                  # Main application entry
├── database/
│   └── schema.sql                # Database schema
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Installation

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 6+

### Setup

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
# Edit .env with your configuration
```

4. Initialize the database:
```bash
psql -U postgres -d brew_me_in -f database/schema.sql
```

5. Build the project:
```bash
npm run build
```

## Usage

### Development Mode

Start the application with hot reloading:
```bash
npm run dev
```

Start only the scheduler:
```bash
npm run scheduler
```

### Production Mode

Build and start the application:
```bash
npm run build
npm start
```

## Configuration

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/brew_me_in
DB_HOST=localhost
DB_PORT=5432
DB_NAME=brew_me_in
DB_USER=postgres
DB_PASSWORD=password

# Redis
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# Server
PORT=3000
NODE_ENV=development

# Scheduler
ENABLE_SCHEDULER=true
ENABLE_PROACTIVE_MESSAGES=true

# Logging
LOG_LEVEL=info
```

## API Endpoints

### Health Check
```
GET /health
```
Returns system health status including database and scheduler status.

### Scheduler Status
```
GET /api/scheduler/status
```
Returns current scheduler status and running jobs.

### Manual Job Trigger (Testing/Admin)
```
POST /api/scheduler/trigger/:jobName
```
Manually triggers a specific job. Available jobs:
- `expireUsers`
- `expireBadges`
- `calculateBadges`
- `expirePokes`
- `aggregateAnalytics`
- `proactiveMessages`

## Scheduled Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| expireUsers | `0 * * * *` | Every hour - Expires inactive users |
| expireBadges | `0 0 * * *` | Daily at midnight - Expires badges |
| calculateBadges | `5 0 * * *` | Daily at 12:05 AM - Calculates new badges |
| expirePokes | `*/5 * * * *` | Every 5 minutes - Cleans up pokes |
| aggregateAnalytics | `5 * * * *` | Every hour at :05 - Aggregates analytics |
| proactiveMessages | `*/2 * * * *` | Every 2 minutes - Sends AI messages |

## Database Schema

The application uses PostgreSQL with the following main tables:
- `cafes` - Café locations and settings
- `users` - Temporary user accounts with expiration
- `user_sessions` - Session tracking for analytics
- `badges` - User achievements and badges
- `pokes` - User-to-user interactions
- `messages` - Chat messages
- `analytics` - Aggregated hourly metrics
- `agent_messages` - AI-generated proactive messages

See `database/schema.sql` for complete schema definition.

## Logging

Logs are stored in the `logs/` directory:
- `error.log` - Error-level logs only
- `combined.log` - All logs

Logs are automatically rotated when they reach 5MB (keeps 5 files).

## Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Code Formatting
```bash
npm run format
```

## Graceful Shutdown

The application handles graceful shutdown on SIGTERM and SIGINT:
1. Stops all scheduled jobs
2. Closes database connections
3. Closes Redis connections
4. Exits cleanly

## Performance Considerations

- **Redis Caching**: Frequently accessed data is cached in Redis
- **Connection Pooling**: PostgreSQL connection pool (max 20 connections)
- **Batch Operations**: Jobs process records in batches where possible
- **Indexes**: Optimized database indexes for common queries
- **Rate Limiting**: Proactive messages are rate-limited per café

## Security

- Environment variables for sensitive configuration
- Prepared statements to prevent SQL injection
- CORS configuration for API access
- Input validation on all endpoints

## Monitoring

Monitor the scheduler health via:
1. `/health` endpoint for overall system status
2. `/api/scheduler/status` for scheduler-specific status
3. Winston logs in `logs/` directory
4. Database analytics table for historical metrics

## Troubleshooting

### Scheduler Not Starting
- Check `ENABLE_SCHEDULER` environment variable
- Verify database and Redis connections
- Check logs in `logs/error.log`

### Jobs Not Running
- Verify scheduler is running: `GET /api/scheduler/status`
- Check cron schedule syntax
- Review job-specific logs

### Database Connection Issues
- Verify PostgreSQL is running
- Check `DATABASE_URL` configuration
- Ensure database schema is initialized

### Redis Connection Issues
- Verify Redis is running
- Check `REDIS_URL` configuration
- Review Redis logs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

ISC

## Support

For issues and questions, please open an issue on the repository.
