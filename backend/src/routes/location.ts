import { Router } from 'express';
import {
  validateLocation,
  updatePresence,
  getNearbyCafes,
  getUserPresence,
  getUsersInCafe,
  checkGeofence,
} from '../controllers/locationController';

const router = Router();

/**
 * Location validation and presence management routes
 */

// POST /api/location/validate
// Validate if user has access to a cafe based on WiFi SSID or geofencing
router.post('/validate', validateLocation);

// PUT /api/location/update
// Update user's presence status
router.put('/update', updatePresence);

// GET /api/location/presence/:userId
// Get user's current presence status
router.get('/presence/:userId', getUserPresence);

// GET /api/cafes/:cafeId/nearby
// Get nearby cafes based on coordinates
router.get('/cafes/nearby', getNearbyCafes);

// GET /api/cafes/:cafeId/users
// Get all users currently in a specific cafe
router.get('/cafes/:cafeId/users', getUsersInCafe);

// POST /api/cafes/:cafeId/geofence/check
// Check if coordinates are within cafe geofence
router.post('/cafes/:cafeId/geofence/check', checkGeofence);

export default router;
