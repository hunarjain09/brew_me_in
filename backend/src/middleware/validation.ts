import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

/**
 * Validation Middleware
 * Validates request data using Joi schemas
 */

export function validateBody(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
      return;
    }

    next();
  };
}

export function validateParams(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.params);

    if (error) {
      res.status(400).json({
        error: 'Invalid parameters',
        details: error.details.map(d => d.message),
      });
      return;
    }

    next();
  };
}

export function validateQuery(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.query);

    if (error) {
      res.status(400).json({
        error: 'Invalid query parameters',
        details: error.details.map(d => d.message),
      });
      return;
    }

    next();
  };
}

// Common validation schemas
export const schemas = {
  agentQuery: Joi.object({
    cafeId: Joi.string().required(),
    question: Joi.string().min(1).max(500).required(),
    userId: Joi.string().required(),
    streaming: Joi.boolean().optional(),
  }),

  agentConfig: Joi.object({
    personality: Joi.string().valid('bartender', 'quirky', 'historian', 'sarcastic', 'professional', 'custom').optional(),
    customPrompt: Joi.string().max(1000).optional(),
    proactivity: Joi.string().valid('silent', 'occasional', 'active', 'hype').optional(),
    enabledQueries: Joi.array().items(
      Joi.string().valid('orders', 'stats', 'menu', 'events', 'community')
    ).optional(),
    maxTokens: Joi.number().min(50).max(1000).optional(),
    temperature: Joi.number().min(0).max(1).optional(),
  }),

  cafeId: Joi.object({
    cafeId: Joi.string().required(),
  }),

  proactiveMessage: Joi.object({
    cafeId: Joi.string().required(),
    trigger: Joi.string().valid('event', 'milestone', 'scheduled', 'manual').required(),
    metadata: Joi.object().optional(),
  }),
};
