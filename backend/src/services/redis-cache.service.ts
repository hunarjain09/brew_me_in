import { createClient, RedisClientType } from 'redis';
import { config } from '../config/env';
import { createHash } from 'crypto';

/**
 * Redis Cache Service
 * Handles all caching operations for the AI agent
 */

export class RedisCacheService {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    this.client = createClient({
      socket: {
        host: config.REDIS_HOST,
        port: config.REDIS_PORT,
      },
      password: config.REDIS_PASSWORD,
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      console.log('Redis Client Connected');
      this.isConnected = true;
    });
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  /**
   * Generate a hash for cache keys
   */
  private hashKey(input: string): string {
    return createHash('md5').update(input).digest('hex');
  }

  /**
   * Cache an agent query response
   */
  async cacheAgentResponse(
    cafeId: string,
    question: string,
    response: string,
    ttl: number = config.AGENT_CACHE_TTL
  ): Promise<void> {
    try {
      const questionHash = this.hashKey(question.toLowerCase().trim());
      const key = `agent:cache:${cafeId}:${questionHash}`;
      await this.client.setEx(key, ttl, response);
    } catch (error) {
      console.error('Error caching agent response:', error);
    }
  }

  /**
   * Get cached agent response
   */
  async getCachedResponse(cafeId: string, question: string): Promise<string | null> {
    try {
      const questionHash = this.hashKey(question.toLowerCase().trim());
      const key = `agent:cache:${cafeId}:${questionHash}`;
      return await this.client.get(key);
    } catch (error) {
      console.error('Error getting cached response:', error);
      return null;
    }
  }

  /**
   * Invalidate all cache for a specific cafe
   */
  async invalidateCafeCache(cafeId: string): Promise<void> {
    try {
      const pattern = `agent:cache:${cafeId}:*`;
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      console.error('Error invalidating cafe cache:', error);
    }
  }

  /**
   * Check global rate limit
   */
  async checkGlobalRateLimit(): Promise<boolean> {
    try {
      const key = 'agent:query:global:last';
      const lastQuery = await this.client.get(key);

      if (!lastQuery) {
        await this.client.set(key, Date.now().toString());
        return true;
      }

      const timeSinceLastQuery = Date.now() - parseInt(lastQuery, 10);
      if (timeSinceLastQuery < config.GLOBAL_RATE_LIMIT_MS) {
        return false;
      }

      await this.client.set(key, Date.now().toString());
      return true;
    } catch (error) {
      console.error('Error checking global rate limit:', error);
      return true; // Allow on error
    }
  }

  /**
   * Check and update user rate limit
   */
  async checkUserRateLimit(userId: string): Promise<{ allowed: boolean; remaining: number }> {
    try {
      const key = `agent:query:${userId}:count`;
      const count = await this.client.get(key);

      if (!count) {
        await this.client.setEx(key, 86400, '1'); // 24 hours
        return { allowed: true, remaining: config.USER_RATE_LIMIT_DAILY - 1 };
      }

      const currentCount = parseInt(count, 10);

      if (currentCount >= config.USER_RATE_LIMIT_DAILY) {
        return { allowed: false, remaining: 0 };
      }

      await this.client.incr(key);
      return { allowed: true, remaining: config.USER_RATE_LIMIT_DAILY - currentCount - 1 };
    } catch (error) {
      console.error('Error checking user rate limit:', error);
      return { allowed: true, remaining: config.USER_RATE_LIMIT_DAILY };
    }
  }

  /**
   * Track query analytics
   */
  async trackQuery(cafeId: string, question: string, responseTime: number, cached: boolean): Promise<void> {
    try {
      const date = new Date().toISOString().split('T')[0];

      // Increment total queries
      await this.client.incr(`agent:analytics:${cafeId}:${date}:total`);

      // Track response time (store for averaging)
      await this.client.rPush(`agent:analytics:${cafeId}:${date}:times`, responseTime.toString());

      // Track cache hits
      if (cached) {
        await this.client.incr(`agent:analytics:${cafeId}:${date}:cached`);
      }

      // Track popular questions
      const questionHash = this.hashKey(question.toLowerCase().trim());
      await this.client.zIncrBy(`agent:analytics:${cafeId}:questions`, 1, questionHash);

      // Store question text (for lookup)
      await this.client.setEx(`agent:analytics:question:${questionHash}`, 86400 * 7, question);
    } catch (error) {
      console.error('Error tracking query analytics:', error);
    }
  }

  /**
   * Get analytics for a cafe
   */
  async getAnalytics(cafeId: string, date?: string): Promise<any> {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];

      const total = await this.client.get(`agent:analytics:${cafeId}:${targetDate}:total`);
      const cached = await this.client.get(`agent:analytics:${cafeId}:${targetDate}:cached`);
      const times = await this.client.lRange(`agent:analytics:${cafeId}:${targetDate}:times`, 0, -1);

      const totalQueries = parseInt(total || '0', 10);
      const cachedQueries = parseInt(cached || '0', 10);
      const responseTimes = times.map(t => parseInt(t, 10));
      const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

      // Get popular questions
      const popularQuestionHashes = await this.client.zRangeWithScores(
        `agent:analytics:${cafeId}:questions`,
        0,
        9,
        { REV: true }
      );

      const popularQuestions = await Promise.all(
        popularQuestionHashes.map(async ({ value: hash, score }) => {
          const question = await this.client.get(`agent:analytics:question:${hash}`);
          return { question: question || 'Unknown', count: score };
        })
      );

      return {
        totalQueries,
        cachedQueries,
        cacheHitRate: totalQueries > 0 ? (cachedQueries / totalQueries) * 100 : 0,
        averageResponseTime: Math.round(avgResponseTime),
        popularQuestions,
      };
    } catch (error) {
      console.error('Error getting analytics:', error);
      return null;
    }
  }

  /**
   * Pre-cache common questions
   */
  async preCacheCommonQuestions(cafeId: string, questions: Array<{ question: string; answer: string }>): Promise<void> {
    try {
      for (const { question, answer } of questions) {
        await this.cacheAgentResponse(cafeId, question, answer, config.COMMON_QUERIES_CACHE_TTL);
      }
    } catch (error) {
      console.error('Error pre-caching questions:', error);
    }
  }
}

export default new RedisCacheService();
