import { Request, Response, NextFunction } from 'express';
import { rateLimitService } from '../services/rateLimitService';
import { spamDetectionService } from '../services/spamDetectionService';
import { sendRateLimitError, sendSpamError } from '../utils/apiResponse';
import { ResourceType, UserTier } from '../types/rateLimit';
import { logger } from '../config/logger';

/**
 * Rate Limit Middleware
 * Protects routes with rate limiting and spam detection
 */

/**
 * Extract user info from request
 * In production, this would come from JWT token
 */
function getUserInfo(req: Request): { userId: string; userTier: UserTier } {
  // For demo purposes, use query params or headers
  // In production, extract from authenticated JWT token
  const userId = (req.headers['x-user-id'] as string) || req.body?.userId || 'anonymous';
  const userTier = (req.headers['x-user-tier'] as string) || 'free';

  return {
    userId,
    userTier: userTier === 'badgeHolder' ? 'badgeHolder' : 'free',
  };
}

/**
 * Message rate limit middleware
 */
export function rateLimitMessage() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, userTier } = getUserInfo(req);

      const result = await rateLimitService.checkRateLimit(
        userId,
        'message',
        userTier
      );

      if (!result.allowed) {
        logger.warn('Message rate limit exceeded', {
          userId,
          userTier,
          reason: result.reason,
        });

        return sendRateLimitError(
          res,
          result.reason || 'Too many messages',
          result.retryAfter
        );
      }

      // Attach remaining count to request for use in response
      (req as any).rateLimit = {
        remaining: result.remaining,
        resetAt: result.resetAt,
      };

      next();
    } catch (error) {
      logger.error('Rate limit middleware error', { error });
      // Fail open - allow request if middleware fails
      next();
    }
  };
}

/**
 * Agent query rate limit middleware
 */
export function rateLimitAgent() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = getUserInfo(req);
      const sessionId = (req.headers['x-session-id'] as string) || 'default';

      const result = await rateLimitService.checkRateLimit(
        userId,
        'agent',
        'free',
        sessionId
      );

      if (!result.allowed) {
        logger.warn('Agent rate limit exceeded', {
          userId,
          sessionId,
          reason: result.reason,
        });

        return sendRateLimitError(
          res,
          result.reason || 'Too many agent queries',
          result.retryAfter
        );
      }

      (req as any).rateLimit = {
        remaining: result.remaining,
        resetAt: result.resetAt,
      };

      next();
    } catch (error) {
      logger.error('Agent rate limit middleware error', { error });
      next();
    }
  };
}

/**
 * Poke rate limit middleware
 */
export function rateLimitPoke() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = getUserInfo(req);

      const result = await rateLimitService.checkRateLimit(userId, 'poke');

      if (!result.allowed) {
        logger.warn('Poke rate limit exceeded', {
          userId,
          reason: result.reason,
        });

        return sendRateLimitError(
          res,
          result.reason || 'Too many pokes',
          result.retryAfter
        );
      }

      (req as any).rateLimit = {
        remaining: result.remaining,
        resetAt: result.resetAt,
      };

      next();
    } catch (error) {
      logger.error('Poke rate limit middleware error', { error });
      next();
    }
  };
}

/**
 * Spam detection middleware
 */
export function detectSpam() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = getUserInfo(req);
      const content = req.body?.content || req.body?.message || '';

      if (!content) {
        // No content to check
        next();
        return;
      }

      const result = await spamDetectionService.checkSpam({
        content,
        userId,
        timestamp: new Date(),
        cafeId: req.body?.cafeId,
      });

      if (result.isSpam) {
        logger.warn('Spam detected', {
          userId,
          action: result.action,
          violations: result.violations.length,
        });

        // Block or mute actions prevent the request
        if (result.action === 'block' || result.action === 'mute') {
          return sendSpamError(res, result.message || 'Spam detected', {
            violations: result.violations,
            action: result.action,
          });
        }

        // Warn action allows request but adds warning to response
        if (result.action === 'warn') {
          (req as any).spamWarning = result.message;
        }
      }

      next();
    } catch (error) {
      logger.error('Spam detection middleware error', { error });
      // Fail open - allow request if spam detection fails
      next();
    }
  };
}

/**
 * Combined rate limit and spam check for messages
 */
export function protectMessage() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { userId, userTier } = getUserInfo(req);
    const content = req.body?.content || req.body?.message || '';

    try {
      // Check rate limit first
      const rateLimitResult = await rateLimitService.checkRateLimit(
        userId,
        'message',
        userTier
      );

      if (!rateLimitResult.allowed) {
        return sendRateLimitError(
          res,
          rateLimitResult.reason || 'Too many messages',
          rateLimitResult.retryAfter
        );
      }

      // Then check spam
      if (content) {
        const spamResult = await spamDetectionService.checkSpam({
          content,
          userId,
          timestamp: new Date(),
          cafeId: req.body?.cafeId,
        });

        if (
          spamResult.isSpam &&
          (spamResult.action === 'block' || spamResult.action === 'mute')
        ) {
          return sendSpamError(res, spamResult.message || 'Spam detected', {
            violations: spamResult.violations,
            action: spamResult.action,
          });
        }

        if (spamResult.action === 'warn') {
          (req as any).spamWarning = spamResult.message;
        }
      }

      // Attach metadata to request
      (req as any).rateLimit = {
        remaining: rateLimitResult.remaining,
        resetAt: rateLimitResult.resetAt,
      };

      next();
    } catch (error) {
      logger.error('Message protection middleware error', { error });
      next();
    }
  };
}
