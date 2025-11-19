import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { NotificationPayload } from '../types/matching.types';

export class NotificationService {
  private io: SocketServer | null = null;
  private userSockets: Map<string, Set<string>> = new Map();

  /**
   * Initialize Socket.IO server
   */
  initialize(httpServer: HttpServer) {
    this.io = new SocketServer(httpServer, {
      cors: {
        origin: '*', // In production, configure this properly
        methods: ['GET', 'POST'],
      },
    });

    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // Expect client to authenticate with user ID
      socket.on('authenticate', (userId: string) => {
        if (!userId) {
          socket.disconnect();
          return;
        }

        // Store socket for this user
        if (!this.userSockets.has(userId)) {
          this.userSockets.set(userId, new Set());
        }
        this.userSockets.get(userId)!.add(socket.id);

        console.log(`User ${userId} authenticated with socket ${socket.id}`);

        socket.on('disconnect', () => {
          console.log('Client disconnected:', socket.id);
          this.removeSocket(userId, socket.id);
        });
      });
    });

    console.log('Notification service initialized');
  }

  /**
   * Remove socket from user tracking
   */
  private removeSocket(userId: string, socketId: string) {
    const userSocketSet = this.userSockets.get(userId);
    if (userSocketSet) {
      userSocketSet.delete(socketId);
      if (userSocketSet.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  /**
   * Send notification to a specific user
   */
  sendToUser(userId: string, notification: NotificationPayload) {
    if (!this.io) {
      console.warn('Notification service not initialized');
      return;
    }

    const userSocketSet = this.userSockets.get(userId);
    if (!userSocketSet || userSocketSet.size === 0) {
      console.log(`User ${userId} not connected, notification not sent`);
      return;
    }

    // Send to all sockets for this user
    userSocketSet.forEach((socketId) => {
      this.io!.to(socketId).emit('notification', notification);
    });

    console.log(`Notification sent to user ${userId}:`, notification.type);
  }

  /**
   * Send poke received notification
   */
  notifyPokeReceived(toUserId: string, fromUserId: string, pokeId: string) {
    this.sendToUser(toUserId, {
      type: 'poke_received',
      data: {
        pokeId,
        fromUserId,
      },
    });
  }

  /**
   * Send poke matched notification
   */
  notifyPokeMatched(userId: string, otherUserId: string, channelId: string) {
    this.sendToUser(userId, {
      type: 'poke_matched',
      data: {
        fromUserId: otherUserId,
        channelId,
      },
    });
  }

  /**
   * Send DM message notification
   */
  notifyDMMessage(
    toUserId: string,
    fromUserId: string,
    channelId: string,
    message: string
  ) {
    this.sendToUser(toUserId, {
      type: 'dm_message',
      data: {
        fromUserId,
        channelId,
        message,
      },
    });
  }

  /**
   * Get connected user count
   */
  getConnectedUserCount(): number {
    return this.userSockets.size;
  }

  /**
   * Check if user is connected
   */
  isUserConnected(userId: string): boolean {
    const userSocketSet = this.userSockets.get(userId);
    return userSocketSet !== undefined && userSocketSet.size > 0;
  }
}

export default new NotificationService();
