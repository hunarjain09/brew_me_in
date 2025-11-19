import { redisClient, RedisKeys } from '../config/redis';
import { config } from '../config/env';
import { logger } from '../config/logger';
import {
  SpamCheckResult,
  SpamViolation,
  SpamAction,
  MessageMetadata,
  MuteRecord,
} from '../types/rateLimit';

/**
 * Spam Detection Service
 * Implements heuristic-based spam detection and auto-moderation
 * Component 3: Rate Limiting & Spam Prevention
 */
export class SpamDetectionService {
  // Common profanity words (basic list - should be expanded)
  private profanityList = [
    'spam',
    'scam',
    'fake',
    // Add more as needed - keeping minimal for demo
  ];

  /**
   * Check if a message is spam
   */
  async checkSpam(metadata: MessageMetadata): Promise<SpamCheckResult> {
    if (!config.spam.enabled) {
      return {
        isSpam: false,
        violations: [],
        action: 'allow',
      };
    }

    // Check if user is already muted
    const isMuted = await this.isUserMuted(metadata.userId);
    if (isMuted) {
      return {
        isSpam: true,
        violations: [
          {
            type: 'profanity',
            severity: 'high',
            details: 'User is currently muted',
          },
        ],
        action: 'mute',
        message: 'You are currently muted',
      };
    }

    const violations: SpamViolation[] = [];

    // Run all spam checks
    await Promise.all([
      this.checkDuplicateMessage(metadata, violations),
      this.checkExcessiveCaps(metadata, violations),
      this.checkUrlSpam(metadata, violations),
      this.checkRepeatedCharacters(metadata, violations),
      this.checkProfanity(metadata, violations),
    ]);

    // Determine action based on violations
    const action = this.determineAction(violations);

    // Execute auto-moderation if needed
    if (action === 'mute') {
      await this.muteUser(metadata.userId, violations);
    }

    return {
      isSpam: violations.length > 0,
      violations,
      action,
      message: this.getActionMessage(action, violations),
    };
  }

  /**
   * Check for duplicate messages within time window
   */
  private async checkDuplicateMessage(
    metadata: MessageMetadata,
    violations: SpamViolation[]
  ): Promise<void> {
    const client = redisClient.getClient();
    const key = RedisKeys.spamDuplicate(metadata.userId);

    // Get last message content
    const lastMessage = await client.get(key);

    if (lastMessage === metadata.content) {
      violations.push({
        type: 'duplicate_message',
        severity: 'medium',
        details: 'Same message sent within 5 minutes',
      });
    }

    // Store current message
    await client.set(key, metadata.content, {
      EX: config.spam.duplicateWindow,
    });
  }

  /**
   * Check for excessive caps (>50% uppercase)
   */
  private async checkExcessiveCaps(
    metadata: MessageMetadata,
    violations: SpamViolation[]
  ): Promise<void> {
    const content = metadata.content;
    const letters = content.replace(/[^a-zA-Z]/g, '');

    if (letters.length < 3) return; // Too short to judge

    const upperCount = content.replace(/[^A-Z]/g, '').length;
    const capsPercentage = (upperCount / letters.length) * 100;

    if (capsPercentage > config.spam.maxCapsPercentage) {
      violations.push({
        type: 'excessive_caps',
        severity: 'low',
        details: `${Math.round(capsPercentage)}% uppercase (limit: ${config.spam.maxCapsPercentage}%)`,
      });
    }
  }

  /**
   * Check for URL spam (>2 URLs in message)
   */
  private async checkUrlSpam(
    metadata: MessageMetadata,
    violations: SpamViolation[]
  ): Promise<void> {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = metadata.content.match(urlRegex);

    if (urls && urls.length > config.spam.maxUrls) {
      violations.push({
        type: 'url_spam',
        severity: 'high',
        details: `${urls.length} URLs found (limit: ${config.spam.maxUrls})`,
      });
    }
  }

  /**
   * Check for repeated character patterns (e.g., "aaaaaaa")
   */
  private async checkRepeatedCharacters(
    metadata: MessageMetadata,
    violations: SpamViolation[]
  ): Promise<void> {
    // Check for 7+ repeated characters
    const repeatedPattern = /(.)\1{6,}/g;
    const matches = metadata.content.match(repeatedPattern);

    if (matches && matches.length > 0) {
      violations.push({
        type: 'repeated_characters',
        severity: 'low',
        details: `Repeated character patterns found: ${matches.join(', ')}`,
      });
    }
  }

  /**
   * Check for profanity
   */
  private async checkProfanity(
    metadata: MessageMetadata,
    violations: SpamViolation[]
  ): Promise<void> {
    const contentLower = metadata.content.toLowerCase();

    for (const word of this.profanityList) {
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      if (regex.test(contentLower)) {
        violations.push({
          type: 'profanity',
          severity: 'medium',
          details: 'Profanity detected',
        });
        break; // Only report once
      }
    }
  }

  /**
   * Determine action based on violation severity
   */
  private determineAction(violations: SpamViolation[]): SpamAction {
    if (violations.length === 0) return 'allow';

    const hasHigh = violations.some((v) => v.severity === 'high');
    const mediumCount = violations.filter((v) => v.severity === 'medium').length;
    const totalCount = violations.length;

    // High severity or multiple medium violations = mute
    if (hasHigh || mediumCount >= 2 || totalCount >= 3) {
      return 'mute';
    }

    // Medium severity or multiple low violations = block
    if (mediumCount >= 1 || totalCount >= 2) {
      return 'block';
    }

    // Single low severity = warn
    return 'warn';
  }

  /**
   * Get user-friendly action message
   */
  private getActionMessage(action: SpamAction, violations: SpamViolation[]): string {
    switch (action) {
      case 'allow':
        return '';
      case 'warn':
        return 'Please avoid spam-like behavior';
      case 'block':
        return 'Message blocked due to spam detection';
      case 'mute':
        const hours = Math.ceil(config.spam.muteDuration / 3600);
        return `You have been muted for ${hours} hours due to spam violations`;
      default:
        return '';
    }
  }

  /**
   * Mute a user for 24 hours
   */
  async muteUser(userId: string, violations: SpamViolation[]): Promise<void> {
    const client = redisClient.getClient();
    const key = RedisKeys.spamMute(userId);

    const muteRecord: MuteRecord = {
      userId,
      mutedUntil: new Date(Date.now() + config.spam.muteDuration * 1000),
      reason: 'Spam violations',
      violations,
    };

    await client.set(key, JSON.stringify(muteRecord), {
      EX: config.spam.muteDuration,
    });

    logger.warn('User muted for spam', {
      userId,
      violations: violations.length,
      duration: config.spam.muteDuration,
    });
  }

  /**
   * Check if user is currently muted
   */
  async isUserMuted(userId: string): Promise<boolean> {
    const client = redisClient.getClient();
    const key = RedisKeys.spamMute(userId);
    const muteRecord = await client.get(key);
    return muteRecord !== null;
  }

  /**
   * Get mute information for a user
   */
  async getMuteInfo(userId: string): Promise<MuteRecord | null> {
    const client = redisClient.getClient();
    const key = RedisKeys.spamMute(userId);
    const muteRecord = await client.get(key);

    if (!muteRecord) return null;

    try {
      return JSON.parse(muteRecord) as MuteRecord;
    } catch (error) {
      logger.error('Failed to parse mute record', { userId, error });
      return null;
    }
  }

  /**
   * Unmute a user (admin function)
   */
  async unmuteUser(userId: string): Promise<void> {
    const client = redisClient.getClient();
    const key = RedisKeys.spamMute(userId);
    await client.del(key);
    logger.info('User unmuted', { userId });
  }

  /**
   * Add word to profanity filter
   */
  addProfanityWord(word: string): void {
    if (!this.profanityList.includes(word.toLowerCase())) {
      this.profanityList.push(word.toLowerCase());
    }
  }

  /**
   * Remove word from profanity filter
   */
  removeProfanityWord(word: string): void {
    this.profanityList = this.profanityList.filter(
      (w) => w !== word.toLowerCase()
    );
  }

  /**
   * Get profanity filter list
   */
  getProfanityList(): string[] {
    return [...this.profanityList];
  }
}

// Export singleton instance
export const spamDetectionService = new SpamDetectionService();
