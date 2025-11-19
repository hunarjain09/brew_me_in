import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    env: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
    port: parseInt(process.env.PORT || '3000', 10),
    apiVersion: process.env.API_VERSION || 'v1',
  },

  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'brew_me_in',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'change-this-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'change-this-refresh-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  jwtSecret: process.env.JWT_SECRET || 'change-this-secret',

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    enabled: process.env.RATE_LIMIT_ENABLED === 'true',
    message: {
      free: {
        count: parseInt(process.env.RATE_LIMIT_MESSAGE_FREE_COUNT || '30', 10),
        window: parseInt(process.env.RATE_LIMIT_MESSAGE_FREE_WINDOW || '3600', 10),
        cooldown: parseInt(process.env.RATE_LIMIT_MESSAGE_FREE_COOLDOWN || '30', 10),
      },
      badge: {
        count: parseInt(process.env.RATE_LIMIT_MESSAGE_BADGE_COUNT || '60', 10),
        window: parseInt(process.env.RATE_LIMIT_MESSAGE_BADGE_WINDOW || '3600', 10),
        cooldown: parseInt(process.env.RATE_LIMIT_MESSAGE_BADGE_COOLDOWN || '15', 10),
      },
    },
    agent: {
      personalCount: parseInt(process.env.RATE_LIMIT_AGENT_PERSONAL_COUNT || '2', 10),
      globalCooldown: parseInt(process.env.RATE_LIMIT_AGENT_GLOBAL_COOLDOWN || '120', 10),
    },
    poke: {
      count: parseInt(process.env.RATE_LIMIT_POKE_COUNT || '5', 10),
      window: parseInt(process.env.RATE_LIMIT_POKE_WINDOW || '86400', 10),
    },
  },

  spam: {
    enabled: process.env.SPAM_DETECTION_ENABLED === 'true',
    duplicateWindow: parseInt(process.env.SPAM_DUPLICATE_WINDOW || '300', 10),
    maxCapsPercentage: parseInt(process.env.SPAM_MAX_CAPS_PERCENTAGE || '50', 10),
    maxUrls: parseInt(process.env.SPAM_MAX_URLS || '2', 10),
    muteDuration: parseInt(process.env.SPAM_MUTE_DURATION || '86400', 10),
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
    apiVersion: process.env.ANTHROPIC_API_VERSION || '2023-06-01',
  },

  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,
  AGENT_CACHE_TTL: parseInt(process.env.AGENT_CACHE_TTL || '3600', 10),
  COMMON_QUERIES_CACHE_TTL: parseInt(process.env.COMMON_QUERIES_CACHE_TTL || '7200', 10),
  GLOBAL_RATE_LIMIT_MS: parseInt(process.env.GLOBAL_RATE_LIMIT_MS || '2000', 10),
  USER_RATE_LIMIT_DAILY: parseInt(process.env.USER_RATE_LIMIT_DAILY || '100', 10),

  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3001', 'http://localhost:5173'],
  },

  badges: {
    tipThreshold: parseInt(process.env.BADGE_TIP_THRESHOLD || '5', 10),
    tipWindowDays: parseInt(process.env.BADGE_TIP_WINDOW_DAYS || '7', 10),
    durationDays: parseInt(process.env.BADGE_DURATION_DAYS || '30', 10),
  },

  user: {
    sessionDurationHours: parseInt(process.env.USER_SESSION_DURATION_HOURS || '24', 10),
  },

  location: {
    geofenceDefaultRadius: parseInt(process.env.GEOFENCE_DEFAULT_RADIUS || '50', 10),
    updateInterval: parseInt(process.env.LOCATION_UPDATE_INTERVAL || '300000', 10),
    presenceCheckInterval: parseInt(process.env.PRESENCE_CHECK_INTERVAL || '300000', 10),
  },

  poke: {
    expirationHours: parseInt(process.env.POKE_EXPIRATION_HOURS || '24', 10),
    rateLimitWindowMs: parseInt(process.env.POKE_RATE_LIMIT_WINDOW_MS || '3600000', 10),
    rateLimitMax: parseInt(process.env.POKE_RATE_LIMIT_MAX || '10', 10),
  },

  agent: {
    cacheTTL: parseInt(process.env.AGENT_CACHE_TTL || '3600', 10),
    commonQueriesCacheTTL: parseInt(process.env.COMMON_QUERIES_CACHE_TTL || '7200', 10),
    globalRateLimitMs: parseInt(process.env.GLOBAL_RATE_LIMIT_MS || '2000', 10),
    userRateLimitDaily: parseInt(process.env.USER_RATE_LIMIT_DAILY || '100', 10),
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },
};
