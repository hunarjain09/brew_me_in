import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// Redis client configuration
const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  password: process.env.REDIS_PASSWORD || undefined,
});

redisClient.on('connect', () => {
  console.log('✓ Connected to Redis');
});

redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});

// Connect to Redis
export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
};

// Moderation helpers using Redis
export const moderationCache = {
  // Mute a user
  async muteUser(cafeId: string, userId: string, durationMinutes: number): Promise<void> {
    const key = `cafe:${cafeId}:muted`;
    const mutedUntil = Date.now() + (durationMinutes * 60 * 1000);
    await redisClient.hSet(key, userId, mutedUntil.toString());
    await redisClient.expire(key, durationMinutes * 60);
  },

  // Check if user is muted
  async isUserMuted(cafeId: string, userId: string): Promise<boolean> {
    const key = `cafe:${cafeId}:muted`;
    const mutedUntil = await redisClient.hGet(key, userId);

    if (!mutedUntil) return false;

    const now = Date.now();
    const until = parseInt(mutedUntil);

    if (now > until) {
      // Mute expired, remove it
      await redisClient.hDel(key, userId);
      return false;
    }

    return true;
  },

  // Unmute a user
  async unmuteUser(cafeId: string, userId: string): Promise<void> {
    const key = `cafe:${cafeId}:muted`;
    await redisClient.hDel(key, userId);
  },

  // Get all muted users for a cafe
  async getMutedUsers(cafeId: string): Promise<string[]> {
    const key = `cafe:${cafeId}:muted`;
    const mutedUsers = await redisClient.hGetAll(key);
    const now = Date.now();

    return Object.entries(mutedUsers)
      .filter(([_, until]) => parseInt(until) > now)
      .map(([userId]) => userId);
  },

  // Add flagged message
  async flagMessage(cafeId: string, messageId: string, reason: string): Promise<void> {
    const key = `cafe:${cafeId}:flags`;
    const flag = JSON.stringify({ messageId, reason, timestamp: Date.now() });
    await redisClient.lPush(key, flag);
    await redisClient.lTrim(key, 0, 99); // Keep only last 100 flags
  },

  // Get flagged messages
  async getFlaggedMessages(cafeId: string): Promise<Array<{ messageId: string; reason: string; timestamp: number }>> {
    const key = `cafe:${cafeId}:flags`;
    const flags = await redisClient.lRange(key, 0, -1);
    return flags.map(f => JSON.parse(f));
  },

  // Track active moderators
  async addModerator(cafeId: string, socketId: string): Promise<void> {
    const key = `cafe:${cafeId}:moderators`;
    await redisClient.sAdd(key, socketId);
    await redisClient.expire(key, 3600); // 1 hour
  },

  // Remove moderator
  async removeModerator(cafeId: string, socketId: string): Promise<void> {
    const key = `cafe:${cafeId}:moderators`;
    await redisClient.sRem(key, socketId);
  },

  // Get active moderators count
  async getActiveModerators(cafeId: string): Promise<number> {
    const key = `cafe:${cafeId}:moderators`;
    return await redisClient.sCard(key);
  },

  // Update dashboard stats (cached)
  async updateStats(cafeId: string, stats: any): Promise<void> {
    const key = `cafe:${cafeId}:stats`;
    await redisClient.set(key, JSON.stringify(stats), { EX: 60 }); // Cache for 1 minute
  },

  // Get dashboard stats
  async getStats(cafeId: string): Promise<any> {
    const key = `cafe:${cafeId}:stats`;
    const stats = await redisClient.get(key);
    return stats ? JSON.parse(stats) : null;
  },
};

export default redisClient;
