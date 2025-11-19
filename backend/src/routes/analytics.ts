import { Router, Request, Response } from 'express';
import { param, query as expressQuery, validationResult } from 'express-validator';
import { query } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import logger from '../utils/logger';
import { stringify } from 'csv-stringify/sync';

const router = Router();

router.use(authenticateToken);

// GET /api/admin/analytics/:cafeId
router.get(
  '/:cafeId',
  [
    param('cafeId').isUUID(),
    expressQuery('startDate').optional().isISO8601(),
    expressQuery('endDate').optional().isISO8601(),
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

    const startDate = req.query.startDate as string || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = req.query.endDate as string || new Date().toISOString();

    try {
      // Get analytics data
      const result = await query(
        `SELECT *
         FROM cafe_analytics
         WHERE cafe_id = $1 AND date >= $2 AND date <= $3
         ORDER BY date ASC`,
        [cafeId, startDate, endDate]
      );

      // Get summary stats
      const summaryResult = await query(
        `SELECT
           SUM(total_messages) as total_messages,
           AVG(unique_users)::int as avg_daily_users,
           SUM(agent_queries) as total_agent_queries,
           SUM(pokes_exchanged) as total_pokes,
           SUM(badges_earned) as total_badges
         FROM cafe_analytics
         WHERE cafe_id = $1 AND date >= $2 AND date <= $3`,
        [cafeId, startDate, endDate]
      );

      // Get hourly distribution
      const hourlyResult = await query(
        `SELECT
           EXTRACT(HOUR FROM created_at) as hour,
           COUNT(*) as message_count
         FROM messages
         WHERE cafe_id = $1 AND created_at >= $2 AND created_at <= $3
         GROUP BY hour
         ORDER BY hour`,
        [cafeId, startDate, endDate]
      );

      res.json({
        analytics: result.rows,
        summary: summaryResult.rows[0],
        hourly_distribution: hourlyResult.rows,
      });
    } catch (error) {
      logger.error('Get analytics error', { error, cafeId });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/admin/analytics/:cafeId/export
router.get(
  '/:cafeId/export',
  [
    param('cafeId').isUUID(),
    expressQuery('startDate').optional().isISO8601(),
    expressQuery('endDate').optional().isISO8601(),
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

    const startDate = req.query.startDate as string || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = req.query.endDate as string || new Date().toISOString();

    try {
      const result = await query(
        `SELECT
           date,
           total_messages,
           unique_users,
           peak_hour,
           agent_queries,
           pokes_exchanged,
           badges_earned
         FROM cafe_analytics
         WHERE cafe_id = $1 AND date >= $2 AND date <= $3
         ORDER BY date ASC`,
        [cafeId, startDate, endDate]
      );

      // Convert to CSV
      const csv = stringify(result.rows, {
        header: true,
        columns: [
          { key: 'date', header: 'Date' },
          { key: 'total_messages', header: 'Total Messages' },
          { key: 'unique_users', header: 'Unique Users' },
          { key: 'peak_hour', header: 'Peak Hour' },
          { key: 'agent_queries', header: 'Agent Queries' },
          { key: 'pokes_exchanged', header: 'Pokes Exchanged' },
          { key: 'badges_earned', header: 'Badges Earned' },
        ],
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="cafe-analytics-${cafeId}-${startDate}-${endDate}.csv"`);
      res.send(csv);
    } catch (error) {
      logger.error('Export analytics error', { error, cafeId });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/admin/analytics/:cafeId/realtime
router.get(
  '/:cafeId/realtime',
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
      // Get real-time stats (last 24 hours)
      const statsResult = await query(
        `SELECT
           COUNT(DISTINCT u.id) as active_users,
           COUNT(m.id) as total_messages,
           COUNT(DISTINCT CASE WHEN m.created_at >= NOW() - INTERVAL '1 hour' THEN m.id END) as messages_last_hour
         FROM users u
         LEFT JOIN messages m ON u.id = m.user_id AND m.created_at >= NOW() - INTERVAL '24 hours'
         WHERE u.cafe_id = $1 AND u.last_seen_at >= NOW() - INTERVAL '24 hours'`,
        [cafeId]
      );

      // Get agent queries count
      const agentResult = await query(
        `SELECT COUNT(*) as agent_queries
         FROM agent_queries
         WHERE cafe_id = $1 AND created_at >= NOW() - INTERVAL '24 hours'`,
        [cafeId]
      );

      // Get flagged messages count (would come from Redis in production)
      const flaggedCount = 0; // Placeholder

      res.json({
        activeUsers: parseInt(statsResult.rows[0].active_users) || 0,
        totalMessages: parseInt(statsResult.rows[0].total_messages) || 0,
        messagesLastHour: parseInt(statsResult.rows[0].messages_last_hour) || 0,
        agentQueries: parseInt(agentResult.rows[0].agent_queries) || 0,
        flaggedMessages: flaggedCount,
      });
    } catch (error) {
      logger.error('Get realtime stats error', { error, cafeId });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
