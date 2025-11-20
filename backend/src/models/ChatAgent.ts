import { db } from '../db/connection';
import { ChatAgent, PersonalityType, ProactivityLevel, AgentStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class ChatAgentModel {
  /**
   * Create a new chat agent
   */
  static async create(data: {
    cafeId: string;
    name: string;
    username: string;
    avatarUrl?: string;
    personality?: PersonalityType;
    customPrompt?: string;
    proactivity?: ProactivityLevel;
    enabled?: boolean;
    status?: AgentStatus;
    metadata?: Record<string, any>;
  }): Promise<ChatAgent> {
    const id = uuidv4();
    const personality = data.personality || 'bartender';
    const proactivity = data.proactivity || 'occasional';
    const enabled = data.enabled ?? true;
    const status = data.status || 'online';

    const query = `
      INSERT INTO chat_agents (
        id, cafe_id, name, username, avatar_url, personality,
        custom_prompt, proactivity, enabled, status, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const result = await db.query(query, [
      id,
      data.cafeId,
      data.name,
      data.username,
      data.avatarUrl || null,
      personality,
      data.customPrompt || null,
      proactivity,
      enabled,
      status,
      data.metadata ? JSON.stringify(data.metadata) : '{}',
    ]);

    return this.mapRow(result.rows[0]);
  }

  /**
   * Find agent by ID
   */
  static async findById(id: string): Promise<ChatAgent | null> {
    const query = `
      SELECT * FROM chat_agents WHERE id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  /**
   * Find agent by cafe ID
   */
  static async findByCafeId(cafeId: string): Promise<ChatAgent | null> {
    const query = `
      SELECT * FROM chat_agents WHERE cafe_id = $1
    `;

    const result = await db.query(query, [cafeId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  /**
   * Find agent by username
   */
  static async findByUsername(username: string): Promise<ChatAgent | null> {
    const query = `
      SELECT * FROM chat_agents WHERE username = $1
    `;

    const result = await db.query(query, [username]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  /**
   * Get all enabled agents for a cafe
   */
  static async getEnabledByCafeId(cafeId: string): Promise<ChatAgent[]> {
    const query = `
      SELECT * FROM chat_agents
      WHERE cafe_id = $1 AND enabled = true
    `;

    const result = await db.query(query, [cafeId]);

    return result.rows.map((row) => this.mapRow(row));
  }

  /**
   * Update agent
   */
  static async update(
    id: string,
    data: Partial<{
      name: string;
      username: string;
      avatarUrl: string;
      personality: PersonalityType;
      customPrompt: string;
      proactivity: ProactivityLevel;
      enabled: boolean;
      status: AgentStatus;
      metadata: Record<string, any>;
    }>
  ): Promise<ChatAgent | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.username !== undefined) {
      updates.push(`username = $${paramIndex++}`);
      values.push(data.username);
    }
    if (data.avatarUrl !== undefined) {
      updates.push(`avatar_url = $${paramIndex++}`);
      values.push(data.avatarUrl);
    }
    if (data.personality !== undefined) {
      updates.push(`personality = $${paramIndex++}`);
      values.push(data.personality);
    }
    if (data.customPrompt !== undefined) {
      updates.push(`custom_prompt = $${paramIndex++}`);
      values.push(data.customPrompt);
    }
    if (data.proactivity !== undefined) {
      updates.push(`proactivity = $${paramIndex++}`);
      values.push(data.proactivity);
    }
    if (data.enabled !== undefined) {
      updates.push(`enabled = $${paramIndex++}`);
      values.push(data.enabled);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    if (data.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(data.metadata));
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    const query = `
      UPDATE chat_agents
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
   * Update agent status
   */
  static async updateStatus(id: string, status: AgentStatus): Promise<ChatAgent | null> {
    const query = `
      UPDATE chat_agents
      SET status = $1
      WHERE id = $2
      RETURNING *
    `;

    const result = await db.query(query, [status, id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  /**
   * Delete agent
   */
  static async delete(id: string): Promise<boolean> {
    const query = `
      DELETE FROM chat_agents WHERE id = $1 RETURNING id
    `;

    const result = await db.query(query, [id]);

    return result.rows.length > 0;
  }

  /**
   * Map database row to ChatAgent object
   */
  private static mapRow(row: any): ChatAgent {
    return {
      id: row.id,
      cafeId: row.cafe_id,
      name: row.name,
      username: row.username,
      avatarUrl: row.avatar_url,
      personality: row.personality,
      customPrompt: row.custom_prompt,
      proactivity: row.proactivity,
      enabled: row.enabled,
      status: row.status,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
