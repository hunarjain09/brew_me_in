import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

/**
 * Validation Middleware
 * Validates request data using Zod schemas
 */

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

// Common validation schemas (Component 1: Auth & User Management)
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

  // Component 5: AI Agent Integration schemas
  agentQuery: z.object({
    cafeId: z.string().min(1),
    question: z.string().min(1).max(500),
    userId: z.string().min(1),
    streaming: z.boolean().optional(),
  }),

  agentConfig: z.object({
    personality: z.enum(['bartender', 'quirky', 'historian', 'sarcastic', 'professional', 'custom']).optional(),
    customPrompt: z.string().max(1000).optional(),
    proactivity: z.enum(['silent', 'occasional', 'active', 'hype']).optional(),
    enabledQueries: z.array(
      z.enum(['orders', 'stats', 'menu', 'events', 'community'])
    ).optional(),
    maxTokens: z.number().min(50).max(1000).optional(),
    temperature: z.number().min(0).max(1).optional(),
  }),

  cafeId: z.object({
    cafeId: z.string().min(1),
  }),

  proactiveMessage: z.object({
    cafeId: z.string().min(1),
    trigger: z.enum(['event', 'milestone', 'scheduled', 'manual']),
    metadata: z.record(z.any()).optional(),
  }),
};
