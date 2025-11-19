import { db } from '../db/connection';
import { Badge } from '../types';
import { config } from '../config';

export class BadgeModel {
  static async create(userId: string): Promise<Badge> {
    const earnedAt = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.badges.durationDays);

    const periodStartDate = new Date();
    periodStartDate.setDate(periodStartDate.getDate() - config.badges.tipWindowDays);

    const query = `
      INSERT INTO badges (user_id, earned_at, expires_at, tips_in_period, period_start_date)
      VALUES ($1, $2, $3, 0, $4)
      ON CONFLICT (user_id)
      DO UPDATE SET
        earned_at = $2,
        expires_at = $3,
        tips_in_period = 0,
        period_start_date = $4
      RETURNING *
    `;

    const result = await db.query(query, [userId, earnedAt, expiresAt, periodStartDate]);
    return this.mapRow(result.rows[0]);
  }

  static async findByUserId(userId: string): Promise<Badge | null> {
    const query = `
      SELECT * FROM badges
      WHERE user_id = $1 AND expires_at > NOW()
    `;

    const result = await db.query(query, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  static async checkEligibility(userId: string): Promise<{
    eligible: boolean;
    tipsInWindow: number;
    tipsNeeded: number;
  }> {
    const windowStartDate = new Date();
    windowStartDate.setDate(windowStartDate.getDate() - config.badges.tipWindowDays);

    const query = `
      SELECT COUNT(*) as tip_count
      FROM tips
      WHERE user_id = $1 AND created_at >= $2
    `;

    const result = await db.query(query, [userId, windowStartDate]);
    const tipsInWindow = parseInt(result.rows[0].tip_count, 10);
    const tipsNeeded = Math.max(0, config.badges.tipThreshold - tipsInWindow);

    return {
      eligible: tipsInWindow >= config.badges.tipThreshold,
      tipsInWindow,
      tipsNeeded,
    };
  }

  static async updateTipsInPeriod(userId: string, count: number): Promise<void> {
    const query = `
      UPDATE badges
      SET tips_in_period = $1
      WHERE user_id = $2
    `;

    await db.query(query, [count, userId]);
  }

  static async deleteExpired(): Promise<number> {
    const query = 'SELECT cleanup_expired_badges()';
    const result = await db.query(query);
    return result.rows[0].cleanup_expired_badges;
  }

  private static mapRow(row: any): Badge {
    return {
      userId: row.user_id,
      earnedAt: row.earned_at,
      expiresAt: row.expires_at,
      tipsInPeriod: row.tips_in_period,
      periodStartDate: row.period_start_date,
    };
  }
}
