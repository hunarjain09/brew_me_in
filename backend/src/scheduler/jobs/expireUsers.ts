import { db } from '../../db/connection';
import logger from '../../utils/logger';
import { redisClient } from '../../db/redis';

export interface JobResult {
  success: boolean;
  message: string;
  affectedRecords?: number;
  error?: string;
}

/**
 * Expire users whose session time has ended
 * Runs hourly
 */
export async function expireUsers(): Promise<JobResult> {
  const jobName = 'expireUsers';
  logger.info(`Starting ${jobName} job`);

  try {
    const now = new Date();

    // Find and expire users whose expiresAt timestamp has passed
    const result = await db.query(
      `UPDATE users
       SET updated_at = $1
       WHERE expires_at <= $1
       RETURNING id, username, cafe_id`,
      [now]
    );

    const expiredCount = result.rowCount || 0;

    if (expiredCount > 0) {
      logger.info(`Expired ${expiredCount} users`);

      // Clear expired users from Redis cache
      for (const user of result.rows) {
        try {
          await redisClient.del(`user:${user.id}`);
          await redisClient.del(`user:username:${user.username}`);

          // Remove user from active cafe users set
          await redisClient.sRem(`cafe:${user.cafe_id}:active_users`, user.id);

          logger.debug(`Cleared cache for expired user: ${user.username}`);
        } catch (redisError) {
          logger.error(`Failed to clear cache for user ${user.id}:`, redisError);
        }
      }

      // Update cafe statistics
      const cafeIds = [...new Set(result.rows.map((user: any) => user.cafe_id))];
      for (const cafeId of cafeIds) {
        try {
          const currentCount = await redisClient.get(`cafe:${cafeId}:active_user_count`);
          if (currentCount && parseInt(currentCount) > 0) {
            await redisClient.decr(`cafe:${cafeId}:active_user_count`);
          }
        } catch (redisError) {
          logger.error(`Failed to update cafe stats for ${cafeId}:`, redisError);
        }
      }
    } else {
      logger.info('No users to expire');
    }

    return {
      success: true,
      message: `Successfully expired ${expiredCount} users`,
      affectedRecords: expiredCount,
    };
  } catch (error) {
    logger.error(`Error in ${jobName} job:`, error);
    return {
      success: false,
      message: `Failed to expire users`,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
