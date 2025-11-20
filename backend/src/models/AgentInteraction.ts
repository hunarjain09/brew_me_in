import { db } from '../db/connection';
import { AgentInteraction, InteractionType } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class AgentInteractionModel {
  /**
   * Create new agent interaction
   */
  static async create(data: {
    agentId: string;
    userId?: string;
    messageId?: string;
    interactionType: InteractionType;
    query: string;
    response?: string;
    processingTimeMs?: number;
    tokenCount?: number;
    success?: boolean;
    errorMessage?: string;
    metadata?: Record<string, any>;
  }): Promise<AgentInteraction> {
    const id = uuidv4();
    const success = data.success ?? true;

    const query = `
      INSERT INTO agent_interactions (
        id, agent_id, user_id, message_id, interaction_type,
        query, response, processing_time_ms, token_count,
        success, error_message, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const result = await db.query(query, [
      id,
      data.agentId,
      data.userId || null,
      data.messageId || null,
      data.interactionType,
      data.query,
      data.response || null,
      data.processingTimeMs || null,
      data.tokenCount || null,
      success,
      data.errorMessage || null,
      data.metadata ? JSON.stringify(data.metadata) : '{}',
    ]);

    return this.mapRow(result.rows[0]);
  }

  /**
   * Find interaction by ID
   */
  static async findById(id: string): Promise<AgentInteraction | null> {
    const query = `
      SELECT * FROM agent_interactions WHERE id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  /**
   * Get interactions for an agent
   */
  static async findByAgentId(
    agentId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<AgentInteraction[]> {
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const query = `
      SELECT * FROM agent_interactions
      WHERE agent_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await db.query(query, [agentId, limit, offset]);

    return result.rows.map((row) => this.mapRow(row));
  }

  /**
   * Get interactions for a user
   */
  static async findByUserId(
    userId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<AgentInteraction[]> {
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const query = `
      SELECT * FROM agent_interactions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await db.query(query, [userId, limit, offset]);

    return result.rows.map((row) => this.mapRow(row));
  }

  /**
   * Get recent interactions for analytics
   */
  static async getRecentByAgentId(
    agentId: string,
    hours: number = 24
  ): Promise<AgentInteraction[]> {
    const query = `
      SELECT * FROM agent_interactions
      WHERE agent_id = $1
        AND created_at > NOW() - INTERVAL '${hours} hours'
      ORDER BY created_at DESC
    `;

    const result = await db.query(query, [agentId]);

    return result.rows.map((row) => this.mapRow(row));
  }

  /**
   * Get interaction statistics for an agent
   */
  static async getStats(
    agentId: string,
    hours: number = 24
  ): Promise<{
    totalInteractions: number;
    successfulInteractions: number;
    failedInteractions: number;
    avgProcessingTimeMs: number;
    totalTokens: number;
    byType: Record<InteractionType, number>;
  }> {
    const query = `
      SELECT
        COUNT(*) as total_interactions,
        COUNT(*) FILTER (WHERE success = true) as successful_interactions,
        COUNT(*) FILTER (WHERE success = false) as failed_interactions,
        AVG(processing_time_ms)::integer as avg_processing_time_ms,
        SUM(COALESCE(token_count, 0))::integer as total_tokens,
        interaction_type,
        COUNT(*) as type_count
      FROM agent_interactions
      WHERE agent_id = $1
        AND created_at > NOW() - INTERVAL '${hours} hours'
      GROUP BY interaction_type
    `;

    const result = await db.query(query, [agentId]);

    if (result.rows.length === 0) {
      return {
        totalInteractions: 0,
        successfulInteractions: 0,
        failedInteractions: 0,
        avgProcessingTimeMs: 0,
        totalTokens: 0,
        byType: { mention: 0, proactive: 0, contextual: 0 },
      };
    }

    const byType: Record<InteractionType, number> = { mention: 0, proactive: 0, contextual: 0 };
    let totalInteractions = 0;
    let successfulInteractions = 0;
    let failedInteractions = 0;
    let totalTokens = 0;

    result.rows.forEach((row) => {
      byType[row.interaction_type as InteractionType] = parseInt(row.type_count);
      totalInteractions += parseInt(row.type_count);
    });

    // Get aggregated stats from first row (all rows have same aggregates)
    const firstRow = result.rows[0];
    successfulInteractions = parseInt(firstRow.successful_interactions);
    failedInteractions = parseInt(firstRow.failed_interactions);
    totalTokens = parseInt(firstRow.total_tokens);

    return {
      totalInteractions,
      successfulInteractions,
      failedInteractions,
      avgProcessingTimeMs: parseInt(firstRow.avg_processing_time_ms) || 0,
      totalTokens,
      byType,
    };
  }

  /**
   * Delete old interactions (cleanup)
   */
  static async deleteOlderThan(days: number): Promise<number> {
    const query = `
      DELETE FROM agent_interactions
      WHERE created_at < NOW() - INTERVAL '${days} days'
      RETURNING id
    `;

    const result = await db.query(query);

    return result.rows.length;
  }

  /**
   * Map database row to AgentInteraction object
   */
  private static mapRow(row: any): AgentInteraction {
    return {
      id: row.id,
      agentId: row.agent_id,
      userId: row.user_id,
      messageId: row.message_id,
      interactionType: row.interaction_type,
      query: row.query,
      response: row.response,
      processingTimeMs: row.processing_time_ms,
      tokenCount: row.token_count,
      success: row.success,
      errorMessage: row.error_message,
      metadata: row.metadata || {},
      createdAt: row.created_at,
    };
  }
}
