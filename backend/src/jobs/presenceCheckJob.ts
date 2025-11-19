import cron from 'node-cron';
import { LocationService } from '../services/locationService';
import { ActiveSocket } from '../types';

/**
 * Background job for periodic presence checks
 * Runs every 5 minutes to validate user presence in cafes
 */

export class PresenceCheckJob {
  private locationService: LocationService;
  private io: any; // Socket.io instance
  private activeUsers: Map<string, ActiveSocket>;

  constructor(io: any) {
    this.locationService = new LocationService();
    this.io = io;
    this.activeUsers = new Map();
  }

  /**
   * Start the cron job for periodic presence checks
   * Runs every 5 minutes (configurable via environment)
   */
  start(): void {
    const interval = process.env.PRESENCE_CHECK_INTERVAL || '*/5 * * * *'; // Every 5 minutes

    cron.schedule(interval, async () => {
      console.log('[PresenceCheckJob] Running periodic presence check...');
      await this.checkAllUserPresence();
    });

    console.log('[PresenceCheckJob] Started - Running every 5 minutes');
  }

  /**
   * Register an active socket connection
   */
  registerActiveUser(socketId: string, userId: string, cafeId?: string): void {
    this.activeUsers.set(socketId, {
      socketId,
      userId,
      cafeId,
      connectedAt: new Date(),
      lastActivity: new Date(),
    });
  }

  /**
   * Unregister a socket connection
   */
  unregisterActiveUser(socketId: string): void {
    this.activeUsers.delete(socketId);
  }

  /**
   * Update last activity timestamp for a user
   */
  updateLastActivity(socketId: string): void {
    const user = this.activeUsers.get(socketId);
    if (user) {
      user.lastActivity = new Date();
    }
  }

  /**
   * Get all currently active sockets
   */
  getActiveSockets(): ActiveSocket[] {
    return Array.from(this.activeUsers.values());
  }

  /**
   * Check presence for all active users
   */
  private async checkAllUserPresence(): Promise<void> {
    const activeSockets = this.getActiveSockets();
    console.log(`[PresenceCheckJob] Checking presence for ${activeSockets.length} active users`);

    for (const socket of activeSockets) {
      try {
        await this.checkUserPresence(socket);
      } catch (error) {
        console.error(
          `[PresenceCheckJob] Error checking presence for user ${socket.userId}:`,
          error
        );
      }
    }
  }

  /**
   * Check presence for a specific user
   */
  private async checkUserPresence(socket: ActiveSocket): Promise<void> {
    const { userId, cafeId, socketId } = socket;

    if (!cafeId) {
      return; // User not in any cafe
    }

    // Get current user presence from database
    const userPresence = await this.locationService.getUserPresence(userId);

    if (!userPresence) {
      return;
    }

    const wasInCafe = userPresence.inCafe;

    // Request fresh location data from client
    this.io.to(socketId).emit('location:request-update', {
      cafeId,
      timestamp: new Date(),
    });

    // Note: The actual validation will happen when the client responds
    // with updated location data via the 'location:update' event
    // This job is primarily for requesting updates and handling timeouts

    // Check for stale presence (no update in last 10 minutes)
    const lastUpdate = userPresence.updatedAt;
    const minutesSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60);

    if (minutesSinceUpdate > 10) {
      // Mark user as potentially offline
      await this.locationService.updateUserPresence({
        userId,
        cafeId,
        inCafe: false,
      });

      // Notify cafe room about user going offline
      this.io.to(cafeId).emit('presence:changed', {
        userId,
        inCafe: false,
        timestamp: new Date(),
        reason: 'timeout',
      });

      console.log(`[PresenceCheckJob] User ${userId} marked as offline due to timeout`);
    }
  }

  /**
   * Validate user's cafe access with updated location data
   */
  async validateUserAccess(
    userId: string,
    cafeId: string,
    ssid?: string,
    coordinates?: { lat: number; lng: number }
  ): Promise<boolean> {
    const validation = await this.locationService.validateCafeAccess({
      userId,
      cafeId,
      ssid,
      coordinates,
    });

    const isInCafe = validation.inCafe;

    // Update presence in database
    const result = await this.locationService.updateUserPresence({
      userId,
      cafeId,
      inCafe: isInCafe,
      ssid,
      coordinates,
    });

    // Emit presence change event if status changed
    if (result.previousState !== isInCafe) {
      this.io.to(cafeId).emit('presence:changed', {
        userId,
        inCafe: isInCafe,
        timestamp: new Date(),
        method: validation.method,
      });

      console.log(
        `[PresenceCheckJob] User ${userId} presence changed: ${result.previousState} -> ${isInCafe}`
      );
    }

    return isInCafe;
  }

  /**
   * Detect and report suspicious access patterns
   */
  async detectSuspiciousActivity(userId: string, cafeId: string): Promise<void> {
    const isSuspicious = await this.locationService.detectSuspiciousActivity(userId, cafeId);

    if (isSuspicious) {
      // Emit warning to moderators
      this.io.to(`moderators:${cafeId}`).emit('security:suspicious-activity', {
        userId,
        cafeId,
        timestamp: new Date(),
        reason: 'Rapid location changes detected',
      });

      console.warn(`[PresenceCheckJob] Suspicious activity detected for user ${userId}`);
    }
  }
}
