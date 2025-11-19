import { redisClient, RedisKeys } from '../config/redis';
import { config } from '../config/env';
import { logger } from '../config/logger';
import {
  ResourceType,
  UserTier,
  RateLimitCheckResult,
  RateLimitStatus,
} from '../types/rateLimit';

/**
 * Rate Limiting Service
 * Implements token bucket algorithm for rate limiting
 * Component 3: Rate Limiting & Spam Prevention
 */
export class RateLimitService {
  /**
   * Check if a user can perform an action (message, agent query, poke)
   */
  async checkRateLimit(
    userId: string,
    resource: ResourceType,
    userTier: UserTier = 'free',
    sessionId?: string
  ): Promise<RateLimitCheckResult> {
    try {
      if (!config.rateLimit.enabled) {
        return {
          allowed: true,
          remaining: 999,
          resetAt: new Date(Date.now() + 3600000),
        };
      }

      switch (resource) {
        case 'message':
          return await this.checkMessageRateLimit(userId, userTier);
        case 'agent':
          return await this.checkAgentRateLimit(userId, sessionId || 'default');
        case 'poke':
          return await this.checkPokeRateLimit(userId);
        default:
          throw new Error(`Unknown resource type: ${resource}`);
      }
    } catch (error) {
      logger.error('Rate limit check failed', { userId, resource, error });
      // Fail open - allow the request if rate limiting fails
      return {
        allowed: true,
        remaining: 0,
        resetAt: new Date(),
        reason: 'Rate limiting service error',
      };
    }
  }

  /**
   * Check message rate limit (token bucket + cooldown)
   */
  private async checkMessageRateLimit(
    userId: string,
    userTier: UserTier
  ): Promise<RateLimitCheckResult> {
    const client = redisClient.getClient();
    const limits = config.rateLimit.message[userTier];
    const now = Date.now();

    const key = RedisKeys.rateLimitMessage(userId);
    const lastKey = RedisKeys.rateLimitMessageLast(userId);

    // Check cooldown
    const lastTimestamp = await client.get(lastKey);
    if (lastTimestamp) {
      const timeSinceLastMessage = (now - parseInt(lastTimestamp)) / 1000;
      if (timeSinceLastMessage < limits.cooldown) {
        const retryAfter = Math.ceil(limits.cooldown - timeSinceLastMessage);
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(now + retryAfter * 1000),
          retryAfter,
          reason: `Cooldown active. Wait ${retryAfter}s`,
        };
      }
    }

    // Token bucket check
    const current = await client.get(key);
    const remaining = current ? parseInt(current) : limits.count;

    if (remaining <= 0) {
      // Get TTL to know when it resets
      const ttl = await client.ttl(key);
      const resetAt = new Date(now + ttl * 1000);
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: ttl,
        reason: 'Rate limit exceeded',
      };
    }

    return {
      allowed: true,
      remaining: remaining - 1,
      resetAt: new Date(now + limits.window * 1000),
    };
  }

  /**
   * Consume a message rate limit token
   */
  async consumeMessageToken(userId: string, userTier: UserTier): Promise<void> {
    const client = redisClient.getClient();
    const limits = config.rateLimit.message[userTier];
    const now = Date.now();

    const key = RedisKeys.rateLimitMessage(userId);
    const lastKey = RedisKeys.rateLimitMessageLast(userId);

    // Decrement token bucket
    const current = await client.get(key);
    if (!current) {
      // Initialize bucket
      await client.set(key, limits.count - 1, { EX: limits.window });
    } else {
      await client.decr(key);
    }

    // Update last message timestamp
    await client.set(lastKey, now.toString(), { EX: limits.cooldown + 60 });
  }

  /**
   * Check agent query rate limit
   */
  private async checkAgentRateLimit(
    userId: string,
    sessionId: string
  ): Promise<RateLimitCheckResult> {
    const client = redisClient.getClient();
    const now = Date.now();

    // Check global cooldown (2 minutes between ANY agent query)
    const globalKey = RedisKeys.rateLimitAgentGlobal();
    const lastGlobalQuery = await client.get(globalKey);

    if (lastGlobalQuery) {
      const timeSinceLastQuery =
        (now - parseInt(lastGlobalQuery)) / 1000;
      const globalCooldown = config.rateLimit.agent.global.cooldown;

      if (timeSinceLastQuery < globalCooldown) {
        const retryAfter = Math.ceil(globalCooldown - timeSinceLastQuery);
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(now + retryAfter * 1000),
          retryAfter,
          reason: `Global agent cooldown. Wait ${retryAfter}s`,
        };
      }
    }

    // Check personal session limit (2 queries per session)
    const personalKey = RedisKeys.rateLimitAgentPersonal(userId, sessionId);
    const personalCount = await client.get(personalKey);
    const remaining = personalCount
      ? config.rateLimit.agent.personal.count - parseInt(personalCount)
      : config.rateLimit.agent.personal.count;

    if (remaining <= 0) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(now + 86400000), // Reset with session (arbitrary)
        reason: 'Personal agent limit exceeded for this session',
      };
    }

    return {
      allowed: true,
      remaining: remaining - 1,
      resetAt: new Date(now + 86400000),
    };
  }

  /**
   * Consume an agent query token
   */
  async consumeAgentToken(userId: string, sessionId: string): Promise<void> {
    const client = redisClient.getClient();
    const now = Date.now();

    // Update global cooldown
    const globalKey = RedisKeys.rateLimitAgentGlobal();
    await client.set(globalKey, now.toString(), {
      EX: config.rateLimit.agent.global.cooldown + 60,
    });

    // Increment personal session count
    const personalKey = RedisKeys.rateLimitAgentPersonal(userId, sessionId);
    const current = await client.get(personalKey);

    if (!current) {
      await client.set(personalKey, '1', { EX: 86400 }); // 24h session
    } else {
      await client.incr(personalKey);
    }
  }

  /**
   * Check poke rate limit (5 per 24h)
   */
  private async checkPokeRateLimit(userId: string): Promise<RateLimitCheckResult> {
    const client = redisClient.getClient();
    const limits = config.rateLimit.poke;
    const now = Date.now();

    const key = RedisKeys.rateLimitPoke(userId);
    const current = await client.get(key);
    const count = current ? parseInt(current) : 0;

    if (count >= limits.count) {
      const ttl = await client.ttl(key);
      const resetAt = new Date(now + ttl * 1000);
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: ttl,
        reason: `Poke limit exceeded. Resets in ${Math.ceil(ttl / 3600)}h`,
      };
    }

    return {
      allowed: true,
      remaining: limits.count - count - 1,
      resetAt: new Date(now + limits.window * 1000),
    };
  }

  /**
   * Consume a poke token
   */
  async consumePokeToken(userId: string): Promise<void> {
    const client = redisClient.getClient();
    const key = RedisKeys.rateLimitPoke(userId);
    const limits = config.rateLimit.poke;

    const current = await client.get(key);
    if (!current) {
      await client.set(key, '1', { EX: limits.window });
    } else {
      await client.incr(key);
    }
  }

  /**
   * Get comprehensive rate limit status for a user
   */
  async getRateLimitStatus(
    userId: string,
    userTier: UserTier = 'free',
    sessionId: string = 'default'
  ): Promise<RateLimitStatus> {
    const [messageStatus, agentStatus, pokeStatus] = await Promise.all([
      this.checkMessageRateLimit(userId, userTier),
      this.checkAgentRateLimit(userId, sessionId),
      this.checkPokeRateLimit(userId),
    ]);

    const client = redisClient.getClient();
    const limits = config.rateLimit.message[userTier];

    // Get agent personal count
    const personalKey = RedisKeys.rateLimitAgentPersonal(userId, sessionId);
    const personalCount = await client.get(personalKey);
    const agentRemaining =
      config.rateLimit.agent.personal.count - (parseInt(personalCount || '0'));

    // Get global agent timestamp
    const globalKey = RedisKeys.rateLimitAgentGlobal();
    const lastGlobalQuery = await client.get(globalKey);
    const globalNextAvailable = lastGlobalQuery
      ? new Date(
          parseInt(lastGlobalQuery) +
            config.rateLimit.agent.global.cooldown * 1000
        )
      : new Date();

    return {
      message: {
        allowed: messageStatus.allowed,
        remaining: messageStatus.remaining,
        resetAt: messageStatus.resetAt,
        cooldown: limits.cooldown,
      },
      agent: {
        personal: {
          allowed: agentStatus.allowed,
          remaining: agentRemaining,
          resetAt: agentStatus.resetAt,
        },
        global: {
          allowed: Date.now() >= globalNextAvailable.getTime(),
          nextAvailable: globalNextAvailable,
        },
      },
      poke: {
        allowed: pokeStatus.allowed,
        remaining: pokeStatus.remaining,
        resetAt: pokeStatus.resetAt,
      },
    };
  }

  /**
   * Reset rate limit for a user (admin function)
   */
  async resetRateLimit(userId: string, resource?: ResourceType): Promise<void> {
    const client = redisClient.getClient();

    if (!resource) {
      // Reset all
      const keys = [
        RedisKeys.rateLimitMessage(userId),
        RedisKeys.rateLimitMessageLast(userId),
        RedisKeys.rateLimitPoke(userId),
      ];
      await Promise.all(keys.map((key) => client.del(key)));
    } else {
      switch (resource) {
        case 'message':
          await client.del(RedisKeys.rateLimitMessage(userId));
          await client.del(RedisKeys.rateLimitMessageLast(userId));
          break;
        case 'poke':
          await client.del(RedisKeys.rateLimitPoke(userId));
          break;
      }
    }

    logger.info('Rate limit reset', { userId, resource });
  }
}

// Export singleton instance
export const rateLimitService = new RateLimitService();
