import { Router } from 'express';
import {
  validateLocation,
  updatePresence,
  getNearbyCafes,
  getUserPresence,
  getUsersInCafe,
} from '../controllers/locationController';
import { authenticate } from '../middleware/auth';
import { enforceWifiConnection } from '../middleware/wifiValidation';

const router = Router();

/**
 * Location validation and presence management routes
 */

// POST /api/location/validate - Validate cafe access
router.post('/validate', authenticate, enforceWifiConnection, validateLocation);

// PUT /api/location/update - Update user presence
router.put('/update', authenticate, enforceWifiConnection, updatePresence);

// GET /api/location/presence/:userId - Get user presence
router.get('/presence/:userId', getUserPresence);

// GET /api/location/cafes/nearby - Get nearby cafes
router.get('/cafes/nearby', getNearbyCafes);

// GET /api/location/cafes/:cafeId/users - Get users in cafe
router.get('/cafes/:cafeId/users', getUsersInCafe);

export default router;
