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
} as const;
