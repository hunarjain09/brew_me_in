/**
 * Unit tests for Rate Limit Service
 */
import { RateLimitService } from '../../../services/rateLimitService';
import { mockRedis, resetRedisMocks } from '../../mocks/redis.mock';

// Mock Redis
jest.mock('../../../db/redis', () => ({
  redisClient: mockRedis,
}));

// Mock config
jest.mock('../../../config', () => ({
  config: {
    rateLimit: {
      message: {
        free: {
          count: 30,
          window: 3600,
          cooldown: 30,
        },
        badge: {
          count: 60,
          window: 3600,
          cooldown: 15,
        },
      },
      agent: {
        personalCount: 2,
        globalCooldown: 120,
      },
      poke: {
        count: 5,
        window: 86400,
      },
    },
  },
}));

describe('RateLimitService', () => {
  beforeEach(() => {
    resetRedisMocks();
  });

  describe('checkMessageRateLimit', () => {
    it('should allow message for user with no prior messages', async () => {
      const userId = 'user123';
      const hasBadge = false;

      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');

      const result = await RateLimitService.checkMessageRateLimit(userId, hasBadge);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(29);
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('should enforce rate limit for free users', async () => {
      const userId = 'user123';
      const hasBadge = false;

      // Simulate user at limit
      mockRedis.get.mockResolvedValue(
        JSON.stringify({
          count: 30,
          resetAt: Date.now() + 3600000,
        })
      );

      const result = await RateLimitService.checkMessageRateLimit(userId, hasBadge);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should allow more messages for badge holders', async () => {
      const userId = 'user123';
      const hasBadge = true;

      mockRedis.get.mockResolvedValue(
        JSON.stringify({
          count: 35,
          resetAt: Date.now() + 3600000,
        })
      );

      const result = await RateLimitService.checkMessageRateLimit(userId, hasBadge);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it('should reset count after window expires', async () => {
      const userId = 'user123';
      const hasBadge = false;

      mockRedis.get.mockResolvedValue(
        JSON.stringify({
          count: 30,
          resetAt: Date.now() - 1000, // Expired
        })
      );
      mockRedis.set.mockResolvedValue('OK');

      const result = await RateLimitService.checkMessageRateLimit(userId, hasBadge);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(29);
    });
  });

  describe('checkPokeRateLimit', () => {
    it('should allow poke for user with no prior pokes', async () => {
      const userId = 'user123';

      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');

      const result = await RateLimitService.checkPokeRateLimit(userId);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('should enforce daily poke limit', async () => {
      const userId = 'user123';

      mockRedis.get.mockResolvedValue(
        JSON.stringify({
          count: 5,
          resetAt: Date.now() + 86400000,
        })
      );

      const result = await RateLimitService.checkPokeRateLimit(userId);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe('checkAgentQueryRateLimit', () => {
    it('should allow agent query for user with no prior queries', async () => {
      const userId = 'user123';

      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');

      const result = await RateLimitService.checkAgentQueryRateLimit(userId);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });

    it('should enforce per-session agent query limit', async () => {
      const userId = 'user123';

      mockRedis.get.mockResolvedValue(
        JSON.stringify({
          count: 2,
          resetAt: Date.now() + 120000,
        })
      );

      const result = await RateLimitService.checkAgentQueryRateLimit(userId);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should enforce global cooldown between queries', async () => {
      mockRedis.get.mockImplementation((key: string) => {
        if (key.includes('global_cooldown')) {
          return Promise.resolve('1');
        }
        return Promise.resolve(null);
      });

      const result = await RateLimitService.checkAgentQueryRateLimit('user123');

      expect(result.allowed).toBe(false);
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return status for all rate limits', async () => {
      const userId = 'user123';
      const hasBadge = false;

      mockRedis.get.mockImplementation((key: string) => {
        if (key.includes('message')) {
          return Promise.resolve(
            JSON.stringify({
              count: 10,
              resetAt: Date.now() + 3600000,
            })
          );
        }
        if (key.includes('poke')) {
          return Promise.resolve(
            JSON.stringify({
              count: 2,
              resetAt: Date.now() + 86400000,
            })
          );
        }
        if (key.includes('agent')) {
          return Promise.resolve(
            JSON.stringify({
              count: 1,
              resetAt: Date.now() + 120000,
            })
          );
        }
        return Promise.resolve(null);
      });

      const status = await RateLimitService.getRateLimitStatus(userId, hasBadge);

      expect(status.message.remaining).toBe(20);
      expect(status.poke.remaining).toBe(3);
      expect(status.agent.remaining).toBe(1);
    });
  });

  describe('resetUserRateLimits', () => {
    it('should reset all rate limits for a user', async () => {
      const userId = 'user123';

      mockRedis.del.mockResolvedValue(1);

      await RateLimitService.resetUserRateLimits(userId);

      expect(mockRedis.del).toHaveBeenCalledTimes(3); // message, poke, agent
    });
  });
});
