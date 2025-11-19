import { Request, Response, NextFunction } from 'express';
import { JWTService } from '../utils/jwt';
import { UserModel } from '../models/User';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    username: string;
    cafeId: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);

    try {
      const payload = JWTService.verifyAccessToken(token);

      // Verify user still exists and is not expired
      const user = await UserModel.findById(payload.userId);

      if (!user) {
        res.status(401).json({ error: 'User not found or expired' });
        return;
      }

      req.user = {
        userId: payload.userId,
        username: payload.username,
        cafeId: payload.cafeId,
      };

      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
  } catch (error) {
    res.status(500).json({ error: 'Authentication error' });
    return;
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      try {
        const payload = JWTService.verifyAccessToken(token);
        const user = await UserModel.findById(payload.userId);

        if (user) {
          req.user = {
            userId: payload.userId,
            username: payload.username,
            cafeId: payload.cafeId,
          };
        }
      } catch (error) {
        // Ignore invalid tokens for optional auth
      }
    }

    next();
  } catch (error) {
    next();
  }
};
