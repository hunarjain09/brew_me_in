import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';
import redisClient from '../config/redis';

/**
 * Component 6: Admin WebSocket Handler
 * Handles real-time updates for moderator dashboard
 */

interface ModeratorSocket extends Socket {
  moderatorId?: string;
  cafeId?: string;
  role?: string;
}

export const initializeAdminSocket = (io: SocketIOServer) => {
  // Create admin namespace
  const adminNamespace = io.of('/admin');

  // Authentication middleware
  adminNamespace.use(async (socket: ModeratorSocket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      // Verify JWT token
      const decoded = verifyToken(token);

      if (!decoded || decoded.role !== 'moderator') {
        return next(new Error('Moderator access only'));
      }

      // Attach moderator info to socket
      socket.moderatorId = decoded.id;
      socket.cafeId = decoded.cafeId;
      socket.role = decoded.role;

      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  adminNamespace.on('connection', async (socket: ModeratorSocket) => {
    const { moderatorId, cafeId } = socket;

    console.log(`Moderator ${moderatorId} connected to admin dashboard`);

    // Join cafe-specific room
    if (cafeId) {
      socket.join(`admin:cafe:${cafeId}`);

      // Track active moderators in Redis
      await redisClient.sAdd(`admin:active:${cafeId}`, moderatorId!);

      // Send initial stats
      try {
        const stats = await getRealtimeStats(cafeId);
        socket.emit('stats:initial', stats);
      } catch (error) {
        console.error('Error fetching initial stats:', error);
      }
    }

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`Moderator ${moderatorId} disconnected from admin dashboard`);

      if (cafeId && moderatorId) {
        await redisClient.sRem(`admin:active:${cafeId}`, moderatorId);
      }
    });

    // Handle moderation actions (broadcast to other admins)
    socket.on('moderation:action', (data: {
      action: string;
      targetUserId: string;
      reason?: string;
      duration?: number;
    }) => {
      if (!cafeId) return;

      // Broadcast to other moderators in the same cafe
      socket.to(`admin:cafe:${cafeId}`).emit('moderation:update', {
        moderatorId,
        action: data.action,
        targetUserId: data.targetUserId,
        reason: data.reason,
        duration: data.duration,
        timestamp: new Date(),
      });
    });

    // Request stats update
    socket.on('stats:refresh', async () => {
      if (!cafeId) return;

      try {
        const stats = await getRealtimeStats(cafeId);
        socket.emit('stats:update', stats);
      } catch (error) {
        console.error('Error fetching stats:', error);
        socket.emit('error', { message: 'Failed to fetch stats' });
      }
    });
  });

  return adminNamespace;
};

/**
 * Broadcast new message to admin dashboard
 */
export const broadcastNewMessage = (
  adminNamespace: any,
  cafeId: string,
  message: {
    id: string;
    userId: string;
    username: string;
    content: string;
    messageType: string;
    timestamp: Date;
  }
) => {
  adminNamespace.to(`admin:cafe:${cafeId}`).emit('message:new', message);
};

/**
 * Broadcast moderation action to admin dashboard
 */
export const broadcastModerationAction = (
  adminNamespace: any,
  cafeId: string,
  action: {
    moderatorId: string;
    action: string;
    targetUserId: string;
    reason?: string;
    timestamp: Date;
  }
) => {
  adminNamespace.to(`admin:cafe:${cafeId}`).emit('moderation:update', action);
};

/**
 * Broadcast stats update to admin dashboard
 */
export const broadcastStatsUpdate = (
  adminNamespace: any,
  cafeId: string,
  stats: any
) => {
  adminNamespace.to(`admin:cafe:${cafeId}`).emit('stats:update', stats);
};

/**
 * Get real-time stats (helper function)
 */
async function getRealtimeStats(cafeId: string) {
  // This is a simplified version - in production, you'd use the AnalyticsService
  const activeModsKey = `admin:active:${cafeId}`;
  const activeModerators = await redisClient.sCard(activeModsKey);

  return {
    activeModerators,
    activeUsers: 0, // Would fetch from analytics service
    totalMessages: 0, // Would fetch from analytics service
    timestamp: new Date(),
  };
}
