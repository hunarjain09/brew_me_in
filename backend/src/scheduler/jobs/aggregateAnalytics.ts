import { db } from '../../db/connection';
import logger from '../../utils/logger';
import { redisClient } from '../../db/redis';
import { JobResult } from './expireUsers';

/**
 * Aggregate analytics data for the previous hour
 * Runs hourly
 */
export async function aggregateAnalytics(): Promise<JobResult> {
  const jobName = 'aggregateAnalytics';
  logger.info(`Starting ${jobName} job`);

  try {
    // Check if cafe_analytics table exists
    const tableCheck = await db.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'cafe_analytics'
      )`
    );

    if (!tableCheck.rows[0].exists) {
      // Create the analytics table if it doesn't exist
      await db.query(`
        CREATE TABLE IF NOT EXISTS cafe_analytics (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          cafe_id UUID REFERENCES cafes(id),
          date DATE NOT NULL,
          hour INTEGER NOT NULL CHECK (hour >= 0 AND hour < 24),
          total_users INTEGER DEFAULT 0,
          active_users INTEGER DEFAULT 0,
          total_tips INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(cafe_id, date, hour)
        );

        CREATE INDEX IF NOT EXISTS idx_cafe_analytics_cafe_date ON cafe_analytics(cafe_id, date);
      `);
      logger.info('Created cafe_analytics table');
    }

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Get all active cafes
    const cafesResult = await db.query(
      `SELECT id, name FROM cafes`
    );

    let totalRecords = 0;

    for (const cafe of cafesResult.rows) {
      try {
        const analytics = await aggregateCafeAnalytics(cafe.id, oneHourAgo, now);

        // Insert analytics record
        await db.query(
          `INSERT INTO cafe_analytics
           (cafe_id, date, hour, total_users, active_users, total_tips)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (cafe_id, date, hour)
           DO UPDATE SET
             total_users = EXCLUDED.total_users,
             active_users = EXCLUDED.active_users,
             total_tips = EXCLUDED.total_tips,
             updated_at = NOW()`,
          [
            cafe.id,
            oneHourAgo.toISOString().split('T')[0], // Date
            oneHourAgo.getHours(), // Hour
            analytics.totalUsers,
            analytics.activeUsers,
            analytics.totalTips,
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
  const usersResult = await db.query(
    `SELECT
       COUNT(DISTINCT u.id) as total_users,
       COUNT(DISTINCT CASE WHEN u.expires_at > NOW() THEN u.id END) as active_users
     FROM users u
     WHERE u.cafe_id = $1
     AND u.created_at <= $2`,
    [cafeId, endTime]
  );

  // Get tips count
  const tipsResult = await db.query(
    `SELECT COUNT(*) as total_tips
     FROM tips t
     INNER JOIN users u ON t.user_id = u.id
     WHERE u.cafe_id = $1
     AND t.created_at >= $2
     AND t.created_at < $3`,
    [cafeId, startTime, endTime]
  );

  return {
    totalUsers: parseInt(usersResult.rows[0]?.total_users || '0'),
    activeUsers: parseInt(usersResult.rows[0]?.active_users || '0'),
    totalTips: parseInt(tipsResult.rows[0]?.total_tips || '0'),
  };
}
