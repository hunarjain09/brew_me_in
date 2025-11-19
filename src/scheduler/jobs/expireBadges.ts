import { query } from '../../config/database';
import logger from '../../utils/logger';
import { JobResult } from '../../types';
import redisClient from '../../config/redis';

/**
 * Expire badges that have reached their expiration date
 * Runs daily at midnight
 */
export async function expireBadges(): Promise<JobResult> {
  const jobName = 'expireBadges';
  logger.info(`Starting ${jobName} job`);

  try {
    const now = new Date();

    // Expire badges that have an expiration date and it has passed
    const result = await query(
      `UPDATE badges
       SET is_active = false,
           updated_at = $1
       WHERE expires_at IS NOT NULL
       AND expires_at <= $1
       AND is_active = true
       RETURNING id, user_id, type, name`,
      [now]
    );

    const expiredCount = result.rowCount || 0;

    if (expiredCount > 0) {
      logger.info(`Expired ${expiredCount} badges`);

      // Clear expired badges from Redis cache
      const userIds = [...new Set(result.rows.map((badge: any) => badge.user_id))];
      for (const userId of userIds) {
        try {
          await redisClient.del(`user:${userId}:badges`);
          logger.debug(`Cleared badge cache for user: ${userId}`);
        } catch (redisError) {
          logger.error(`Failed to clear badge cache for user ${userId}:`, redisError);
        }
      }

      // Log expired badges for analytics
      for (const badge of result.rows) {
        logger.info(`Expired badge: ${badge.name} (${badge.type}) for user ${badge.user_id}`);
      }
    } else {
      logger.info('No badges to expire');
    }

    return {
      success: true,
      message: `Successfully expired ${expiredCount} badges`,
      affectedRecords: expiredCount,
    };
  } catch (error) {
    logger.error(`Error in ${jobName} job:`, error);
    return {
      success: false,
      message: `Failed to expire badges`,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
