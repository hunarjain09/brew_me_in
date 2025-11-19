import { createClient, RedisClientType } from 'redis';
import { config } from './env';

/**
 * Redis Client Singleton
 * Handles connection to Redis for rate limiting and caching
 */
class RedisClient {
  private static instance: RedisClient;
  private client: RedisClientType | null = null;
  private connected: boolean = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  /**
   * Initialize and connect to Redis
   */
  public async connect(): Promise<void> {
    if (this.connected && this.client) {
      console.log('Redis client already connected');
      return;
    }

    try {
      this.client = createClient({
        socket: {
          host: config.redis.host,
          port: config.redis.port,
        },
        password: config.redis.password || undefined,
        database: config.redis.db,
      });

      // Error handler
      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
      });

      // Connect event
      this.client.on('connect', () => {
        console.log('Redis client connecting...');
      });

      // Ready event
      this.client.on('ready', () => {
        console.log('Redis client ready');
        this.connected = true;
      });

      // Reconnecting event
      this.client.on('reconnecting', () => {
        console.log('Redis client reconnecting...');
      });

      await this.client.connect();
      console.log(`Redis connected to ${config.redis.host}:${config.redis.port}`);
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.connected = false;
      console.log('Redis client disconnected');
    }
  }

  /**
   * Get Redis client instance
   */
  public getClient(): RedisClientType {
    if (!this.client || !this.connected) {
      throw new Error('Redis client not connected. Call connect() first.');
    }
    return this.client;
  }

  /**
   * Check if Redis is connected
   */
  public isConnected(): boolean {
    return this.connected;
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<boolean> {
    try {
      if (!this.client || !this.connected) {
        return false;
      }
      const pong = await this.client.ping();
      return pong === 'PONG';
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const redisClient = RedisClient.getInstance();

/**
 * Redis key prefixes for organization
 */
export const RedisKeys = {
  // Rate limiting keys
  rateLimitMessage: (userId: string) => `ratelimit:message:${userId}`,
  rateLimitMessageLast: (userId: string) => `ratelimit:message:${userId}:last`,
  rateLimitAgentGlobal: () => `ratelimit:agent:global`,
  rateLimitAgentPersonal: (userId: string, sessionId: string) =>
    `ratelimit:agent:${userId}:${sessionId}`,
  rateLimitPoke: (userId: string) => `ratelimit:poke:${userId}:count`,

  // Spam detection keys
  spamDuplicate: (userId: string) => `spam:duplicate:${userId}`,
  spamMute: (userId: string) => `spam:mute:${userId}`,

  // Session keys
  userSession: (userId: string) => `session:${userId}`,

  // Component 6: Moderation keys
  cafeMuted: (cafeId: string) => `cafe:${cafeId}:muted`,
  cafeFlags: (cafeId: string) => `cafe:${cafeId}:flags`,
  cafeModerators: (cafeId: string) => `cafe:${cafeId}:moderators`,
  cafeStats: (cafeId: string) => `cafe:${cafeId}:stats`,
} as const;

/**
 * Component 6: Moderation cache helpers
 */
export const moderationCache = {
  // Mute a user
  async muteUser(cafeId: string, userId: string, durationMinutes: number): Promise<void> {
    const client = redisClient.getClient();
    const key = RedisKeys.cafeMuted(cafeId);
    const mutedUntil = Date.now() + (durationMinutes * 60 * 1000);
    await client.hSet(key, userId, mutedUntil.toString());
    await client.expire(key, durationMinutes * 60);
  },

  // Check if user is muted
  async isUserMuted(cafeId: string, userId: string): Promise<boolean> {
    const client = redisClient.getClient();
    const key = RedisKeys.cafeMuted(cafeId);
    const mutedUntil = await client.hGet(key, userId);

    if (!mutedUntil) return false;

    const now = Date.now();
    const until = parseInt(mutedUntil);

    if (now > until) {
      // Mute expired, remove it
      await client.hDel(key, userId);
      return false;
    }

    return true;
  },

  // Unmute a user
  async unmuteUser(cafeId: string, userId: string): Promise<void> {
    const client = redisClient.getClient();
    const key = RedisKeys.cafeMuted(cafeId);
    await client.hDel(key, userId);
  },

  // Get all muted users for a cafe
  async getMutedUsers(cafeId: string): Promise<string[]> {
    const client = redisClient.getClient();
    const key = RedisKeys.cafeMuted(cafeId);
    const mutedUsers = await client.hGetAll(key);
    const now = Date.now();

    return Object.entries(mutedUsers)
      .filter(([_, until]) => parseInt(until) > now)
      .map(([userId]) => userId);
  },

  // Add flagged message
  async flagMessage(cafeId: string, messageId: string, reason: string): Promise<void> {
    const client = redisClient.getClient();
    const key = RedisKeys.cafeFlags(cafeId);
    const flag = JSON.stringify({ messageId, reason, timestamp: Date.now() });
    await client.lPush(key, flag);
    await client.lTrim(key, 0, 99); // Keep only last 100 flags
  },

  // Get flagged messages
  async getFlaggedMessages(cafeId: string): Promise<Array<{ messageId: string; reason: string; timestamp: number }>> {
    const client = redisClient.getClient();
    const key = RedisKeys.cafeFlags(cafeId);
    const flags = await client.lRange(key, 0, -1);
    return flags.map(f => JSON.parse(f));
  },

  // Track active moderators
  async addModerator(cafeId: string, socketId: string): Promise<void> {
    const client = redisClient.getClient();
    const key = RedisKeys.cafeModerators(cafeId);
    await client.sAdd(key, socketId);
    await client.expire(key, 3600); // 1 hour
  },

  // Remove moderator
  async removeModerator(cafeId: string, socketId: string): Promise<void> {
    const client = redisClient.getClient();
    const key = RedisKeys.cafeModerators(cafeId);
    await client.sRem(key, socketId);
  },

  // Get active moderators count
  async getActiveModerators(cafeId: string): Promise<number> {
    const client = redisClient.getClient();
    const key = RedisKeys.cafeModerators(cafeId);
    return await client.sCard(key);
  },

  // Update dashboard stats (cached)
  async updateStats(cafeId: string, stats: any): Promise<void> {
    const client = redisClient.getClient();
    const key = RedisKeys.cafeStats(cafeId);
    await client.set(key, JSON.stringify(stats), { EX: 60 }); // Cache for 1 minute
  },

  // Get dashboard stats
  async getStats(cafeId: string): Promise<any> {
    const client = redisClient.getClient();
    const key = RedisKeys.cafeStats(cafeId);
    const stats = await client.get(key);
    return stats ? JSON.parse(stats) : null;
  },
};
