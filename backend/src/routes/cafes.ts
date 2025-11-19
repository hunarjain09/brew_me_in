import { Router, Request, Response } from 'express';
import { param, body, validationResult } from 'express-validator';
import { query } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import logger from '../utils/logger';

const router = Router();

router.use(authenticateToken);

// GET /api/admin/cafes/:cafeId/settings
router.get(
  '/:cafeId/settings',
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
        'SELECT * FROM cafes WHERE id = $1',
        [cafeId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Cafe not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      logger.error('Get cafe settings error', { error, cafeId });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PUT /api/admin/cafes/:cafeId/settings
router.put(
  '/:cafeId/settings',
  [
    param('cafeId').isUUID(),
    body('wifi_ssid').optional().isString().trim().notEmpty(),
    body('latitude').optional().isFloat({ min: -90, max: 90 }),
    body('longitude').optional().isFloat({ min: -180, max: 180 }),
    body('geofence_radius').optional().isInt({ min: 10, max: 10000 }),
    body('operating_hours').optional().isObject(),
    body('name').optional().isString().trim().notEmpty(),
    body('description').optional().isString(),
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

    const { wifi_ssid, latitude, longitude, geofence_radius, operating_hours, name, description } = req.body;

    try {
      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (wifi_ssid !== undefined) {
        updates.push(`wifi_ssid = $${paramIndex++}`);
        values.push(wifi_ssid);
      }
      if (latitude !== undefined) {
        updates.push(`latitude = $${paramIndex++}`);
        values.push(latitude);
      }
      if (longitude !== undefined) {
        updates.push(`longitude = $${paramIndex++}`);
        values.push(longitude);
      }
      if (geofence_radius !== undefined) {
        updates.push(`geofence_radius = $${paramIndex++}`);
        values.push(geofence_radius);
      }
      if (operating_hours !== undefined) {
        updates.push(`operating_hours = $${paramIndex++}`);
        values.push(JSON.stringify(operating_hours));
      }
      if (name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(name);
      }
      if (description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(description);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      updates.push(`updated_at = NOW()`);
      values.push(cafeId);

      const result = await query(
        `UPDATE cafes SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      logger.info('Cafe settings updated', { cafeId, moderatorId: moderator.moderatorId });

      res.json(result.rows[0]);
    } catch (error: any) {
      logger.error('Update cafe settings error', { error, cafeId });

      if (error.code === '23505') { // Unique violation
        return res.status(409).json({ error: 'WiFi SSID already in use by another cafe' });
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
