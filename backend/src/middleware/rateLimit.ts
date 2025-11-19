import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redisClient } from '../db/redis';
import { config } from '../config';

export const createRateLimiter = (options?: {
  windowMs?: number;
  max?: number;
  keyPrefix?: string;
}) => {
  return rateLimit({
    windowMs: options?.windowMs || config.rateLimit.windowMs,
    max: options?.max || config.rateLimit.maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      // @ts-ignore - rate-limit-redis types issue
      client: redisClient,
      prefix: options?.keyPrefix || 'rl:',
    }),
    handler: (req, res) => {
      res.status(429).json({
        error: 'Too many requests, please try again later.',
      });
    },
  });
};

// Specific rate limiters for different endpoints
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  keyPrefix: 'rl:auth:',
});

export const usernameGenerationRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 username generations per cafe per hour
  keyPrefix: 'rl:username:',
});

export const tipRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 tips per minute
  keyPrefix: 'rl:tip:',
});

export const generalApiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  keyPrefix: 'rl:api:',
});
