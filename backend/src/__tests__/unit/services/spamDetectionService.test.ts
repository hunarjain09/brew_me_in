/**
 * Unit tests for Spam Detection Service
 */
import { SpamDetectionService } from '../../../services/spamDetectionService';
import { mockRedis, resetRedisMocks } from '../../mocks/redis.mock';

// Mock Redis
jest.mock('../../../db/redis', () => ({
  redisClient: mockRedis,
}));

// Mock config
jest.mock('../../../config', () => ({
  config: {
    spam: {
      enabled: true,
      duplicateWindow: 300,
      maxCapsPercentage: 50,
      maxUrls: 2,
      muteDuration: 86400,
    },
  },
}));

describe('SpamDetectionService', () => {
  beforeEach(() => {
    resetRedisMocks();
  });

  describe('checkMessage', () => {
    it('should allow normal messages', async () => {
      const userId = 'user123';
      const message = 'Hello, how is everyone doing today?';

      mockRedis.get.mockResolvedValue(null);

      const result = await SpamDetectionService.checkMessage(userId, message);

      expect(result.isSpam).toBe(false);
      expect(result.violations).toEqual([]);
    });

    it('should detect excessive caps', async () => {
      const userId = 'user123';
      const message = 'HELLO EVERYONE THIS IS A TEST MESSAGE!!!';

      mockRedis.get.mockResolvedValue(null);

      const result = await SpamDetectionService.checkMessage(userId, message);

      expect(result.isSpam).toBe(true);
      expect(result.violations).toContain('excessive_caps');
    });

    it('should detect too many URLs', async () => {
      const userId = 'user123';
      const message = 'Check out https://site1.com and https://site2.com and https://site3.com';

      mockRedis.get.mockResolvedValue(null);

      const result = await SpamDetectionService.checkMessage(userId, message);

      expect(result.isSpam).toBe(true);
      expect(result.violations).toContain('too_many_urls');
    });

    it('should detect duplicate messages', async () => {
      const userId = 'user123';
      const message = 'This is a duplicate message';

      mockRedis.get.mockResolvedValue(message);

      const result = await SpamDetectionService.checkMessage(userId, message);

      expect(result.isSpam).toBe(true);
      expect(result.violations).toContain('duplicate_message');
    });

    it('should detect repeated characters', async () => {
      const userId = 'user123';
      const message = 'Hellooooooooooo everyoneeeeeeee!!!!!!!!!';

      mockRedis.get.mockResolvedValue(null);

      const result = await SpamDetectionService.checkMessage(userId, message);

      expect(result.isSpam).toBe(true);
      expect(result.violations).toContain('repeated_chars');
    });

    it('should allow messages with reasonable URLs', async () => {
      const userId = 'user123';
      const message = 'Check out this article: https://example.com/article';

      mockRedis.get.mockResolvedValue(null);

      const result = await SpamDetectionService.checkMessage(userId, message);

      expect(result.isSpam).toBe(false);
    });

    it('should allow messages with some caps', async () => {
      const userId = 'user123';
      const message = 'Hello! This is GREAT news for everyone.';

      mockRedis.get.mockResolvedValue(null);

      const result = await SpamDetectionService.checkMessage(userId, message);

      expect(result.isSpam).toBe(false);
    });
  });

  describe('isExcessiveCaps', () => {
    it('should detect excessive caps (>50%)', () => {
      const message = 'HELLO WORLD THIS IS A TEST';
      const result = SpamDetectionService.isExcessiveCaps(message);
      expect(result).toBe(true);
    });

    it('should allow reasonable caps usage', () => {
      const message = 'Hello World, this is a TEST';
      const result = SpamDetectionService.isExcessiveCaps(message);
      expect(result).toBe(false);
    });

    it('should handle short messages', () => {
      const message = 'OK';
      const result = SpamDetectionService.isExcessiveCaps(message);
      expect(result).toBe(false); // Short messages should be allowed
    });
  });

  describe('containsTooManyUrls', () => {
    it('should detect too many URLs', () => {
      const message = 'Visit https://site1.com, https://site2.com, and http://site3.com';
      const result = SpamDetectionService.containsTooManyUrls(message);
      expect(result).toBe(true);
    });

    it('should allow reasonable number of URLs', () => {
      const message = 'Check out https://example.com for more info';
      const result = SpamDetectionService.containsTooManyUrls(message);
      expect(result).toBe(false);
    });

    it('should handle messages without URLs', () => {
      const message = 'This is a normal message without any links';
      const result = SpamDetectionService.containsTooManyUrls(message);
      expect(result).toBe(false);
    });
  });

  describe('hasRepeatedCharacters', () => {
    it('should detect repeated characters', () => {
      const message = 'Hellooooooo worldddddd';
      const result = SpamDetectionService.hasRepeatedCharacters(message);
      expect(result).toBe(true);
    });

    it('should allow normal repetition', () => {
      const message = 'Hello everyone, good morning!';
      const result = SpamDetectionService.hasRepeatedCharacters(message);
      expect(result).toBe(false);
    });

    it('should allow intentional repetition like "!!!"', () => {
      const message = 'Wow!!! That is amazing';
      const result = SpamDetectionService.hasRepeatedCharacters(message);
      expect(result).toBe(false); // Should allow some repetition
    });
  });

  describe('muteUser', () => {
    it('should mute user for specified duration', async () => {
      const userId = 'user123';
      const duration = 3600; // 1 hour
      const reason = 'Spam detected';

      mockRedis.set.mockResolvedValue('OK');

      await SpamDetectionService.muteUser(userId, duration, reason);

      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining(`mute:${userId}`),
        expect.any(String),
        expect.objectContaining({ EX: duration })
      );
    });
  });

  describe('isUserMuted', () => {
    it('should return true for muted user', async () => {
      const userId = 'user123';
      mockRedis.get.mockResolvedValue(JSON.stringify({ reason: 'spam' }));

      const result = await SpamDetectionService.isUserMuted(userId);

      expect(result).toBe(true);
    });

    it('should return false for non-muted user', async () => {
      const userId = 'user123';
      mockRedis.get.mockResolvedValue(null);

      const result = await SpamDetectionService.isUserMuted(userId);

      expect(result).toBe(false);
    });
  });

  describe('unmuteUser', () => {
    it('should unmute a user', async () => {
      const userId = 'user123';
      mockRedis.del.mockResolvedValue(1);

      await SpamDetectionService.unmuteUser(userId);

      expect(mockRedis.del).toHaveBeenCalledWith(
        expect.stringContaining(`mute:${userId}`)
      );
    });
  });

  describe('getViolationHistory', () => {
    it('should return user violation history', async () => {
      const userId = 'user123';
      const violations = [
        { type: 'excessive_caps', timestamp: Date.now() },
        { type: 'duplicate_message', timestamp: Date.now() - 10000 },
      ];

      mockRedis.lrange.mockResolvedValue(violations.map(v => JSON.stringify(v)));

      const result = await SpamDetectionService.getViolationHistory(userId);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('excessive_caps');
    });

    it('should return empty array for user with no violations', async () => {
      const userId = 'user123';
      mockRedis.lrange.mockResolvedValue([]);

      const result = await SpamDetectionService.getViolationHistory(userId);

      expect(result).toEqual([]);
    });
  });
});
