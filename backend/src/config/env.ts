import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Environment variable schema
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  API_VERSION: z.string().default('v1'),

  // Database
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.string().transform(Number).default('5432'),
  DB_NAME: z.string().default('brew_me_in'),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default('postgres'),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).default('6379'),
  REDIS_PASSWORD: z.string().optional().default(''),
  REDIS_DB: z.string().transform(Number).default('0'),

  // JWT
  JWT_SECRET: z.string().min(1),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3001'),

  // Rate Limiting
  RATE_LIMIT_ENABLED: z.string().transform(v => v === 'true').default('true'),

  // Message Rate Limits (Free)
  RATE_LIMIT_MESSAGE_FREE_COUNT: z.string().transform(Number).default('30'),
  RATE_LIMIT_MESSAGE_FREE_WINDOW: z.string().transform(Number).default('3600'),
  RATE_LIMIT_MESSAGE_FREE_COOLDOWN: z.string().transform(Number).default('30'),

  // Message Rate Limits (Badge)
  RATE_LIMIT_MESSAGE_BADGE_COUNT: z.string().transform(Number).default('60'),
  RATE_LIMIT_MESSAGE_BADGE_WINDOW: z.string().transform(Number).default('3600'),
  RATE_LIMIT_MESSAGE_BADGE_COOLDOWN: z.string().transform(Number).default('15'),

  // Agent Rate Limits
  RATE_LIMIT_AGENT_PERSONAL_COUNT: z.string().transform(Number).default('2'),
  RATE_LIMIT_AGENT_GLOBAL_COOLDOWN: z.string().transform(Number).default('120'),

  // Poke Rate Limits
  RATE_LIMIT_POKE_COUNT: z.string().transform(Number).default('5'),
  RATE_LIMIT_POKE_WINDOW: z.string().transform(Number).default('86400'),

  // Spam Detection
  SPAM_DETECTION_ENABLED: z.string().transform(v => v === 'true').default('true'),
  SPAM_DUPLICATE_WINDOW: z.string().transform(Number).default('300'),
  SPAM_MAX_CAPS_PERCENTAGE: z.string().transform(Number).default('50'),
  SPAM_MAX_URLS: z.string().transform(Number).default('2'),
  SPAM_MUTE_DURATION: z.string().transform(Number).default('86400'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'simple']).default('json'),

  // Anthropic
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-3-sonnet-20240229'),
});

// Parse and validate environment variables
const env = envSchema.parse(process.env);

// Export validated config
export const config = {
  server: {
    env: env.NODE_ENV,
    port: env.PORT,
    apiVersion: env.API_VERSION,
  },
  database: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    name: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
  },
  redis: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
    db: env.REDIS_DB,
  },
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  },
  cors: {
    origin: env.CORS_ORIGIN,
  },
  rateLimit: {
    enabled: env.RATE_LIMIT_ENABLED,
    message: {
      free: {
        count: env.RATE_LIMIT_MESSAGE_FREE_COUNT,
        window: env.RATE_LIMIT_MESSAGE_FREE_WINDOW,
        cooldown: env.RATE_LIMIT_MESSAGE_FREE_COOLDOWN,
      },
      badgeHolder: {
        count: env.RATE_LIMIT_MESSAGE_BADGE_COUNT,
        window: env.RATE_LIMIT_MESSAGE_BADGE_WINDOW,
        cooldown: env.RATE_LIMIT_MESSAGE_BADGE_COOLDOWN,
      },
    },
    agent: {
      personal: {
        count: env.RATE_LIMIT_AGENT_PERSONAL_COUNT,
      },
      global: {
        cooldown: env.RATE_LIMIT_AGENT_GLOBAL_COOLDOWN,
      },
    },
    poke: {
      count: env.RATE_LIMIT_POKE_COUNT,
      window: env.RATE_LIMIT_POKE_WINDOW,
    },
  },
  spam: {
    enabled: env.SPAM_DETECTION_ENABLED,
    duplicateWindow: env.SPAM_DUPLICATE_WINDOW,
    maxCapsPercentage: env.SPAM_MAX_CAPS_PERCENTAGE,
    maxUrls: env.SPAM_MAX_URLS,
    muteDuration: env.SPAM_MUTE_DURATION,
  },
  logging: {
    level: env.LOG_LEVEL,
    format: env.LOG_FORMAT,
  },
  anthropic: {
    apiKey: env.ANTHROPIC_API_KEY,
    model: env.ANTHROPIC_MODEL,
  },
} as const;

export type Config = typeof config;
