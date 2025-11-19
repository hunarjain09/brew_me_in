# brew_me_in Backend

Express.js backend API for the brew_me_in cafe social networking platform.

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Run migrations
npm run migrate

# Start development server
npm run dev
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Run production server
- `npm run migrate` - Run database migrations
- `npm run lint` - Lint TypeScript code

## API Structure

### Routes
- `/api/auth/*` - Authentication endpoints
- `/api/users/*` - User management endpoints
- `/api/badges/*` - Badge and tip endpoints
- `/api/health` - Health check endpoint

### Models
- `User` - Temporary user accounts
- `Badge` - User badge status
- `Tip` - Tip tracking
- `Cafe` - Cafe information
- `JoinToken` - Barista-generated tokens

### Middleware
- `authenticate` - JWT authentication
- `validate` - Request validation (Zod schemas)
- `rateLimit` - Redis-backed rate limiting

## Environment Variables

See `.env.example` for all required variables.

Critical variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for signing JWT tokens
- `REDIS_HOST` - Redis server host
- `ANTHROPIC_API_KEY` - Claude API key (for future chat features)

## Database

### Running Migrations

```bash
npm run migrate
```

This will:
1. Create all tables
2. Set up indexes
3. Create helper functions
4. Insert sample cafe data

### Manual Database Operations

```bash
# Connect to database
psql brew_me_in

# Check users
SELECT * FROM users;

# Check badges
SELECT * FROM badges;

# Clean up expired data
SELECT cleanup_expired_users();
SELECT cleanup_expired_badges();
SELECT cleanup_expired_join_tokens();
```

## Development

### Adding New Endpoints

1. Create controller in `src/controllers/`
2. Add route in `src/routes/`
3. Add validation schema in `src/middleware/validation.ts`
4. Update route index in `src/routes/index.ts`

### Adding New Models

1. Create model class in `src/models/`
2. Add TypeScript interface in `src/types/index.ts`
3. Update database schema in `src/db/schema.sql`
4. Run migrations

## Testing

### Manual API Testing

```bash
# Health check
curl http://localhost:3000/api/health

# Generate username (barista)
curl -X POST http://localhost:3000/api/auth/barista/generate-username \
  -H "Content-Type: application/json" \
  -d '{"cafeId": "cafe-uuid", "receiptId": "RCPT123"}'

# Join cafe (customer)
curl -X POST http://localhost:3000/api/auth/join \
  -H "Content-Type: application/json" \
  -d '{
    "username": "HappyOtter42",
    "joinToken": "token-from-barista",
    "cafeId": "cafe-uuid",
    "wifiSsid": "CafeWiFi-Guest"
  }'

# Get current user
curl http://localhost:3000/api/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Security

### Rate Limiting

Different limits for different endpoints:
- Auth endpoints: 5 req/15min
- Username generation: 10 req/hour per cafe
- Tips: 3 req/minute
- General API: 100 req/15min

### Authentication

All protected endpoints require:
```
Authorization: Bearer <jwt-token>
```

Tokens expire after 24 hours. Use refresh tokens to get new access tokens.

### Network Validation

User location verified via:
1. WiFi SSID matching (primary)
2. GPS geofencing (fallback, 100m radius)

## Monitoring

### Logs

Development mode includes detailed query logging:
- Query text
- Execution duration
- Row counts

### Health Check

```bash
curl http://localhost:3000/api/health
```

Returns:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Troubleshooting

### Database Connection Failed

Check:
1. PostgreSQL is running: `pg_isready`
2. Database exists: `psql -l | grep brew_me_in`
3. Credentials in `.env` are correct

### Redis Connection Failed

Check:
1. Redis is running: `redis-cli ping`
2. Redis host/port in `.env` are correct

### Rate Limit Issues

Clear Redis rate limit keys:
```bash
redis-cli KEYS "rl:*" | xargs redis-cli DEL
```

## Architecture

```
src/
├── config/         Configuration management
├── controllers/    Business logic
├── db/            Database connections
├── middleware/    Express middleware
├── models/        Data access layer
├── routes/        API endpoints
├── types/         TypeScript definitions
├── utils/         Helper functions
├── app.ts         Express app
└── index.ts       Server entry
```

## Performance

### Database Indexes

Critical indexes:
- `idx_users_cafe_expires` - User lookup by cafe
- `idx_tips_user_date` - Tip counting for badges
- `idx_badges_expires` - Badge expiration checks

### Caching Strategy

Redis used for:
- Rate limiting counters
- Session storage (future)
- Real-time pub/sub (future)

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

### Building

```bash
npm run build
```

Output in `dist/` directory.

### Running Production

```bash
NODE_ENV=production npm start
```

Or with PM2:
```bash
pm2 start dist/index.js --name brew-me-in
```

## Support

For issues or questions, refer to the main project README or contact the development team.
