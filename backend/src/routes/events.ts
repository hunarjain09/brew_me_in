import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { query } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import logger from '../utils/logger';

const router = Router();

router.use(authenticateToken);

// POST /api/admin/events/:cafeId
router.post(
  '/:cafeId',
  [
    param('cafeId').isUUID(),
    body('name').isString().isLength({ min: 1, max: 255 }),
    body('description').optional().isString(),
    body('event_date').isISO8601(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { cafeId } = req.params;
    const { name, description, event_date } = req.body;
    const moderator = req.moderator!;

    if (moderator.cafeId !== cafeId) {
      return res.status(403).json({ error: 'Access denied to this cafe' });
    }

    try {
      const result = await query(
        `INSERT INTO cafe_events (cafe_id, name, description, event_date, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [cafeId, name, description || null, event_date, moderator.moderatorId]
      );

      logger.info('Event created', { cafeId, eventId: result.rows[0].id });

      res.status(201).json({ event: result.rows[0] });
    } catch (error) {
      logger.error('Create event error', { error, cafeId });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/admin/events/:cafeId
router.get(
  '/:cafeId',
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
        `SELECT e.*,
                m.email as created_by_email
         FROM cafe_events e
         LEFT JOIN moderators m ON e.created_by = m.id
         WHERE e.cafe_id = $1
         ORDER BY e.event_date ASC`,
        [cafeId]
      );

      res.json({ events: result.rows });
    } catch (error) {
      logger.error('Get events error', { error, cafeId });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// DELETE /api/admin/events/:eventId
router.delete(
  '/:eventId',
  [param('eventId').isUUID()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { eventId } = req.params;
    const moderator = req.moderator!;

    try {
      const result = await query(
        'DELETE FROM cafe_events WHERE id = $1 AND cafe_id = $2 RETURNING *',
        [eventId, moderator.cafeId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Event not found' });
      }

      logger.info('Event deleted', { eventId });

      res.json({ success: true, message: 'Event deleted successfully' });
    } catch (error) {
      logger.error('Delete event error', { error, eventId });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
