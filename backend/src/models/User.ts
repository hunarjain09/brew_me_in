import { db } from '../db/connection';
import { User } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class UserModel {
  static async create(data: {
    username: string;
    cafeId: string;
    receiptId: string;
    sessionDurationHours: number;
  }): Promise<User> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + data.sessionDurationHours);

    const query = `
      INSERT INTO users (username, cafe_id, receipt_id, expires_at)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await db.query(query, [
      data.username,
      data.cafeId,
      data.receiptId,
      expiresAt,
    ]);

    return this.mapRow(result.rows[0]);
  }

  static async findById(id: string): Promise<User | null> {
    const query = `
      SELECT u.*,
             b.expires_at as badge_expires_at,
             COALESCE(
               (SELECT COUNT(*) FROM tips WHERE user_id = u.id), 0
             ) as tip_count,
             (SELECT MAX(created_at) FROM tips WHERE user_id = u.id) as last_tip_date
      FROM users u
      LEFT JOIN badges b ON u.id = b.user_id
      WHERE u.id = $1 AND u.expires_at > NOW()
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  static async findByUsername(username: string, cafeId: string): Promise<User | null> {
    const query = `
      SELECT u.*,
             b.expires_at as badge_expires_at,
             COALESCE(
               (SELECT COUNT(*) FROM tips WHERE user_id = u.id), 0
             ) as tip_count,
             (SELECT MAX(created_at) FROM tips WHERE user_id = u.id) as last_tip_date
      FROM users u
      LEFT JOIN badges b ON u.id = b.user_id
      WHERE u.username = $1 AND u.cafe_id = $2 AND u.expires_at > NOW()
    `;

    const result = await db.query(query, [username, cafeId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  static async updateInterests(userId: string, interests: string[]): Promise<void> {
    const query = `
      UPDATE users
      SET interests = $1
      WHERE id = $2
    `;

    await db.query(query, [JSON.stringify(interests), userId]);
  }

  static async updatePokeEnabled(userId: string, enabled: boolean): Promise<void> {
    const query = `
      UPDATE users
      SET poke_enabled = $1
      WHERE id = $2
    `;

    await db.query(query, [enabled, userId]);
  }

  static async deleteExpired(): Promise<number> {
    const query = 'SELECT cleanup_expired_users()';
    const result = await db.query(query);
    return result.rows[0].cleanup_expired_users;
  }

  private static mapRow(row: any): User {
    const badgeStatus = this.getBadgeStatus(row.badge_expires_at);

    return {
      id: row.id,
      username: row.username,
      cafeId: row.cafe_id,
      receiptId: row.receipt_id,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      interests: row.interests || [],
      pokeEnabled: row.poke_enabled,
      badgeStatus,
      badgeExpiresAt: row.badge_expires_at,
      tipCount: parseInt(row.tip_count || '0', 10),
      lastTipDate: row.last_tip_date,
    };
  }

  private static getBadgeStatus(badgeExpiresAt: Date | null): 'none' | 'active' | 'expired' {
    if (!badgeExpiresAt) {
      return 'none';
    }

    const now = new Date();
    return new Date(badgeExpiresAt) > now ? 'active' : 'expired';
  }
}
