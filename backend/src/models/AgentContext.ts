import { db } from '../db/connection';
import { AgentContext, ContextType } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class AgentContextModel {
  /**
   * Create new agent context
   */
  static async create(data: {
    agentId: string;
    contextType: ContextType;
    content: string;
    priority?: number;
    enabled?: boolean;
  }): Promise<AgentContext> {
    const id = uuidv4();
    const priority = data.priority ?? 0;
    const enabled = data.enabled ?? true;

    const query = `
      INSERT INTO agent_context (id, agent_id, context_type, content, priority, enabled)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await db.query(query, [
      id,
      data.agentId,
      data.contextType,
      data.content,
      priority,
      enabled,
    ]);

    return this.mapRow(result.rows[0]);
  }

  /**
   * Find context by ID
   */
  static async findById(id: string): Promise<AgentContext | null> {
    const query = `
      SELECT * FROM agent_context WHERE id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  /**
   * Get all context for an agent
   */
  static async findByAgentId(agentId: string): Promise<AgentContext[]> {
    const query = `
      SELECT * FROM agent_context
      WHERE agent_id = $1
      ORDER BY priority DESC, created_at ASC
    `;

    const result = await db.query(query, [agentId]);

    return result.rows.map((row) => this.mapRow(row));
  }

  /**
   * Get enabled context for an agent, ordered by priority
   */
  static async getEnabledByAgentId(agentId: string): Promise<AgentContext[]> {
    const query = `
      SELECT * FROM agent_context
      WHERE agent_id = $1 AND enabled = true
      ORDER BY priority DESC, created_at ASC
    `;

    const result = await db.query(query, [agentId]);

    return result.rows.map((row) => this.mapRow(row));
  }

  /**
   * Find context by agent ID and type
   */
  static async findByAgentIdAndType(
    agentId: string,
    contextType: ContextType
  ): Promise<AgentContext | null> {
    const query = `
      SELECT * FROM agent_context
      WHERE agent_id = $1 AND context_type = $2
    `;

    const result = await db.query(query, [agentId, contextType]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  /**
   * Update context
   */
  static async update(
    id: string,
    data: Partial<{
      content: string;
      priority: number;
      enabled: boolean;
    }>
  ): Promise<AgentContext | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      values.push(data.content);
    }
    if (data.priority !== undefined) {
      updates.push(`priority = $${paramIndex++}`);
      values.push(data.priority);
    }
    if (data.enabled !== undefined) {
      updates.push(`enabled = $${paramIndex++}`);
      values.push(data.enabled);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    const query = `
      UPDATE agent_context
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  /**
   * Upsert context (update if exists, create if not)
   */
  static async upsert(data: {
    agentId: string;
    contextType: ContextType;
    content: string;
    priority?: number;
    enabled?: boolean;
  }): Promise<AgentContext> {
    const existing = await this.findByAgentIdAndType(data.agentId, data.contextType);

    if (existing) {
      const updated = await this.update(existing.id, {
        content: data.content,
        priority: data.priority,
        enabled: data.enabled,
      });
      return updated!;
    }

    return this.create(data);
  }

  /**
   * Delete context
   */
  static async delete(id: string): Promise<boolean> {
    const query = `
      DELETE FROM agent_context WHERE id = $1 RETURNING id
    `;

    const result = await db.query(query, [id]);

    return result.rows.length > 0;
  }

  /**
   * Delete all context for an agent
   */
  static async deleteByAgentId(agentId: string): Promise<number> {
    const query = `
      DELETE FROM agent_context WHERE agent_id = $1 RETURNING id
    `;

    const result = await db.query(query, [agentId]);

    return result.rows.length;
  }

  /**
   * Map database row to AgentContext object
   */
  private static mapRow(row: any): AgentContext {
    return {
      id: row.id,
      agentId: row.agent_id,
      contextType: row.context_type,
      content: row.content,
      priority: row.priority,
      enabled: row.enabled,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
