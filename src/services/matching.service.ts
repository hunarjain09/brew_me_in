import { query } from '../db/connection';
import { DiscoverUsersQuery, DiscoveredUser } from '../types/matching.types';

export class MatchingService {
  /**
   * Discover users with shared interests in a cafe
   * Prioritizes users with multiple shared interests
   * Excludes self and poke-disabled users
   */
  async discoverUsers(
    currentUserId: string,
    params: DiscoverUsersQuery
  ): Promise<DiscoveredUser[]> {
    const { cafeId, interests, limit = 20, offset = 0 } = params;

    let queryText: string;
    let queryParams: any[];

    if (interests && interests.length > 0) {
      // Find users with specific shared interests
      queryText = `
        WITH user_shared_interests AS (
          SELECT
            ui.user_id,
            ARRAY_AGG(ui.interest) as shared_interests,
            COUNT(*) as shared_count
          FROM user_interests ui
          WHERE ui.interest = ANY($1::varchar[])
            AND ui.user_id != $2
            AND EXISTS (
              SELECT 1 FROM users u
              WHERE u.id = ui.user_id
              AND u.poke_enabled = true
            )
          GROUP BY ui.user_id
        )
        SELECT
          usi.user_id as "userId",
          u.username,
          usi.shared_interests as "sharedInterests",
          usi.shared_count as "totalSharedInterests"
        FROM user_shared_interests usi
        JOIN users u ON u.id = usi.user_id
        ORDER BY usi.shared_count DESC, u.username ASC
        LIMIT $3 OFFSET $4
      `;
      queryParams = [interests, currentUserId, limit, offset];
    } else {
      // Find all users with any shared interests with current user
      queryText = `
        WITH current_user_interests AS (
          SELECT interest
          FROM user_interests
          WHERE user_id = $1
        ),
        user_shared_interests AS (
          SELECT
            ui.user_id,
            ARRAY_AGG(DISTINCT ui.interest) as shared_interests,
            COUNT(DISTINCT ui.interest) as shared_count
          FROM user_interests ui
          JOIN current_user_interests cui ON cui.interest = ui.interest
          WHERE ui.user_id != $1
            AND EXISTS (
              SELECT 1 FROM users u
              WHERE u.id = ui.user_id
              AND u.poke_enabled = true
            )
          GROUP BY ui.user_id
        )
        SELECT
          usi.user_id as "userId",
          u.username,
          usi.shared_interests as "sharedInterests",
          usi.shared_count as "totalSharedInterests"
        FROM user_shared_interests usi
        JOIN users u ON u.id = usi.user_id
        ORDER BY usi.shared_count DESC, u.username ASC
        LIMIT $2 OFFSET $3
      `;
      queryParams = [currentUserId, limit, offset];
    }

    const result = await query(queryText, queryParams);
    return result.rows;
  }

  /**
   * Get user interests
   */
  async getUserInterests(userId: string): Promise<string[]> {
    const result = await query(
      'SELECT interest FROM user_interests WHERE user_id = $1',
      [userId]
    );
    return result.rows.map((row) => row.interest);
  }

  /**
   * Add interest for a user
   */
  async addUserInterest(userId: string, interest: string): Promise<void> {
    await query(
      'INSERT INTO user_interests (user_id, interest) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, interest.toLowerCase()]
    );
  }

  /**
   * Remove interest for a user
   */
  async removeUserInterest(userId: string, interest: string): Promise<void> {
    await query(
      'DELETE FROM user_interests WHERE user_id = $1 AND interest = $2',
      [userId, interest.toLowerCase()]
    );
  }

  /**
   * Set all interests for a user (replaces existing)
   */
  async setUserInterests(userId: string, interests: string[]): Promise<void> {
    const client = await query('BEGIN', []);

    try {
      // Delete existing interests
      await query('DELETE FROM user_interests WHERE user_id = $1', [userId]);

      // Insert new interests
      if (interests.length > 0) {
        const values = interests
          .map((_, i) => `($1, $${i + 2})`)
          .join(', ');
        const params = [userId, ...interests.map((i) => i.toLowerCase())];
        await query(
          `INSERT INTO user_interests (user_id, interest) VALUES ${values}`,
          params
        );
      }

      await query('COMMIT', []);
    } catch (error) {
      await query('ROLLBACK', []);
      throw error;
    }
  }
}

export default new MatchingService();
