import { db } from '../db/connection';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export interface JoinToken {
  id: string;
  cafeId: string;
  username: string;
  receiptId: string;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

export class JoinTokenModel {
  static async create(
    cafeId: string,
    username: string,
    receiptId: string,
    expiresInMinutes: number = 15
  ): Promise<JoinToken> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);

    const query = `
      INSERT INTO join_tokens (cafe_id, username, receipt_id, token, expires_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await db.query(query, [cafeId, username, receiptId, token, expiresAt]);
    return this.mapRow(result.rows[0]);
  }

  static async findByToken(token: string): Promise<JoinToken | null> {
    const query = `
      SELECT * FROM join_tokens
      WHERE token = $1 AND expires_at > NOW() AND used = false
    `;

    const result = await db.query(query, [token]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  static async markAsUsed(token: string): Promise<void> {
    const query = `
      UPDATE join_tokens
      SET used = true
      WHERE token = $1
    `;

    await db.query(query, [token]);
  }

  static async deleteExpired(): Promise<number> {
    const query = 'SELECT cleanup_expired_join_tokens()';
    const result = await db.query(query);
    return result.rows[0].cleanup_expired_join_tokens;
  }

  private static mapRow(row: any): JoinToken {
    return {
      id: row.id,
      cafeId: row.cafe_id,
      username: row.username,
      receiptId: row.receipt_id,
      token: row.token,
      expiresAt: row.expires_at,
      used: row.used,
      createdAt: row.created_at,
    };
  }
}
