import { createServer } from 'http';
import app from './app';
import { config } from './config';
import { db } from './db/connection';
import { connectRedis } from './db/redis';
import { logger } from './config/logger';
import { ChatHandler } from './socket/chatHandler';
import notificationService from './services/notification.service';
import { startPokeExpirationJob } from './jobs/poke-expiration.job';
import { Server as SocketIOServer } from 'socket.io';
import { initializeAdminSocket } from './socket/adminHandler';

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

    // Initialize Component 2: Socket.io chat handler
    const chatHandler = new ChatHandler(httpServer);
    logger.info('Socket.io chat handler initialized (Component 2)');

    // Initialize Component 4: Notification Service (Socket.IO)
    notificationService.initialize(httpServer);
    logger.info('Socket.io notification service initialized (Component 4)');

    // Initialize Component 6: Admin Dashboard WebSocket
    const io = new SocketIOServer(httpServer, {
      cors: {
        origin: config.corsOrigin || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });
    const adminNamespace = initializeAdminSocket(io);
    logger.info('Socket.io admin dashboard initialized (Component 6)');

    // Start Component 4: Poke expiration background job
    startPokeExpirationJob();
    logger.info('Poke expiration job started (Component 4)');

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

  [Badge System]
  POST   /api/badges/record-tip
  GET    /api/badges/status

  [Real-time Chat - Component 2]
  GET    /api/chat/messages/:cafeId
  POST   /api/chat/messages
  DELETE /api/chat/messages/:messageId
  GET    /api/chat/presence/:cafeId

  [Rate Limiting - Component 3]
  GET    /api/v1/ratelimit/status
  POST   /api/v1/ratelimit/check
  POST   /api/v1/spam/check

  [Interest Matching - Component 4]
  GET    /api/matching/discover
  POST   /api/matching/interests
  POST   /api/matching/interests/add
  POST   /api/matching/interests/remove

  [Poke System - Component 4]
  POST   /api/pokes/send
  POST   /api/pokes/respond
  GET    /api/pokes/pending
  GET    /api/pokes/sent

  [Direct Messaging - Component 4]
  GET    /api/dm/channels
  GET    /api/dm/:channelId/messages
  POST   /api/dm/:channelId/messages
  DELETE /api/dm/messages/:messageId

  [Admin Dashboard - Component 6]
  POST   /api/admin/auth/login
  POST   /api/admin/auth/register
  GET    /api/admin/auth/me
  GET    /api/admin/users
  POST   /api/admin/moderation/mute
  POST   /api/admin/moderation/unmute
  POST   /api/admin/moderation/ban
  POST   /api/admin/moderation/unban
  DELETE /api/admin/moderation/messages/:messageId
  GET    /api/admin/moderation/history
  GET    /api/admin/analytics
  GET    /api/admin/analytics/realtime
  GET    /api/admin/analytics/export

  [Health]
  GET    /api/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
      logger.info(`Server listening on port ${config.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
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
