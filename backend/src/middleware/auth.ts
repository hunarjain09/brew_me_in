import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWTService } from '../utils/jwt';
import { UserModel } from '../models/User';
import { ModeratorJWTPayload } from '../types';

// COMPONENT 1: User authentication
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

// COMPONENT 6: Moderator authentication
declare global {
  namespace Express {
    interface Request {
      moderator?: ModeratorJWTPayload;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Verify JWT token middleware for moderators
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as ModeratorJWTPayload;
    req.moderator = payload;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Check if moderator has permission
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.moderator) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { role } = req.moderator;
    const permissions = (req.moderator as any).permissions || [];

    // Owners have all permissions
    if (role === 'owner' || permissions.includes('all') || permissions.includes(permission)) {
      return next();
    }

    return res.status(403).json({ error: 'Insufficient permissions' });
  };
};

// Generate JWT token for moderators
export const generateToken = (payload: ModeratorJWTPayload): string => {
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};
