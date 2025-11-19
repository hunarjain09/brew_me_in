import { Request, Response } from 'express';
import { z } from 'zod';
import { rateLimitService } from '../services/rateLimitService';
import { spamDetectionService } from '../services/spamDetectionService';
import {
  sendSuccess,
  sendError,
  sendValidationError,
  sendInternalError,
} from '../utils/apiResponse';
import { ErrorCode } from '../types/api';
import { ResourceType, UserTier } from '../types/rateLimit';

/**
 * Rate Limit Controller
 * Handles rate limit API endpoints
 */

/**
 * GET /api/ratelimit/status
 * Get comprehensive rate limit status for a user
 */
export async function getRateLimitStatus(
  req: Request,
  res: Response
): Promise<Response> {
  try {
    const schema = z.object({
      userId: z.string().min(1),
      userTier: z.enum(['free', 'badgeHolder']).optional().default('free'),
      sessionId: z.string().optional().default('default'),
    });

    const result = schema.safeParse(req.query);

    if (!result.success) {
      return sendValidationError(res, 'Invalid request parameters', result.error);
    }

    const { userId, userTier, sessionId } = result.data;

    const status = await rateLimitService.getRateLimitStatus(
      userId,
      userTier as UserTier,
      sessionId
    );

    return sendSuccess(res, status);
  } catch (error) {
    console.error('Get rate limit status error:', error);
    return sendInternalError(res);
  }
}

/**
 * POST /api/ratelimit/check
 * Check if a specific action is rate limited
 */
export async function checkRateLimit(
  req: Request,
  res: Response
): Promise<Response> {
  try {
    const schema = z.object({
      resource: z.enum(['message', 'agent', 'poke']),
      userId: z.string().min(1),
      userTier: z.enum(['free', 'badgeHolder']).optional().default('free'),
      sessionId: z.string().optional(),
    });

    const result = schema.safeParse(req.body);

    if (!result.success) {
      return sendValidationError(res, 'Invalid request body', result.error);
    }

    const { resource, userId, userTier, sessionId } = result.data;

    const checkResult = await rateLimitService.checkRateLimit(
      userId,
      resource as ResourceType,
      userTier as UserTier,
      sessionId
    );

    return sendSuccess(res, checkResult);
  } catch (error) {
    console.error('Check rate limit error:', error);
    return sendInternalError(res);
  }
}

/**
 * POST /api/ratelimit/consume
 * Consume a rate limit token (for testing/admin)
 */
export async function consumeRateLimit(
  req: Request,
  res: Response
): Promise<Response> {
  try {
    const schema = z.object({
      resource: z.enum(['message', 'agent', 'poke']),
      userId: z.string().min(1),
      userTier: z.enum(['free', 'badgeHolder']).optional().default('free'),
      sessionId: z.string().optional().default('default'),
    });

    const result = schema.safeParse(req.body);

    if (!result.success) {
      return sendValidationError(res, 'Invalid request body', result.error);
    }

    const { resource, userId, userTier, sessionId } = result.data;

    // First check if allowed
    const checkResult = await rateLimitService.checkRateLimit(
      userId,
      resource as ResourceType,
      userTier as UserTier,
      sessionId
    );

    if (!checkResult.allowed) {
      return sendError(
        res,
        ErrorCode.RATE_LIMIT_EXCEEDED,
        checkResult.reason || 'Rate limit exceeded',
        429,
        {
          remaining: checkResult.remaining,
          resetAt: checkResult.resetAt,
          retryAfter: checkResult.retryAfter,
        }
      );
    }

    // Consume token
    switch (resource) {
      case 'message':
        await rateLimitService.consumeMessageToken(userId, userTier as UserTier);
        break;
      case 'agent':
        await rateLimitService.consumeAgentToken(userId, sessionId);
        break;
      case 'poke':
        await rateLimitService.consumePokeToken(userId);
        break;
    }

    return sendSuccess(res, {
      consumed: true,
      remaining: checkResult.remaining,
      resetAt: checkResult.resetAt,
    });
  } catch (error) {
    console.error('Consume rate limit error:', error);
    return sendInternalError(res);
  }
}

/**
 * POST /api/spam/check
 * Check if a message is spam
 */
export async function checkSpam(req: Request, res: Response): Promise<Response> {
  try {
    const schema = z.object({
      content: z.string().min(1),
      userId: z.string().min(1),
      cafeId: z.string().optional(),
    });

    const result = schema.safeParse(req.body);

    if (!result.success) {
      return sendValidationError(res, 'Invalid request body', result.error);
    }

    const { content, userId, cafeId } = result.data;

    const spamResult = await spamDetectionService.checkSpam({
      content,
      userId,
      timestamp: new Date(),
      cafeId,
    });

    return sendSuccess(res, spamResult);
  } catch (error) {
    console.error('Check spam error:', error);
    return sendInternalError(res);
  }
}

/**
 * GET /api/spam/mute/:userId
 * Get mute information for a user
 */
export async function getMuteInfo(req: Request, res: Response): Promise<Response> {
  try {
    const { userId } = req.params;

    if (!userId) {
      return sendValidationError(res, 'User ID is required');
    }

    const muteInfo = await spamDetectionService.getMuteInfo(userId);

    if (!muteInfo) {
      return sendSuccess(res, { muted: false });
    }

    return sendSuccess(res, {
      muted: true,
      ...muteInfo,
    });
  } catch (error) {
    console.error('Get mute info error:', error);
    return sendInternalError(res);
  }
}

/**
 * DELETE /api/spam/mute/:userId
 * Unmute a user (admin function)
 */
export async function unmuteUser(req: Request, res: Response): Promise<Response> {
  try {
    const { userId } = req.params;

    if (!userId) {
      return sendValidationError(res, 'User ID is required');
    }

    await spamDetectionService.unmuteUser(userId);

    return sendSuccess(res, { unmuted: true });
  } catch (error) {
    console.error('Unmute user error:', error);
    return sendInternalError(res);
  }
}

/**
 * POST /api/ratelimit/reset
 * Reset rate limit for a user (admin function)
 */
export async function resetRateLimit(
  req: Request,
  res: Response
): Promise<Response> {
  try {
    const schema = z.object({
      userId: z.string().min(1),
      resource: z.enum(['message', 'agent', 'poke']).optional(),
    });

    const result = schema.safeParse(req.body);

    if (!result.success) {
      return sendValidationError(res, 'Invalid request body', result.error);
    }

    const { userId, resource } = result.data;

    await rateLimitService.resetRateLimit(
      userId,
      resource as ResourceType | undefined
    );

    return sendSuccess(res, {
      reset: true,
      userId,
      resource: resource || 'all',
    });
  } catch (error) {
    console.error('Reset rate limit error:', error);
    return sendInternalError(res);
  }
}
