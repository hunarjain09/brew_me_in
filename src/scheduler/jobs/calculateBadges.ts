import { query } from '../../config/database';
import logger from '../../utils/logger';
import { JobResult, BadgeType } from '../../types';
import redisClient from '../../config/redis';

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

    // Award Frequent Visitor badge (users who visited 5+ times in the last month)
    const frequentVisitorResult = await awardFrequentVisitorBadges();
    totalBadgesAwarded += frequentVisitorResult.count;

    logger.info(`Total badges awarded: ${totalBadgesAwarded}`);

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

  // Find users who checked in before 8 AM yesterday
  const result = await query(
    `INSERT INTO badges (user_id, type, name, description, expires_at)
     SELECT DISTINCT u.id, $1, $2, $3, $4
     FROM users u
     INNER JOIN user_sessions us ON u.id = us.user_id
     WHERE us.created_at >= $5
     AND us.created_at < $6
     AND EXTRACT(HOUR FROM us.created_at) < 8
     AND NOT EXISTS (
       SELECT 1 FROM badges b
       WHERE b.user_id = u.id
       AND b.type = $1
       AND b.created_at >= $5
       AND b.is_active = true
     )
     RETURNING id, user_id`,
    [
      BadgeType.EARLY_BIRD,
      'Early Bird',
      'Checked in before 8 AM',
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days
      yesterday,
      today,
    ]
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

  // Find users who checked in after 10 PM yesterday
  const result = await query(
    `INSERT INTO badges (user_id, type, name, description, expires_at)
     SELECT DISTINCT u.id, $1, $2, $3, $4
     FROM users u
     INNER JOIN user_sessions us ON u.id = us.user_id
     WHERE us.created_at >= $5
     AND us.created_at < $6
     AND EXTRACT(HOUR FROM us.created_at) >= 22
     AND NOT EXISTS (
       SELECT 1 FROM badges b
       WHERE b.user_id = u.id
       AND b.type = $1
       AND b.created_at >= $5
       AND b.is_active = true
     )
     RETURNING id, user_id`,
    [
      BadgeType.NIGHT_OWL,
      'Night Owl',
      'Checked in after 10 PM',
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days
      yesterday,
      today,
    ]
  );

  // Clear cache for users who received badges
  for (const badge of result.rows) {
    await redisClient.del(`user:${badge.user_id}:badges`);
  }

  logger.info(`Awarded ${result.rowCount || 0} Night Owl badges`);
  return { count: result.rowCount || 0 };
}

async function awardSocialButterflyBadges(): Promise<{ count: number }> {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  // Find users who sent 10+ pokes in the last week
  const result = await query(
    `INSERT INTO badges (user_id, type, name, description, expires_at)
     SELECT p.from_user_id, $1, $2, $3, $4
     FROM pokes p
     WHERE p.created_at >= $5
     GROUP BY p.from_user_id
     HAVING COUNT(*) >= 10
     AND NOT EXISTS (
       SELECT 1 FROM badges b
       WHERE b.user_id = p.from_user_id
       AND b.type = $1
       AND b.created_at >= $5
       AND b.is_active = true
     )
     RETURNING id, user_id`,
    [
      BadgeType.SOCIAL_BUTTERFLY,
      'Social Butterfly',
      'Sent 10+ pokes in the last week',
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Expires in 30 days
      oneWeekAgo,
    ]
  );

  // Clear cache for users who received badges
  for (const badge of result.rows) {
    await redisClient.del(`user:${badge.user_id}:badges`);
  }

  logger.info(`Awarded ${result.rowCount || 0} Social Butterfly badges`);
  return { count: result.rowCount || 0 };
}

async function awardFrequentVisitorBadges(): Promise<{ count: number }> {
  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

  // Find users who visited 5+ times in the last month
  const result = await query(
    `INSERT INTO badges (user_id, type, name, description, expires_at)
     SELECT us.user_id, $1, $2, $3, $4
     FROM user_sessions us
     WHERE us.created_at >= $5
     GROUP BY us.user_id
     HAVING COUNT(DISTINCT DATE(us.created_at)) >= 5
     AND NOT EXISTS (
       SELECT 1 FROM badges b
       WHERE b.user_id = us.user_id
       AND b.type = $1
       AND b.created_at >= $5
       AND b.is_active = true
     )
     RETURNING id, user_id`,
    [
      BadgeType.FREQUENT_VISITOR,
      'Frequent Visitor',
      'Visited 5+ times in the last month',
      new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // Expires in 60 days
      oneMonthAgo,
    ]
  );

  // Clear cache for users who received badges
  for (const badge of result.rows) {
    await redisClient.del(`user:${badge.user_id}:badges`);
  }

  logger.info(`Awarded ${result.rowCount || 0} Frequent Visitor badges`);
  return { count: result.rowCount || 0 };
}
