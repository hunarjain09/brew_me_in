import { query } from '../../config/database';
import logger from '../../utils/logger';
import { JobResult } from '../../types';
import redisClient from '../../config/redis';

/**
 * Clean up expired pokes
 * Runs every 5 minutes
 */
export async function expirePokes(): Promise<JobResult> {
  const jobName = 'expirePokes';
  logger.info(`Starting ${jobName} job`);

  try {
    const now = new Date();

    // Delete pokes that have expired (typically after 24 hours)
    const result = await query(
      `DELETE FROM pokes
       WHERE expires_at <= $1
       RETURNING id, from_user_id, to_user_id`,
      [now]
    );

    const expiredCount = result.rowCount || 0;

    if (expiredCount > 0) {
      logger.info(`Deleted ${expiredCount} expired pokes`);

      // Clear poke cache for affected users
      const userIds = new Set<string>();
      result.rows.forEach((poke: any) => {
        userIds.add(poke.from_user_id);
        userIds.add(poke.to_user_id);
      });

      for (const userId of userIds) {
        try {
          await redisClient.del(`user:${userId}:pokes:sent`);
          await redisClient.del(`user:${userId}:pokes:received`);
          logger.debug(`Cleared poke cache for user: ${userId}`);
        } catch (redisError) {
          logger.error(`Failed to clear poke cache for user ${userId}:`, redisError);
        }
      }

      // Update poke count statistics
      for (const poke of result.rows) {
        try {
          await redisClient.decr(`user:${poke.from_user_id}:poke_count`);
        } catch (redisError) {
          logger.error(`Failed to update poke count:`, redisError);
        }
      }
    } else {
      logger.debug('No pokes to expire');
    }

    return {
      success: true,
      message: `Successfully deleted ${expiredCount} expired pokes`,
      affectedRecords: expiredCount,
    };
  } catch (error) {
    logger.error(`Error in ${jobName} job:`, error);
    return {
      success: false,
      message: `Failed to expire pokes`,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
