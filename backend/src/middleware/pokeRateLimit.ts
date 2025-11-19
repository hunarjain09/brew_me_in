import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import pokeService from '../services/poke.service';

const RATE_LIMIT_WINDOW_MS = parseInt(
  process.env.POKE_RATE_LIMIT_WINDOW_MS || '3600000'
); // 1 hour
const RATE_LIMIT_MAX = parseInt(process.env.POKE_RATE_LIMIT_MAX || '10');

/**
 * Rate limiting middleware for poke sending
 */
export const pokeRateLimit = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }

  try {
    const canSend = await pokeService.checkRateLimit(
      req.user.userId,
      RATE_LIMIT_WINDOW_MS,
      RATE_LIMIT_MAX
    );

    if (!canSend) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `You can only send ${RATE_LIMIT_MAX} pokes per hour`,
        retryAfter: RATE_LIMIT_WINDOW_MS / 1000, // in seconds
      });
    }

    next();
  } catch (error) {
    console.error('Rate limit check error:', error);
    next(error);
  }
};
