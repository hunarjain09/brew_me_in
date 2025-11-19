import { createServer } from 'http';
import app from './app';
import { config } from './config';
import { db } from './db/connection';
import { connectRedis } from './db/redis';
import { logger } from './config/logger';
import { ChatHandler } from './socket/chatHandler';

async function startServer() {
  try {
    logger.info('Starting brew_me_in Backend Server...');

    // Test database connection
    logger.info('Testing database connection...');
    await db.query('SELECT NOW()');
    logger.info('Database connected successfully');

    // Connect to Redis
    logger.info('Connecting to Redis...');
    await connectRedis();
    logger.info('Redis connected successfully');

    // Create HTTP server
    const httpServer = createServer(app);

    // Initialize Socket.io chat handler
    const chatHandler = new ChatHandler(httpServer);
    logger.info('Socket.io chat handler initialized');
    console.log('Socket.io chat handler initialized');

    // Start server
    httpServer.listen(config.port, () => {
      console.log(`
🚀 brew_me_in Backend Server Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Environment: ${config.env}
Port: ${config.port}
Database: ${config.database.name}
Redis: ${config.redis.host}:${config.redis.port}
WebSocket: Enabled (Socket.io)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
API Endpoints:
  [Authentication]
  POST   /api/auth/barista/generate-username
  POST   /api/auth/join
  POST   /api/auth/refresh

  [User Management]
  GET    /api/users/me
  PUT    /api/users/me/interests
  PUT    /api/users/me/poke-enabled

  [Badges]
  POST   /api/badges/record-tip
  GET    /api/badges/status

  [Real-time Chat]
  GET    /api/chat/messages/:cafeId
  DELETE /api/chat/messages/:messageId
  GET    /api/chat/presence/:cafeId
  GET    /api/chat/topics/:cafeId

  [Rate Limiting & Spam Prevention]
  GET    /api/v1/ratelimit/status
  POST   /api/v1/ratelimit/check
  POST   /api/v1/ratelimit/consume
  POST   /api/v1/ratelimit/reset
  POST   /api/v1/spam/check
  GET    /api/v1/spam/mute/:userId
  DELETE /api/v1/spam/mute/:userId

  [Health Check]
  GET    /api/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Socket.io Events:
  join:cafe, leave:cafe, message:send
  typing:start, typing:stop, presence:update
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);

      logger.info('Server started successfully', {
        port: config.port,
        environment: config.env,
        websocket: true,
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  console.log('SIGTERM received, shutting down gracefully...');
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  console.log('SIGINT received, shutting down gracefully...');
  await db.close();
  process.exit(0);
});

startServer();
