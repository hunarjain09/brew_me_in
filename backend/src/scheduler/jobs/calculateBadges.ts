import { db } from '../../db/connection';
import logger from '../../utils/logger';
import { redisClient } from '../../db/redis';
import { JobResult } from './expireUsers';

/**
 * Calculate and award new badges based on user behavior
 * Runs daily at midnight
 */
export async function calculateNewBadges(): Promise<JobResult> {
  const jobName = 'calculateNewBadges';
  logger.info(`Starting ${jobName} job`);

  let totalBadgesAwarded = 0;

  try {
    // Award Early Bird badge (users who checked in before 8 AM)
    const earlyBirdResult = await awardEarlyBirdBadges();
    totalBadgesAwarded += earlyBirdResult.count;

    // Award Night Owl badge (users who checked in after 10 PM)
    const nightOwlResult = await awardNightOwlBadges();
    totalBadgesAwarded += nightOwlResult.count;

    // Award Social Butterfly badge (users who sent 10+ pokes in the last week)
    const socialButterflyResult = await awardSocialButterflyBadges();
    totalBadgesAwarded += socialButterflyResult.count;

    // Award Frequent Visitor badge (users with 5+ tips in the last month)
    const frequentVisitorResult = await awardFrequentVisitorBadges();
    totalBadgesAwarded += frequentVisitorResult.count;

    logger.info(`Total new badges awarded: ${totalBadgesAwarded}`);

    return {
      success: true,
      message: `Successfully calculated and awarded ${totalBadgesAwarded} new badges`,
      affectedRecords: totalBadgesAwarded,
    };
  } catch (error) {
    logger.error(`Error in ${jobName} job:`, error);
    return {
      success: false,
      message: `Failed to calculate new badges`,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function awardEarlyBirdBadges(): Promise<{ count: number }> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find users who logged in before 8 AM yesterday
  const result = await db.query(
    `INSERT INTO badges (user_id, badge_status, created_at, expires_at)
     SELECT DISTINCT u.id, 'early_bird', NOW(), NOW() + INTERVAL '7 days'
     FROM users u
     WHERE u.created_at >= $1
     AND u.created_at < $2
     AND EXTRACT(HOUR FROM u.created_at) < 8
     AND NOT EXISTS (
       SELECT 1 FROM badges b
       WHERE b.user_id = u.id
       AND b.badge_status = 'early_bird'
       AND b.created_at >= $1
       AND b.is_expired = false
     )
     RETURNING id, user_id`,
    [yesterday, today]
  );

  // Clear cache for users who received badges
  for (const badge of result.rows) {
    await redisClient.del(`user:${badge.user_id}:badges`);
  }

  logger.info(`Awarded ${result.rowCount || 0} Early Bird badges`);
  return { count: result.rowCount || 0 };
}

async function awardNightOwlBadges(): Promise<{ count: number }> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find users who logged in after 10 PM yesterday
  const result = await db.query(
    `INSERT INTO badges (user_id, badge_status, created_at, expires_at)
     SELECT DISTINCT u.id, 'night_owl', NOW(), NOW() + INTERVAL '7 days'
     FROM users u
     WHERE u.created_at >= $1
     AND u.created_at < $2
     AND EXTRACT(HOUR FROM u.created_at) >= 22
     AND NOT EXISTS (
       SELECT 1 FROM badges b
       WHERE b.user_id = u.id
       AND b.badge_status = 'night_owl'
       AND b.created_at >= $1
       AND b.is_expired = false
     )
     RETURNING id, user_id`,
    [yesterday, today]
  );

  // Clear cache for users who received badges
  for (const badge of result.rows) {
    await redisClient.del(`user:${badge.user_id}:badges`);
  }

  logger.info(`Awarded ${result.rowCount || 0} Night Owl badges`);
  return { count: result.rowCount || 0 };
}

async function awardSocialButterflyBadges(): Promise<{ count: number }> {
  // Social butterfly badge will be awarded when the poke system is implemented
  logger.info('Social Butterfly badge awarding skipped (poke system not yet implemented)');
  return { count: 0 };
}

async function awardFrequentVisitorBadges(): Promise<{ count: number }> {
  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

  // Find users who have 5+ tips in the last month (already have regular badge via the badge system)
  // This function will add a special "frequent_visitor" status to their existing badge
  const result = await db.query(
    `INSERT INTO badges (user_id, badge_status, created_at, expires_at)
     SELECT t.user_id, 'frequent_visitor', NOW(), NOW() + INTERVAL '60 days'
     FROM tips t
     WHERE t.created_at >= $1
     GROUP BY t.user_id
     HAVING COUNT(*) >= 5
     AND NOT EXISTS (
       SELECT 1 FROM badges b
       WHERE b.user_id = t.user_id
       AND b.badge_status = 'frequent_visitor'
       AND b.created_at >= $1
       AND b.is_expired = false
     )
     RETURNING id, user_id`,
    [oneMonthAgo]
  );

  // Clear cache for users who received badges
  for (const badge of result.rows) {
    await redisClient.del(`user:${badge.user_id}:badges`);
  }

  logger.info(`Awarded ${result.rowCount || 0} Frequent Visitor badges`);
  return { count: result.rowCount || 0 };
}
