import { db } from '../db/connection';
import { Tip } from '../types';

export class TipModel {
  static async create(userId: string, cafeId: string, amount: number): Promise<Tip> {
    const query = `
      INSERT INTO tips (user_id, cafe_id, amount)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await db.query(query, [userId, cafeId, amount]);
    return this.mapRow(result.rows[0]);
  }

  static async findByUserId(userId: string, limit: number = 50): Promise<Tip[]> {
    const query = `
      SELECT * FROM tips
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await db.query(query, [userId, limit]);
    return result.rows.map(this.mapRow);
  }

  static async countInWindow(userId: string, windowDays: number): Promise<number> {
    const windowStartDate = new Date();
    windowStartDate.setDate(windowStartDate.getDate() - windowDays);

    const query = `
      SELECT COUNT(*) as count
      FROM tips
      WHERE user_id = $1 AND created_at >= $2
    `;

    const result = await db.query(query, [userId, windowStartDate]);
    return parseInt(result.rows[0].count, 10);
  }

  static async getTotalForUser(userId: string): Promise<number> {
    const query = `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM tips
      WHERE user_id = $1
    `;

    const result = await db.query(query, [userId]);
    return parseFloat(result.rows[0].total);
  }

  private static mapRow(row: any): Tip {
    return {
      id: row.id,
      userId: row.user_id,
      cafeId: row.cafe_id,
      amount: parseFloat(row.amount),
      createdAt: row.created_at,
    };
  }
}
