# brew_me_in

> A location-based social networking platform for coffee shops, enabling ephemeral connections through real-time chat, AI-powered conversations, and interest-based matching.

## Quick Start

```bash
# Clone and install dependencies
npm install

# Setup environment
cp backend/.env.example backend/.env
# Edit .env with your configuration

# Start services with Docker
docker-compose up -d

# Run migrations
cd backend && npm run migrate

# Start development server
npm run dev
```

Server runs on `http://localhost:3000` | Frontend on `http://localhost:5173`

## Core Features

- ⏱️ **Ephemeral Sessions** - 24-hour temporary usernames, automatic cleanup
- 💬 **Real-time Chat** - WebSocket-based group chat with typing indicators
- 🤖 **AI Agent** - Claude Sonnet 4.5 integration with 6 personality types
- 🔍 **Interest Matching** - Privacy-first poke system for 1:1 connections
- 🛡️ **Smart Protection** - Rate limiting, spam detection, auto-moderation
- 🏆 **Badge System** - Rewards for regular visitors with enhanced perks
- 📍 **Location Validation** - WiFi SSID + GPS geofencing
- 🔄 **Background Jobs** - Automated cleanup, analytics, and AI messages

## Tech Stack

**Backend**: Node.js, TypeScript, Express, Socket.io, PostgreSQL, Redis
**Frontend**: React, Vite, Tailwind CSS
**AI**: Anthropic Claude API (Sonnet 4.5)
**Testing**: Jest, Supertest, MSW

## Documentation

### Getting Started
- 📖 [Development Setup](./DEVELOPMENT_SETUP.md) - Complete local setup guide
- 🚀 [Deployment Guide](./DEPLOYMENT.md) - Production deployment instructions
- 🏗️ [Architecture Overview](./docs/ARCHITECTURE_OVERVIEW.md) - System design & diagrams

### Component Documentation
- 🔐 [Authentication & User Management](./docs/components/AUTHENTICATION.md)
- 💬 [Real-time Chat System](./docs/components/CHAT_SYSTEM.md)
- 🛡️ [Rate Limiting & Spam Prevention](./docs/components/RATE_LIMITING.md)
- 🔍 [Interest Matching & Poke System](./docs/components/MATCHING.md)
- 🤖 [AI Agent Integration](./docs/components/AI_AGENT.md)

### Additional Resources
- 🔄 [Next Steps & Roadmap](./NEXT_STEPS.md)
- 📋 [API Examples](./backend/API_EXAMPLES.md)
- 🧪 [Testing Guide](./backend/TESTING.md)

## Project Status

| Component | Status |
|-----------|--------|
| Authentication & User Management | ✅ Complete |
| Real-time Chat System | ✅ Complete |
| Rate Limiting & Spam Prevention | ✅ Complete |
| Interest Matching & Poke System | ✅ Complete |
| AI Agent Integration | ✅ Complete |
| Background Jobs & Scheduler | ✅ Complete |
| Network Validation | ✅ Complete |
| Admin Dashboard | 🚧 In Progress |

## API Quick Reference

```bash
# Health check
GET /api/health

# Generate username (barista)
POST /api/auth/barista/generate-username

# Join cafe (customer)
POST /api/auth/join

# Get current user
GET /api/users/me

# Send message (WebSocket)
socket.emit('message:send', { cafeId, content })

# Discover users
GET /api/matching/discover?cafeId={id}&interests={list}

# Send poke
POST /api/pokes/send

# Query AI agent (WebSocket)
socket.emit('query:stream', { query, cafeId })
```

See [API Examples](./backend/API_EXAMPLES.md) for detailed documentation.

## License

MIT

---

**Version**: 0.5.0 | **Last Updated**: 2025-11-19
