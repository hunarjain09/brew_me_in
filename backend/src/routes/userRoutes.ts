import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticate } from '../middleware/auth';
import { enforceWifiConnection } from '../middleware/wifiValidation';
import { validate, schemas } from '../middleware/validation';

const router = Router();

// All user routes require authentication and WiFi connection
router.use(authenticate);
router.use(enforceWifiConnection);

// GET /api/users/me
router.get('/me', UserController.getCurrentUser);

// PUT /api/users/me/interests
router.put(
  '/me/interests',
  validate(schemas.updateInterests),
  UserController.updateInterests
);

// PUT /api/users/me/poke-enabled
router.put(
  '/me/poke-enabled',
  validate(schemas.updatePokeEnabled),
  UserController.updatePokeEnabled
);

export default router;
