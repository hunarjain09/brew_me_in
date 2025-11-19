import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database';
import { generateToken } from '../middleware/auth';
import { LoginRequest, LoginResponse } from '../types';
import logger from '../utils/logger';

const router = Router();

// POST /api/admin/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password }: LoginRequest = req.body;

    try {
      // Find moderator by email
      const result = await query(
        `SELECT m.*, c.name as cafe_name, c.id as cafe_id, c.location, c.description
         FROM moderators m
         JOIN cafes c ON m.cafe_id = c.id
         WHERE m.email = $1`,
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const moderator = result.rows[0];

      // Verify password
      const isValidPassword = await bcrypt.compare(password, moderator.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = generateToken({
        moderatorId: moderator.id,
        cafeId: moderator.cafe_id,
        role: moderator.role,
        email: moderator.email,
      });

      // Prepare response
      const response: LoginResponse = {
        token,
        moderator: {
          id: moderator.id,
          cafe_id: moderator.cafe_id,
          email: moderator.email,
          role: moderator.role,
          permissions: moderator.permissions,
          created_at: moderator.created_at,
          updated_at: moderator.updated_at,
        },
        cafe: {
          id: moderator.cafe_id,
          name: moderator.cafe_name,
          location: moderator.location,
          description: moderator.description,
          created_at: moderator.created_at,
          updated_at: moderator.updated_at,
        },
      };

      logger.info('Moderator logged in', { moderatorId: moderator.id, email });

      res.json(response);
    } catch (error) {
      logger.error('Login error', { error, email });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/admin/auth/register (for creating new moderators)
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('cafeId').isUUID(),
    body('role').isIn(['owner', 'moderator']),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, cafeId, role } = req.body;

    try {
      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Insert moderator
      const result = await query(
        `INSERT INTO moderators (cafe_id, email, password_hash, role, permissions)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, cafe_id, email, role, permissions, created_at, updated_at`,
        [cafeId, email, passwordHash, role, role === 'owner' ? ['all'] : []]
      );

      const moderator = result.rows[0];

      logger.info('New moderator registered', { moderatorId: moderator.id, email });

      res.status(201).json({ moderator });
    } catch (error: any) {
      if (error.code === '23505') {
        // Unique violation
        return res.status(409).json({ error: 'Email already exists' });
      }

      logger.error('Registration error', { error, email });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
