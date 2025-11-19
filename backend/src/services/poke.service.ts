import { db } from '../db/connection';
import { Poke, PokeStatus } from '../types/matching.types';
import { v4 as uuidv4 } from 'uuid';

export class PokeService {
  private readonly EXPIRATION_HOURS = parseInt(process.env.POKE_EXPIRATION_HOURS || '24');

  /**
   * Send a poke from one user to another
   */
  async sendPoke(
    fromUserId: string,
    toUserId: string,
    sharedInterest: string
  ): Promise<Poke> {
    // Validate users are different
    if (fromUserId === toUserId) {
      throw new Error('Cannot poke yourself');
    }

    // Check if target user has poke enabled
    const userCheck = await db.query(
      'SELECT poke_enabled FROM users WHERE id = $1',
      [toUserId]
    );

    if (userCheck.rows.length === 0) {
      throw new Error('Target user not found');
    }

    if (!userCheck.rows[0].poke_enabled) {
      throw new Error('Target user has pokes disabled');
    }

    // Check if there's already a pending poke between these users
    const existingPoke = await db.query(
      `SELECT id FROM pokes
       WHERE ((from_user_id = $1 AND to_user_id = $2)
          OR (from_user_id = $2 AND to_user_id = $1))
       AND status = 'pending'`,
      [fromUserId, toUserId]
    );

    if (existingPoke.rows.length > 0) {
      throw new Error('A pending poke already exists between these users');
    }

    // Create the poke
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.EXPIRATION_HOURS);

    const result = await db.query(
      `INSERT INTO pokes (from_user_id, to_user_id, shared_interest, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id, from_user_id as "fromUserId", to_user_id as "toUserId",
                 shared_interest as "sharedInterest", status,
                 created_at as "createdAt", expires_at as "expiresAt"`,
      [fromUserId, toUserId, sharedInterest, expiresAt]
    );

    return result.rows[0];
  }

  /**
   * Respond to a poke (accept or decline)
   */
  async respondToPoke(
    pokeId: string,
    userId: string,
    action: 'accept' | 'decline'
  ): Promise<{ poke: Poke; matched: boolean; channelId?: string }> {
    // Get the poke
    const pokeResult = await db.query(
      `SELECT id, from_user_id as "fromUserId", to_user_id as "toUserId",
              shared_interest as "sharedInterest", status,
              created_at as "createdAt", expires_at as "expiresAt"
       FROM pokes WHERE id = $1`,
      [pokeId]
    );

    if (pokeResult.rows.length === 0) {
      throw new Error('Poke not found');
    }

    const poke = pokeResult.rows[0];

    // Verify user is the recipient
    if (poke.toUserId !== userId) {
      throw new Error('You are not the recipient of this poke');
    }

    // Verify poke is still pending
    if (poke.status !== 'pending') {
      throw new Error('Poke is no longer pending');
    }

    // Check if poke has expired
    if (new Date(poke.expiresAt) < new Date()) {
      await db.query(
        `UPDATE pokes SET status = 'expired' WHERE id = $1`,
        [pokeId]
      );
      throw new Error('Poke has expired');
    }

    if (action === 'decline') {
      // Mark as declined
      await db.query(
        `UPDATE pokes SET status = 'declined', responded_at = NOW() WHERE id = $1`,
        [pokeId]
      );

      return {
        poke: { ...poke, status: 'declined', respondedAt: new Date() },
        matched: false,
      };
    }

    // Check if there's a mutual poke (from receiver to sender)
    const mutualPokeResult = await db.query(
      `SELECT id FROM pokes
       WHERE from_user_id = $1 AND to_user_id = $2 AND status = 'pending'`,
      [userId, poke.fromUserId]
    );

    const hasMutualPoke = mutualPokeResult.rows.length > 0;

    if (hasMutualPoke) {
      // It's a match! Update both pokes and create DM channel
      const client = await db.query('BEGIN', []);

      try {
        // Update both pokes to matched
        await db.query(
          `UPDATE pokes SET status = 'matched', responded_at = NOW()
           WHERE id = $1 OR id = $2`,
          [pokeId, mutualPokeResult.rows[0].id]
        );

        // Create DM channel (ensure user1_id < user2_id for uniqueness)
        const [user1, user2] = [poke.fromUserId, userId].sort();
        const channelResult = await db.query(
          `INSERT INTO dm_channels (user1_id, user2_id, cafe_id)
           VALUES ($1, $2, NULL)
           ON CONFLICT (user1_id, user2_id) DO UPDATE SET last_message_at = NOW()
           RETURNING id`,
          [user1, user2]
        );

        await db.query('COMMIT', []);

        return {
          poke: { ...poke, status: 'matched', respondedAt: new Date() },
          matched: true,
          channelId: channelResult.rows[0].id,
        };
      } catch (error) {
        await db.query('ROLLBACK', []);
        throw error;
      }
    } else {
      // Just accept the poke, but no match yet
      await db.query(
        `UPDATE pokes SET status = 'pending', responded_at = NOW() WHERE id = $1`,
        [pokeId]
      );

      return {
        poke: { ...poke, respondedAt: new Date() },
        matched: false,
      };
    }
  }

  /**
   * Get pending pokes for a user (incoming)
   */
  async getPendingPokes(userId: string): Promise<Poke[]> {
    const result = await db.query(
      `SELECT p.id, p.from_user_id as "fromUserId", p.to_user_id as "toUserId",
              p.shared_interest as "sharedInterest", p.status,
              p.created_at as "createdAt", p.expires_at as "expiresAt",
              p.responded_at as "respondedAt"
       FROM pokes p
       WHERE p.to_user_id = $1
         AND p.status = 'pending'
         AND p.expires_at > NOW()
       ORDER BY p.created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Get sent pokes for a user (outgoing)
   */
  async getSentPokes(userId: string): Promise<Poke[]> {
    const result = await db.query(
      `SELECT p.id, p.from_user_id as "fromUserId", p.to_user_id as "toUserId",
              p.shared_interest as "sharedInterest", p.status,
              p.created_at as "createdAt", p.expires_at as "expiresAt",
              p.responded_at as "respondedAt"
       FROM pokes p
       WHERE p.from_user_id = $1
         AND p.status = 'pending'
         AND p.expires_at > NOW()
       ORDER BY p.created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Expire old pokes (background job)
   */
  async expireOldPokes(): Promise<number> {
    const result = await db.query(
      `UPDATE pokes
       SET status = 'expired'
       WHERE status = 'pending' AND expires_at < NOW()
       RETURNING id`
    );

    return result.rowCount || 0;
  }

  /**
   * Check rate limit for sending pokes
   */
  async checkRateLimit(userId: string, windowMs: number, maxPokes: number): Promise<boolean> {
    const windowStart = new Date(Date.now() - windowMs);

    const result = await db.query(
      `SELECT COUNT(*) as count
       FROM pokes
       WHERE from_user_id = $1 AND created_at > $2`,
      [userId, windowStart]
    );

    const count = parseInt(result.rows[0].count);
    return count < maxPokes;
  }
}

export default new PokeService();
