import { db } from '../db/connection';
import { AgentRateLimit, RateLimitCheck } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class AgentRateLimitModel {
  /**
   * Check rate limit for user-agent interaction
   */
  static async check(
    userId: string,
    agentId: string,
    maxMessages: number = 10,
    windowMinutes: number = 60
  ): Promise<RateLimitCheck> {
    const query = `
      SELECT * FROM check_agent_rate_limit($1, $2, $3, $4)
    `;

    const result = await db.query(query, [userId, agentId, maxMessages, windowMinutes]);

    return result.rows[0].check_agent_rate_limit;
  }

  /**
   * Increment rate limit counter after sending message
   */
  static async increment(userId: string, agentId: string): Promise<void> {
    const query = `
      SELECT increment_agent_rate_limit($1, $2)
    `;

    await db.query(query, [userId, agentId]);
  }

  /**
   * Get current rate limit for user-agent
   */
  static async get(userId: string, agentId: string): Promise<AgentRateLimit | null> {
    const query = `
      SELECT * FROM agent_rate_limits
      WHERE user_id = $1 AND agent_id = $2
    `;

    const result = await db.query(query, [userId, agentId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  /**
   * Create or update rate limit record
   */
  static async upsert(data: {
    userId: string;
    agentId: string;
    messageCount?: number;
    windowStart?: Date;
    lastMessageAt?: Date;
  }): Promise<AgentRateLimit> {
    const existing = await this.get(data.userId, data.agentId);

    if (existing) {
      const query = `
        UPDATE agent_rate_limits
        SET
          message_count = COALESCE($3, message_count),
          window_start = COALESCE($4, window_start),
          last_message_at = COALESCE($5, last_message_at),
          total_messages = total_messages + 1
        WHERE user_id = $1 AND agent_id = $2
        RETURNING *
      `;

      const result = await db.query(query, [
        data.userId,
        data.agentId,
        data.messageCount,
        data.windowStart,
        data.lastMessageAt,
      ]);

      return this.mapRow(result.rows[0]);
    } else {
      const id = uuidv4();
      const query = `
        INSERT INTO agent_rate_limits (
          id, user_id, agent_id, message_count, window_start, last_message_at, total_messages
        )
        VALUES ($1, $2, $3, $4, $5, $6, 1)
        RETURNING *
      `;

      const result = await db.query(query, [
        id,
        data.userId,
        data.agentId,
        data.messageCount || 0,
        data.windowStart || new Date(),
        data.lastMessageAt || new Date(),
      ]);

      return this.mapRow(result.rows[0]);
    }
  }

  /**
   * Reset rate limit for user-agent
   */
  static async reset(userId: string, agentId: string): Promise<void> {
    const query = `
      UPDATE agent_rate_limits
      SET message_count = 0,
          window_start = NOW()
      WHERE user_id = $1 AND agent_id = $2
    `;

    await db.query(query, [userId, agentId]);
  }

  /**
   * Get all rate limits for a user
   */
  static async findByUserId(userId: string): Promise<AgentRateLimit[]> {
    const query = `
      SELECT * FROM agent_rate_limits
      WHERE user_id = $1
    `;

    const result = await db.query(query, [userId]);

    return result.rows.map((row) => this.mapRow(row));
  }

  /**
   * Get all rate limits for an agent
   */
  static async findByAgentId(agentId: string): Promise<AgentRateLimit[]> {
    const query = `
      SELECT * FROM agent_rate_limits
      WHERE agent_id = $1
    `;

    const result = await db.query(query, [agentId]);

    return result.rows.map((row) => this.mapRow(row));
  }

  /**
   * Get users who have hit rate limit
   */
  static async getUsersAtLimit(
    agentId: string,
    maxMessages: number = 10,
    windowMinutes: number = 60
  ): Promise<AgentRateLimit[]> {
    const query = `
      SELECT * FROM agent_rate_limits
      WHERE agent_id = $1
        AND message_count >= $2
        AND window_start > NOW() - INTERVAL '${windowMinutes} minutes'
    `;

    const result = await db.query(query, [agentId, maxMessages]);

    return result.rows.map((row) => this.mapRow(row));
  }

  /**
   * Clean up old rate limit records
   */
  static async cleanup(olderThanDays: number = 7): Promise<number> {
    const query = `
      DELETE FROM agent_rate_limits
      WHERE window_start < NOW() - INTERVAL '${olderThanDays} days'
      RETURNING id
    `;

    const result = await db.query(query);

    return result.rows.length;
  }

  /**
   * Map database row to AgentRateLimit object
   */
  private static mapRow(row: any): AgentRateLimit {
    return {
      id: row.id,
      userId: row.user_id,
      agentId: row.agent_id,
      messageCount: row.message_count,
      windowStart: row.window_start,
      lastMessageAt: row.last_message_at,
      totalMessages: row.total_messages,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
