import { Request, Response, NextFunction } from 'express';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * Simple authentication middleware
 * In production, this would validate JWT tokens or session cookies
 * For now, we'll accept a user ID from the X-User-Id header
 */
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.headers['x-user-id'] as string;

  if (!userId) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing X-User-Id header',
    });
  }

  // In production, validate the user ID against database/session
  req.userId = userId;
  next();
};

/**
 * Optional authentication - doesn't fail if no user ID provided
 */
export const optionalAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.headers['x-user-id'] as string;
  if (userId) {
    req.userId = userId;
  }
  next();
};
