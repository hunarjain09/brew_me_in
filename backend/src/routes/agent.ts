import { Router, Request, Response } from 'express';
import { body, param, query as expressQuery, validationResult } from 'express-validator';
import { query } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import logger from '../utils/logger';

const router = Router();

router.use(authenticateToken);

// GET /api/admin/agent/config/:cafeId
router.get(
  '/config/:cafeId',
  [param('cafeId').isUUID()],
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

    try {
      const result = await query(
        'SELECT * FROM agent_config WHERE cafe_id = $1',
        [cafeId]
      );

      if (result.rows.length === 0) {
        // Return default config
        return res.json({
          cafe_id: cafeId,
          config: {
            enabled: true,
            responseTime: 'fast',
            personality: 'friendly',
            specializations: [],
          },
          updated_at: new Date(),
        });
      }

      res.json(result.rows[0]);
    } catch (error) {
      logger.error('Get agent config error', { error, cafeId });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PUT /api/admin/agent/config/:cafeId
router.put(
  '/config/:cafeId',
  [
    param('cafeId').isUUID(),
    body('enabled').optional().isBoolean(),
    body('responseTime').optional().isIn(['fast', 'balanced', 'thorough']),
    body('personality').optional().isString(),
    body('specializations').optional().isArray(),
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

    const { enabled, responseTime, personality, specializations } = req.body;

    try {
      // Build config object with only provided fields
      const configUpdates: any = {};
      if (enabled !== undefined) configUpdates.enabled = enabled;
      if (responseTime) configUpdates.responseTime = responseTime;
      if (personality) configUpdates.personality = personality;
      if (specializations) configUpdates.specializations = specializations;

      const result = await query(
        `INSERT INTO agent_config (cafe_id, config, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (cafe_id)
         DO UPDATE SET
           config = agent_config.config || $2,
           updated_at = NOW()
         RETURNING *`,
        [cafeId, JSON.stringify(configUpdates)]
      );

      logger.info('Agent config updated', { cafeId, moderatorId: moderator.moderatorId });

      res.json(result.rows[0]);
    } catch (error) {
      logger.error('Update agent config error', { error, cafeId });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/admin/agent/queries/:cafeId
router.get(
  '/queries/:cafeId',
  [
    param('cafeId').isUUID(),
    expressQuery('limit').optional().isInt({ min: 1, max: 100 }),
    expressQuery('offset').optional().isInt({ min: 0 }),
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

    const { limit = 50, offset = 0 } = req.query;

    try {
      const result = await query(
        `SELECT aq.*,
                u.username
         FROM agent_queries aq
         LEFT JOIN users u ON aq.user_id = u.id
         WHERE aq.cafe_id = $1
         ORDER BY aq.created_at DESC
         LIMIT $2 OFFSET $3`,
        [cafeId, limit, offset]
      );

      // Get statistics
      const statsResult = await query(
        `SELECT
           COUNT(*) as total_queries,
           AVG(processing_time_ms)::int as avg_processing_time,
           COUNT(DISTINCT user_id) as unique_users
         FROM agent_queries
         WHERE cafe_id = $1`,
        [cafeId]
      );

      res.json({
        queries: result.rows,
        stats: statsResult.rows[0],
      });
    } catch (error) {
      logger.error('Get agent queries error', { error, cafeId });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
