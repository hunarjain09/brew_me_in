import { Server, Socket } from 'socket.io';
import { PresenceCheckJob } from '../jobs/presenceCheckJob';
import { LocationService } from '../services/locationService';

/**
 * WebSocket event handlers for location and presence updates
 */

export class LocationEventHandler {
  private io: Server;
  private presenceJob: PresenceCheckJob;

  constructor(io: Server, presenceJob: PresenceCheckJob) {
    this.io = io;
    this.presenceJob = presenceJob;
  }

  /**
   * Register all location-related socket event handlers
   */
  registerHandlers(socket: Socket): void {
    // User connects to a cafe room
    socket.on('cafe:join', async (data) => {
      await this.handleCafeJoin(socket, data);
    });

    // User leaves a cafe room
    socket.on('cafe:leave', async (data) => {
      await this.handleCafeLeave(socket, data);
    });

    // User sends location update
    socket.on('location:update', async (data) => {
      await this.handleLocationUpdate(socket, data);
    });

    // Subscribe to nearby user updates
    socket.on('location:subscribe-nearby', async (data) => {
      await this.handleSubscribeNearby(socket, data);
    });

    // Unsubscribe from nearby user updates
    socket.on('location:unsubscribe-nearby', async () => {
      await this.handleUnsubscribeNearby(socket);
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      await this.handleDisconnect(socket);
    });
  }

  /**
   * Handle user joining a cafe room
   */
  private async handleCafeJoin(
    socket: Socket,
    data: { userId: string; cafeId: string; ssid?: string; coordinates?: any }
  ): Promise<void> {
    const { userId, cafeId, ssid, coordinates } = data;

    try {
      // Validate cafe access
      const validation = await LocationService.validateCafeAccess({
        userId,
        cafeId,
        ssid,
        coordinates,
      });

      if (!validation.inCafe) {
        socket.emit('cafe:join-failed', {
          reason: validation.message,
          method: validation.method,
        });
        return;
      }

      // Join the cafe room
      socket.join(cafeId);

      // Register active user
      this.presenceJob.registerActiveUser(socket.id, userId, cafeId);

      // Update presence
      await LocationService.updateUserPresence({
        userId,
        cafeId,
        inCafe: true,
        ssid,
        coordinates,
      });

      // Get current users in cafe
      const usersInCafe = await LocationService.getUsersInCafe(cafeId);

      // Notify user of successful join
      socket.emit('cafe:joined', {
        cafeId,
        usersInCafe: usersInCafe.length,
        method: validation.method,
      });

      // Broadcast to cafe that new user joined
      socket.to(cafeId).emit('presence:user-joined', {
        userId,
        timestamp: new Date(),
      });

      console.log(`[LocationEvents] User ${userId} joined cafe ${cafeId}`);
    } catch (error) {
      console.error('[LocationEvents] Error in handleCafeJoin:', error);
      socket.emit('cafe:join-error', {
        message: 'Failed to join cafe',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Handle user leaving a cafe room
   */
  private async handleCafeLeave(
    socket: Socket,
    data: { userId: string; cafeId: string }
  ): Promise<void> {
    const { userId, cafeId } = data;

    try {
      // Leave the cafe room
      socket.leave(cafeId);

      // Update presence
      await LocationService.updateUserPresence({
        userId,
        cafeId,
        inCafe: false,
      });

      // Broadcast to cafe that user left
      socket.to(cafeId).emit('presence:user-left', {
        userId,
        timestamp: new Date(),
      });

      console.log(`[LocationEvents] User ${userId} left cafe ${cafeId}`);
    } catch (error) {
      console.error('[LocationEvents] Error in handleCafeLeave:', error);
    }
  }

  /**
   * Handle location update from client
   */
  private async handleLocationUpdate(
    socket: Socket,
    data: { userId: string; cafeId: string; ssid?: string; coordinates?: any }
  ): Promise<void> {
    const { userId, cafeId, ssid, coordinates } = data;

    try {
      // Update last activity
      this.presenceJob.updateLastActivity(socket.id);

      // Validate and update presence
      const isInCafe = await this.presenceJob.validateUserAccess(
        userId,
        cafeId,
        ssid,
        coordinates
      );

      // Check for suspicious activity
      await this.presenceJob.detectSuspiciousActivity(userId, cafeId);

      // Acknowledge update
      socket.emit('location:update-ack', {
        inCafe: isInCafe,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('[LocationEvents] Error in handleLocationUpdate:', error);
      socket.emit('location:update-error', {
        message: 'Failed to update location',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Handle subscribe to nearby users
   */
  private async handleSubscribeNearby(
    socket: Socket,
    data: { userId: string; radius: number }
  ): Promise<void> {
    const { userId, radius = 500 } = data;

    try {
      // Join nearby updates room
      socket.join(`nearby:${userId}`);

      // Get current user presence to find their location
      const presence = await LocationService.getUserPresence(userId);

      if (presence && presence.lastLatitude && presence.lastLongitude) {
        // Get nearby cafes
        const nearbyCafes = await LocationService.getNearbyCafes({
          lat: Number(presence.lastLatitude),
          lng: Number(presence.lastLongitude),
          radiusMeters: radius,
        });

        // Send initial nearby data
        socket.emit('location:nearby-cafes', {
          cafes: nearbyCafes,
          timestamp: new Date(),
        });
      }

      console.log(`[LocationEvents] User ${userId} subscribed to nearby updates`);
    } catch (error) {
      console.error('[LocationEvents] Error in handleSubscribeNearby:', error);
    }
  }

  /**
   * Handle unsubscribe from nearby users
   */
  private async handleUnsubscribeNearby(socket: Socket): Promise<void> {
    const userId = (socket as any).userId;
    if (userId) {
      socket.leave(`nearby:${userId}`);
      console.log(`[LocationEvents] User ${userId} unsubscribed from nearby updates`);
    }
  }

  /**
   * Handle socket disconnect
   */
  private async handleDisconnect(socket: Socket): Promise<void> {
    const userId = (socket as any).userId;
    const cafeId = (socket as any).cafeId;

    if (userId && cafeId) {
      try {
        // Update presence to offline after a grace period
        setTimeout(async () => {
          // Check if user reconnected (has active socket)
          const sockets = await this.io.in(cafeId).fetchSockets();
          const hasActiveConnection = sockets.some((s: any) => s.userId === userId);

          if (!hasActiveConnection) {
            await LocationService.updateUserPresence({
              userId,
              cafeId,
              inCafe: false,
            });

            // Broadcast to cafe that user went offline
            this.io.to(cafeId).emit('presence:user-offline', {
              userId,
              timestamp: new Date(),
            });

            console.log(`[LocationEvents] User ${userId} went offline from cafe ${cafeId}`);
          }
        }, 30000); // 30 second grace period
      } catch (error) {
        console.error('[LocationEvents] Error in handleDisconnect:', error);
      }
    }

    // Unregister from presence job
    this.presenceJob.unregisterActiveUser(socket.id);
  }
}
