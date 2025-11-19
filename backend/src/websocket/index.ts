import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { moderationCache } from '../config/redis';
import logger from '../utils/logger';
import { JWTPayload, ActivityEvent, DashboardStats } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const initializeWebSocket = (httpServer: HTTPServer) => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
      socket.data.moderator = payload;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const moderator: JWTPayload = socket.data.moderator;
    logger.info('Moderator connected to WebSocket', {
      moderatorId: moderator.moderatorId,
      socketId: socket.id,
    });

    // Join cafe room
    socket.on('join:cafe', async (cafeId: string) => {
      if (cafeId !== moderator.cafeId) {
        socket.emit('error', { message: 'Access denied to this cafe' });
        return;
      }

      socket.join(`cafe:${cafeId}`);
      await moderationCache.addModerator(cafeId, socket.id);

      logger.info('Moderator joined cafe room', {
        moderatorId: moderator.moderatorId,
        cafeId,
      });

      // Send initial stats
      const stats = await moderationCache.getStats(cafeId);
      if (stats) {
        socket.emit('stats:update', stats);
      }
    });

    // Handle moderation actions from dashboard
    socket.on('moderate:message', async (data: { messageId: string; action: string }) => {
      const { messageId, action } = data;

      logger.info('Message moderation requested', {
        messageId,
        action,
        moderatorId: moderator.moderatorId,
      });

      // Broadcast to other moderators in the same cafe
      io.to(`cafe:${moderator.cafeId}`).emit('activity:new', {
        type: 'moderation',
        content: `Message ${action}`,
        timestamp: new Date(),
        metadata: { messageId, moderatorId: moderator.moderatorId },
      } as ActivityEvent);
    });

    socket.on('moderate:user', async (data: { userId: string; action: string; duration?: number }) => {
      const { userId, action, duration } = data;

      logger.info('User moderation requested', {
        userId,
        action,
        duration,
        moderatorId: moderator.moderatorId,
      });

      // Broadcast to other moderators
      io.to(`cafe:${moderator.cafeId}`).emit('activity:new', {
        type: 'moderation',
        content: `User ${action}`,
        timestamp: new Date(),
        metadata: { userId, action, duration, moderatorId: moderator.moderatorId },
      } as ActivityEvent);
    });

    socket.on('disconnect', async () => {
      await moderationCache.removeModerator(moderator.cafeId, socket.id);

      logger.info('Moderator disconnected from WebSocket', {
        moderatorId: moderator.moderatorId,
        socketId: socket.id,
      });
    });
  });

  // Helper functions to emit events from other parts of the application
  const emitActivityEvent = (cafeId: string, event: ActivityEvent) => {
    io.to(`cafe:${cafeId}`).emit('activity:new', event);
  };

  const emitFlaggedMessage = (cafeId: string, messageId: string, reason: string) => {
    io.to(`cafe:${cafeId}`).emit('flag:message', { messageId, reason });
  };

  const emitStatsUpdate = (cafeId: string, stats: DashboardStats) => {
    io.to(`cafe:${cafeId}`).emit('stats:update', stats);
  };

  return {
    io,
    emitActivityEvent,
    emitFlaggedMessage,
    emitStatsUpdate,
  };
};
