/**
 * Rate Limiting Types and Interfaces
 * Component 3: Rate Limiting & Spam Prevention
 */

export type ResourceType = 'message' | 'agent' | 'poke';

export type UserTier = 'free' | 'badgeHolder';

/**
 * Rate limit record stored in Redis
 */
export interface RateLimit {
  userId: string;
  resource: ResourceType;
  count: number;
  windowStart: Date;
  nextAvailable: Date;
}

/**
 * Rate limit configuration per resource type
 */
export interface RateLimitConfig {
  message: {
    free: {
      count: number;
      window: number; // seconds
      cooldown: number; // seconds
    };
    badgeHolder: {
      count: number;
      window: number;
      cooldown: number;
    };
  };
  agent: {
    personal: {
      count: number;
      window: 'session';
    };
    global: {
      cooldown: number; // 2 minutes between any agent query
    };
  };
  poke: {
    count: number;
    window: number; // 24 hours
  };
}

/**
 * Rate limit check response
 */
export interface RateLimitCheckResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // seconds until next allowed request
  reason?: string;
}

/**
 * Rate limit status for all resources
 */
export interface RateLimitStatus {
  message: {
    allowed: boolean;
    remaining: number;
    resetAt: Date;
    cooldown: number;
  };
  agent: {
    personal: {
      allowed: boolean;
      remaining: number;
      resetAt: Date;
    };
    global: {
      allowed: boolean;
      nextAvailable: Date;
    };
  };
  poke: {
    allowed: boolean;
    remaining: number;
    resetAt: Date;
  };
}

/**
 * Spam detection result
 */
export interface SpamCheckResult {
  isSpam: boolean;
  violations: SpamViolation[];
  action: SpamAction;
  message?: string;
}

/**
 * Types of spam violations
 */
export type SpamViolationType =
  | 'duplicate_message'
  | 'excessive_caps'
  | 'url_spam'
  | 'repeated_characters'
  | 'profanity';

/**
 * Spam violation details
 */
export interface SpamViolation {
  type: SpamViolationType;
  severity: 'low' | 'medium' | 'high';
  details: string;
}

/**
 * Auto-moderation actions
 */
export type SpamAction = 'allow' | 'warn' | 'block' | 'mute';

/**
 * Spam check configuration
 */
export interface SpamCheckConfig {
  duplicateWindow: number; // seconds
  maxCapsPercentage: number; // 0-100
  maxUrls: number;
  repeatedCharThreshold: number;
  profanityEnabled: boolean;
}

/**
 * Mute record stored in Redis
 */
export interface MuteRecord {
  userId: string;
  mutedUntil: Date;
  reason: string;
  violations: SpamViolation[];
}

/**
 * Rate limit request body for API
 */
export interface RateLimitCheckRequest {
  resource: ResourceType;
  userId: string;
  userTier?: UserTier;
}

/**
 * Message metadata for spam detection
 */
export interface MessageMetadata {
  content: string;
  userId: string;
  timestamp: Date;
  cafeId?: string;
}
