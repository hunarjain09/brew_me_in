import { Router, Request, Response } from 'express';
import { param, query as expressQuery, validationResult } from 'express-validator';
import { query } from '../config/database';
import { moderationCache } from '../config/redis';
import { authenticateToken } from '../middleware/auth';
import logger from '../utils/logger';

const router = Router();

router.use(authenticateToken);

// GET /api/admin/cafes/:cafeId/users
router.get(
  '/cafes/:cafeId/users',
  [param('cafeId').isUUID()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { cafeId } = req.params;
    const moderator = req.moderator!;

    // Verify moderator has access to this cafe
    if (moderator.cafeId !== cafeId) {
      return res.status(403).json({ error: 'Access denied to this cafe' });
    }

    const { search, banned, limit = 100, offset = 0 } = req.query;

    try {
      let queryText = `
        SELECT u.*,
               COUNT(m.id) as message_count,
               MAX(m.created_at) as last_message_at
        FROM users u
        LEFT JOIN messages m ON u.id = m.user_id
        WHERE u.cafe_id = $1
      `;

      const params: any[] = [cafeId];
      let paramIndex = 2;

      // Filter by search term
      if (search) {
        queryText += ` AND (u.username ILIKE $${paramIndex} OR u.receipt_id ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      // Filter by banned status
      if (banned !== undefined) {
        queryText += ` AND u.is_banned = $${paramIndex}`;
        params.push(banned === 'true');
        paramIndex++;
      }

      queryText += `
        GROUP BY u.id
        ORDER BY u.last_seen_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(limit, offset);

      const result = await query(queryText, params);

      // Get muted users from Redis
      const mutedUsers = await moderationCache.getMutedUsers(cafeId);

      // Enrich users with muted status
      const users = result.rows.map(user => ({
        ...user,
        is_muted: mutedUsers.includes(user.id),
      }));

      res.json({ users });
    } catch (error) {
      logger.error('Get users error', { error, cafeId });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/admin/users/:userId
router.get(
  '/:userId',
  [param('userId').isUUID()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId } = req.params;
    const moderator = req.moderator!;

    try {
      const result = await query(
        `SELECT u.*,
                COUNT(DISTINCT m.id) as total_messages,
                COUNT(DISTINCT ma.id) as moderation_count,
                MAX(m.created_at) as last_message_at
         FROM users u
         LEFT JOIN messages m ON u.id = m.user_id
         LEFT JOIN moderation_actions ma ON u.id = ma.target_user_id
         WHERE u.id = $1 AND u.cafe_id = $2
         GROUP BY u.id`,
        [userId, moderator.cafeId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = result.rows[0];

      // Check if muted
      const isMuted = await moderationCache.isUserMuted(moderator.cafeId, userId);

      // Get recent moderation actions
      const actionsResult = await query(
        `SELECT ma.*, m.email as moderator_email
         FROM moderation_actions ma
         JOIN moderators m ON ma.moderator_id = m.id
         WHERE ma.target_user_id = $1
         ORDER BY ma.created_at DESC
         LIMIT 10`,
        [userId]
      );

      res.json({
        user: { ...user, is_muted: isMuted },
        recent_actions: actionsResult.rows,
      });
    } catch (error) {
      logger.error('Get user error', { error, userId });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
