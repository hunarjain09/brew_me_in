import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { validate, schemas } from '../middleware/validation';
import { authRateLimiter, usernameGenerationRateLimiter } from '../middleware/rateLimit';

const router = Router();

// POST /api/auth/barista/generate-username
router.post(
  '/barista/generate-username',
  usernameGenerationRateLimiter,
  validate(schemas.generateUsername),
  AuthController.generateUsername
);

// POST /api/auth/join
router.post(
  '/join',
  authRateLimiter,
  validate(schemas.joinCafe),
  AuthController.joinCafe
);

// POST /api/auth/refresh
router.post(
  '/refresh',
  authRateLimiter,
  validate(schemas.refreshToken),
  AuthController.refreshToken
);

export default router;
