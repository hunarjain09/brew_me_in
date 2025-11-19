import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { query, getClient } from '../config/database';
import { moderationCache } from '../config/redis';
import { authenticateToken } from '../middleware/auth';
import logger from '../utils/logger';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// POST /api/admin/moderation/mute
router.post(
  '/mute',
  [
    body('userId').isUUID(),
    body('duration').isInt({ min: 1, max: 43200 }), // Max 30 days
    body('reason').optional().isString(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId, duration, reason } = req.body;
    const moderator = req.moderator!;

    try {
      // Record moderation action
      await query(
        `INSERT INTO moderation_actions (moderator_id, target_user_id, action, reason, duration)
         VALUES ($1, $2, 'mute', $3, $4)`,
        [moderator.moderatorId, userId, reason || 'No reason provided', duration]
      );

      // Add to Redis cache
      await moderationCache.muteUser(moderator.cafeId, userId, duration);

      logger.info('User muted', { userId, duration, moderatorId: moderator.moderatorId });

      res.json({ success: true, message: 'User muted successfully' });
    } catch (error) {
      logger.error('Mute error', { error, userId });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/admin/moderation/unmute
router.post(
  '/unmute',
  [body('userId').isUUID()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId } = req.body;
    const moderator = req.moderator!;

    try {
      await query(
        `INSERT INTO moderation_actions (moderator_id, target_user_id, action)
         VALUES ($1, $2, 'unmute')`,
        [moderator.moderatorId, userId]
      );

      await moderationCache.unmuteUser(moderator.cafeId, userId);

      logger.info('User unmuted', { userId, moderatorId: moderator.moderatorId });

      res.json({ success: true, message: 'User unmuted successfully' });
    } catch (error) {
      logger.error('Unmute error', { error, userId });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/admin/moderation/ban
router.post(
  '/ban',
  [
    body('userId').isUUID(),
    body('reason').optional().isString(),
    body('permanent').optional().isBoolean(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId, reason, permanent = false } = req.body;
    const moderator = req.moderator!;

    try {
      const client = await getClient();

      try {
        await client.query('BEGIN');

        // Update user ban status
        await client.query(
          'UPDATE users SET is_banned = true WHERE id = $1',
          [userId]
        );

        // Record moderation action
        await client.query(
          `INSERT INTO moderation_actions (moderator_id, target_user_id, action, reason, metadata)
           VALUES ($1, $2, 'ban', $3, $4)`,
          [moderator.moderatorId, userId, reason || 'No reason provided', JSON.stringify({ permanent })]
        );

        await client.query('COMMIT');

        logger.info('User banned', { userId, permanent, moderatorId: moderator.moderatorId });

        res.json({ success: true, message: 'User banned successfully' });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Ban error', { error, userId });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/admin/moderation/unban
router.post(
  '/unban',
  [body('userId').isUUID()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId } = req.body;
    const moderator = req.moderator!;

    try {
      const client = await getClient();

      try {
        await client.query('BEGIN');

        await client.query(
          'UPDATE users SET is_banned = false WHERE id = $1',
          [userId]
        );

        await client.query(
          `INSERT INTO moderation_actions (moderator_id, target_user_id, action)
           VALUES ($1, $2, 'unban')`,
          [moderator.moderatorId, userId]
        );

        await client.query('COMMIT');

        logger.info('User unbanned', { userId, moderatorId: moderator.moderatorId });

        res.json({ success: true, message: 'User unbanned successfully' });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Unban error', { error, userId });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// DELETE /api/admin/messages/:messageId
router.delete(
  '/messages/:messageId',
  [param('messageId').isUUID()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { messageId } = req.params;
    const { reason } = req.body;
    const moderator = req.moderator!;

    try {
      // Soft delete message
      await query(
        'UPDATE messages SET deleted_at = NOW() WHERE id = $1 AND cafe_id = $2',
        [messageId, moderator.cafeId]
      );

      // Get user_id from message
      const messageResult = await query(
        'SELECT user_id FROM messages WHERE id = $1',
        [messageId]
      );

      if (messageResult.rows.length > 0) {
        await query(
          `INSERT INTO moderation_actions (moderator_id, target_user_id, action, reason, metadata)
           VALUES ($1, $2, 'delete_message', $3, $4)`,
          [
            moderator.moderatorId,
            messageResult.rows[0].user_id,
            reason || 'No reason provided',
            JSON.stringify({ messageId }),
          ]
        );
      }

      logger.info('Message deleted', { messageId, moderatorId: moderator.moderatorId });

      res.json({ success: true, message: 'Message deleted successfully' });
    } catch (error) {
      logger.error('Delete message error', { error, messageId });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/admin/moderation/history
router.get('/history', async (req: Request, res: Response) => {
  const moderator = req.moderator!;
  const { limit = 50, offset = 0 } = req.query;

  try {
    const result = await query(
      `SELECT ma.*,
              u.username as target_username,
              m.email as moderator_email
       FROM moderation_actions ma
       JOIN users u ON ma.target_user_id = u.id
       JOIN moderators m ON ma.moderator_id = m.id
       WHERE u.cafe_id = $1
       ORDER BY ma.created_at DESC
       LIMIT $2 OFFSET $3`,
      [moderator.cafeId, limit, offset]
    );

    res.json({ actions: result.rows });
  } catch (error) {
    logger.error('Get moderation history error', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
