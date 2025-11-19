import { query } from '../../config/database';
import logger from '../../utils/logger';
import { JobResult } from '../../types';
import redisClient from '../../config/redis';

/**
 * Aggregate analytics data for the previous hour
 * Runs hourly
 */
export async function aggregateAnalytics(): Promise<JobResult> {
  const jobName = 'aggregateAnalytics';
  logger.info(`Starting ${jobName} job`);

  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Get all active cafes
    const cafesResult = await query(
      `SELECT id, name FROM cafes WHERE is_active = true`
    );

    let totalRecords = 0;

    for (const cafe of cafesResult.rows) {
      try {
        const analytics = await aggregateCafeAnalytics(cafe.id, oneHourAgo, now);

        // Insert analytics record
        await query(
          `INSERT INTO analytics
           (cafe_id, date, hour, total_users, active_users, total_pokes,
            total_messages, average_session_duration, peak_concurrent_users)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (cafe_id, date, hour)
           DO UPDATE SET
             total_users = EXCLUDED.total_users,
             active_users = EXCLUDED.active_users,
             total_pokes = EXCLUDED.total_pokes,
             total_messages = EXCLUDED.total_messages,
             average_session_duration = EXCLUDED.average_session_duration,
             peak_concurrent_users = EXCLUDED.peak_concurrent_users,
             updated_at = NOW()`,
          [
            cafe.id,
            oneHourAgo.toISOString().split('T')[0], // Date
            oneHourAgo.getHours(), // Hour
            analytics.totalUsers,
            analytics.activeUsers,
            analytics.totalPokes,
            analytics.totalMessages,
            analytics.averageSessionDuration,
            analytics.peakConcurrentUsers,
          ]
        );

        totalRecords++;

        // Cache the analytics in Redis for quick access
        const cacheKey = `analytics:${cafe.id}:${oneHourAgo.toISOString()}`;
        await redisClient.setEx(cacheKey, 86400, JSON.stringify(analytics)); // Cache for 24 hours

        logger.debug(`Aggregated analytics for cafe: ${cafe.name}`);
      } catch (error) {
        logger.error(`Failed to aggregate analytics for cafe ${cafe.id}:`, error);
      }
    }

    logger.info(`Aggregated analytics for ${totalRecords} cafes`);

    return {
      success: true,
      message: `Successfully aggregated analytics for ${totalRecords} cafes`,
      affectedRecords: totalRecords,
    };
  } catch (error) {
    logger.error(`Error in ${jobName} job:`, error);
    return {
      success: false,
      message: `Failed to aggregate analytics`,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function aggregateCafeAnalytics(
  cafeId: string,
  startTime: Date,
  endTime: Date
) {
  // Get total and active users
  const usersResult = await query(
    `SELECT
       COUNT(DISTINCT u.id) as total_users,
       COUNT(DISTINCT CASE WHEN u.is_active = true THEN u.id END) as active_users
     FROM users u
     WHERE u.cafe_id = $1
     AND u.created_at <= $2`,
    [cafeId, endTime]
  );

  // Get pokes count
  const pokesResult = await query(
    `SELECT COUNT(*) as total_pokes
     FROM pokes p
     INNER JOIN users u ON p.from_user_id = u.id
     WHERE u.cafe_id = $1
     AND p.created_at >= $2
     AND p.created_at < $3`,
    [cafeId, startTime, endTime]
  );

  // Get messages count
  const messagesResult = await query(
    `SELECT COUNT(*) as total_messages
     FROM messages m
     INNER JOIN users u ON m.user_id = u.id
     WHERE u.cafe_id = $1
     AND m.created_at >= $2
     AND m.created_at < $3`,
    [cafeId, startTime, endTime]
  );

  // Get average session duration
  const sessionResult = await query(
    `SELECT AVG(EXTRACT(EPOCH FROM (ended_at - created_at))) as avg_duration
     FROM user_sessions us
     INNER JOIN users u ON us.user_id = u.id
     WHERE u.cafe_id = $1
     AND us.created_at >= $2
     AND us.created_at < $3
     AND us.ended_at IS NOT NULL`,
    [cafeId, startTime, endTime]
  );

  // Get peak concurrent users from Redis or calculate
  let peakConcurrentUsers = 0;
  try {
    const peakKey = `analytics:${cafeId}:peak:${startTime.toISOString()}`;
    const cachedPeak = await redisClient.get(peakKey);
    if (cachedPeak) {
      peakConcurrentUsers = parseInt(cachedPeak);
    } else {
      // Fallback: get current active user count
      const activeCount = await redisClient.sCard(`cafe:${cafeId}:active_users`);
      peakConcurrentUsers = activeCount || 0;
    }
  } catch (error) {
    logger.error('Error getting peak concurrent users:', error);
  }

  return {
    totalUsers: parseInt(usersResult.rows[0]?.total_users || '0'),
    activeUsers: parseInt(usersResult.rows[0]?.active_users || '0'),
    totalPokes: parseInt(pokesResult.rows[0]?.total_pokes || '0'),
    totalMessages: parseInt(messagesResult.rows[0]?.total_messages || '0'),
    averageSessionDuration: parseFloat(sessionResult.rows[0]?.avg_duration || '0'),
    peakConcurrentUsers,
  };
}
