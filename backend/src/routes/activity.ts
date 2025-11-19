import { Router, Request, Response } from 'express';
import { param, query as expressQuery, validationResult } from 'express-validator';
import { query } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import logger from '../utils/logger';

const router = Router();

router.use(authenticateToken);

// GET /api/admin/cafes/:cafeId/activity
router.get(
  '/cafes/:cafeId/activity',
  [
    param('cafeId').isUUID(),
    expressQuery('limit').optional().isInt({ min: 1, max: 200 }),
    expressQuery('type').optional().isString(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { cafeId } = req.params;
    const moderator = req.moderator!;

    if (moderator.cafeId !== cafeId) {
      return res.status(403).json({ error: 'Access denied to this cafe' });
    }

    const { limit = 100, type } = req.query;

    try {
      let activityQuery = `
        SELECT
          'message' as type,
          m.id,
          u.username as user,
          m.content,
          m.created_at as timestamp,
          NULL as metadata
        FROM messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.cafe_id = $1 AND m.deleted_at IS NULL
      `;

      const params: any[] = [cafeId];

      if (type) {
        activityQuery += ` AND 'message' = $2`;
        params.push(type);
      }

      activityQuery += `
        UNION ALL
        SELECT
          'moderation' as type,
          ma.id,
          u.username as user,
          ma.action as content,
          ma.created_at as timestamp,
          jsonb_build_object('reason', ma.reason, 'moderator', m.email) as metadata
        FROM moderation_actions ma
        JOIN users u ON ma.target_user_id = u.id
        JOIN moderators m ON ma.moderator_id = m.id
        WHERE u.cafe_id = $1
      `;

      if (type && type === 'moderation') {
        // Filter already applied
      } else if (type) {
        activityQuery += ` AND false`; // Exclude moderation if specific type requested
      }

      activityQuery += `
        ORDER BY timestamp DESC
        LIMIT $${params.length + 1}
      `;

      params.push(limit);

      const result = await query(activityQuery, params);

      res.json({ activity: result.rows });
    } catch (error) {
      logger.error('Get activity error', { error, cafeId });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/admin/cafes/:cafeId/messages
router.get(
  '/cafes/:cafeId/messages',
  [
    param('cafeId').isUUID(),
    expressQuery('limit').optional().isInt({ min: 1, max: 200 }),
    expressQuery('userId').optional().isUUID(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { cafeId } = req.params;
    const moderator = req.moderator!;

    if (moderator.cafeId !== cafeId) {
      return res.status(403).json({ error: 'Access denied to this cafe' });
    }

    const { limit = 100, userId } = req.query;

    try {
      let queryText = `
        SELECT m.*,
               u.username,
               u.is_banned
        FROM messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.cafe_id = $1
      `;

      const params: any[] = [cafeId];

      if (userId) {
        queryText += ` AND m.user_id = $2`;
        params.push(userId);
      }

      queryText += `
        ORDER BY m.created_at DESC
        LIMIT $${params.length + 1}
      `;

      params.push(limit);

      const result = await query(queryText, params);

      res.json({ messages: result.rows });
    } catch (error) {
      logger.error('Get messages error', { error, cafeId });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
