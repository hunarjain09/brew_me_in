import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      res.status(500).json({ error: 'Validation error' });
      return;
    }
  };
};

// Common validation schemas
export const schemas = {
  generateUsername: z.object({
    cafeId: z.string().uuid(),
    receiptId: z.string().min(1).max(100),
  }),

  joinCafe: z.object({
    username: z.string().min(3).max(50),
    joinToken: z.string().min(1),
    cafeId: z.string().uuid(),
    wifiSsid: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }),

  refreshToken: z.object({
    refreshToken: z.string().min(1),
  }),

  recordTip: z.object({
    userId: z.string().uuid(),
    amount: z.number().positive(),
  }),

  updateInterests: z.object({
    interests: z.array(z.string()).max(10),
  }),

  updatePokeEnabled: z.object({
    enabled: z.boolean(),
  }),
};
