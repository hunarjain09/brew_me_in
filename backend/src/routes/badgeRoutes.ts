import { Router } from 'express';
import { BadgeController } from '../controllers/badgeController';
import { authenticate } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';
import { tipRateLimiter } from '../middleware/rateLimit';

const router = Router();

// POST /api/badges/record-tip
router.post(
  '/record-tip',
  tipRateLimiter,
  validate(schemas.recordTip),
  BadgeController.recordTip
);

// GET /api/badges/status
router.get('/status', authenticate, BadgeController.getBadgeStatus);

export default router;
