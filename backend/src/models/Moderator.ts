import db from '../db/connection';
import bcrypt from 'bcrypt';

export interface Moderator {
  id: string;
  cafe_id: string;
  email: string;
  password_hash?: string;
  role: 'owner' | 'moderator';
  permissions: string[];
  created_at: Date;
  updated_at: Date;
}

export interface ModeratorWithCafe extends Moderator {
  cafe_name: string;
  cafe_location?: string;
}

export class ModeratorModel {
  /**
   * Find moderator by email
   */
  static async findByEmail(email: string): Promise<ModeratorWithCafe | null> {
    const result = await db.query(
      `SELECT m.*, c.name as cafe_name, c.latitude, c.longitude
       FROM moderators m
       JOIN cafes c ON m.cafe_id = c.id
       WHERE m.email = $1`,
      [email]
    );

    return result.rows[0] || null;
  }

  /**
   * Find moderator by ID
   */
  static async findById(id: string): Promise<Moderator | null> {
    const result = await db.query(
      'SELECT * FROM moderators WHERE id = $1',
      [id]
    );

    return result.rows[0] || null;
  }

  /**
   * Create new moderator
   */
  static async create(data: {
    cafeId: string;
    email: string;
    password: string;
    role: 'owner' | 'moderator';
  }): Promise<Moderator> {
    const passwordHash = await bcrypt.hash(data.password, 10);

    const result = await db.query(
      `INSERT INTO moderators (cafe_id, email, password_hash, role, permissions)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, cafe_id, email, role, permissions, created_at, updated_at`,
      [
        data.cafeId,
        data.email,
        passwordHash,
        data.role,
        data.role === 'owner' ? ['all'] : []
      ]
    );

    return result.rows[0];
  }

  /**
   * Verify password
   */
  static async verifyPassword(
    plainPassword: string,
    passwordHash: string
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, passwordHash);
  }

  /**
   * Get all moderators for a cafe
   */
  static async getByCafeId(cafeId: string): Promise<Moderator[]> {
    const result = await db.query(
      `SELECT id, cafe_id, email, role, permissions, created_at, updated_at
       FROM moderators
       WHERE cafe_id = $1
       ORDER BY created_at DESC`,
      [cafeId]
    );

    return result.rows;
  }

  /**
   * Update moderator permissions
   */
  static async updatePermissions(
    id: string,
    permissions: string[]
  ): Promise<Moderator | null> {
    const result = await db.query(
      `UPDATE moderators
       SET permissions = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, cafe_id, email, role, permissions, created_at, updated_at`,
      [permissions, id]
    );

    return result.rows[0] || null;
  }

  /**
   * Delete moderator
   */
  static async delete(id: string): Promise<boolean> {
    const result = await db.query(
      'DELETE FROM moderators WHERE id = $1',
      [id]
    );

    return result.rowCount > 0;
  }
}
