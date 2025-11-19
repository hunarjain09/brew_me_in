import { db } from '../db/connection';
import { Message } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class MessageModel {
  static async create(data: {
    userId: string | null;
    username: string;
    cafeId: string;
    content: string;
    messageType?: 'user' | 'agent' | 'system' | 'barista';
    metadata?: any;
  }): Promise<Message> {
    const id = uuidv4();
    const messageType = data.messageType || 'user';

    const query = `
      INSERT INTO messages (id, user_id, username, cafe_id, content, message_type, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await db.query(query, [
      id,
      data.userId,
      data.username,
      data.cafeId,
      data.content,
      messageType,
      data.metadata ? JSON.stringify(data.metadata) : null,
    ]);

    return this.mapRow(result.rows[0]);
  }

  static async findByCafeId(
    cafeId: string,
    options: { limit?: number; before?: Date } = {}
  ): Promise<Message[]> {
    const limit = options.limit || 50;
    let query = `
      SELECT *
      FROM messages
      WHERE cafe_id = $1 AND deleted_at IS NULL
    `;

    const params: any[] = [cafeId];

    if (options.before) {
      query += ` AND created_at < $2`;
      params.push(options.before);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await db.query(query, params);

    return result.rows.map((row) => this.mapRow(row));
  }

  static async findById(id: string): Promise<Message | null> {
    const query = `
      SELECT *
      FROM messages
      WHERE id = $1 AND deleted_at IS NULL
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  static async softDelete(id: string, userId: string): Promise<boolean> {
    const query = `
      UPDATE messages
      SET deleted_at = NOW()
      WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
      RETURNING id
    `;

    const result = await db.query(query, [id, userId]);

    return result.rows.length > 0;
  }

  /**
   * Soft delete a message (for moderators)
   * Can delete any message in the cafe
   */
  static async moderatorDelete(id: string, cafeId: string): Promise<boolean> {
    const query = `
      UPDATE messages
      SET deleted_at = NOW()
      WHERE id = $1 AND cafe_id = $2 AND deleted_at IS NULL
      RETURNING id
    `;

    const result = await db.query(query, [id, cafeId]);

    return result.rows.length > 0;
  }

  /**
   * Get messages for moderation (includes deleted ones)
   */
  static async findByCafeIdForModeration(
    cafeId: string,
    options: { limit?: number; offset?: number; userId?: string } = {}
  ): Promise<Message[]> {
    const limit = options.limit || 100;
    const offset = options.offset || 0;

    let query = `
      SELECT *
      FROM messages
      WHERE cafe_id = $1
    `;

    const params: any[] = [cafeId];

    if (options.userId) {
      query += ` AND user_id = $2`;
      params.push(options.userId);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    return result.rows.map((row) => this.mapRow(row));
  }

  static async getRecentCount(cafeId: string, minutes: number = 60): Promise<number> {
    const query = `
      SELECT COUNT(*)
      FROM messages
      WHERE cafe_id = $1
        AND created_at > NOW() - INTERVAL '${minutes} minutes'
        AND deleted_at IS NULL
    `;

    const result = await db.query(query, [cafeId]);

    return parseInt(result.rows[0].count);
  }

  private static mapRow(row: any): Message {
    return {
      id: row.id,
      userId: row.user_id,
      username: row.username,
      cafeId: row.cafe_id,
      content: row.content,
      messageType: row.message_type,
      metadata: row.metadata,
      createdAt: row.created_at,
      deletedAt: row.deleted_at,
    };
  }
}
