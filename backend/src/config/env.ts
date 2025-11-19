import dotenv from 'dotenv';

dotenv.config();

/**
 * Environment Configuration
 * Validates and exports environment variables with type safety
 */

interface EnvConfig {
  // Server
  PORT: number;
  NODE_ENV: string;
  FRONTEND_URL: string;

  // Redis
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD?: string;

  // Claude API
  ANTHROPIC_API_KEY: string;
  ANTHROPIC_API_VERSION: string;

  // Rate Limiting
  GLOBAL_RATE_LIMIT_MS: number;
  USER_RATE_LIMIT_DAILY: number;

  // Cache
  AGENT_CACHE_TTL: number;
  COMMON_QUERIES_CACHE_TTL: number;
}

function validateEnv(): EnvConfig {
  const required = [
    'ANTHROPIC_API_KEY',
    'REDIS_HOST'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    PORT: parseInt(process.env.PORT || '3000', 10),
    NODE_ENV: process.env.NODE_ENV || 'development',
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3001',

    REDIS_HOST: process.env.REDIS_HOST!,
    REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,

    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY!,
    ANTHROPIC_API_VERSION: process.env.ANTHROPIC_API_VERSION || '2023-06-01',

    GLOBAL_RATE_LIMIT_MS: parseInt(process.env.GLOBAL_RATE_LIMIT_MS || '2000', 10),
    USER_RATE_LIMIT_DAILY: parseInt(process.env.USER_RATE_LIMIT_DAILY || '100', 10),

    AGENT_CACHE_TTL: parseInt(process.env.AGENT_CACHE_TTL || '3600', 10),
    COMMON_QUERIES_CACHE_TTL: parseInt(process.env.COMMON_QUERIES_CACHE_TTL || '7200', 10)
  };
}

export const config = validateEnv();
