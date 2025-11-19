import { Request, Response } from 'express';
import { LocationService } from '../services/locationService';
import {
  LocationValidationRequest,
  PresenceUpdateRequest,
  NearbyCafeQuery,
} from '../types';

const locationService = new LocationService();

/**
 * POST /api/location/validate
 * Validate if user has access to a cafe
 */
export const validateLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { cafeId, ssid, coordinates } = req.body;
    const userId = req.body.userId || (req as any).user?.id; // Assuming auth middleware sets req.user

    if (!cafeId) {
      res.status(400).json({
        success: false,
        error: {
          message: 'cafeId is required',
          code: 'MISSING_CAFE_ID',
        },
      });
      return;
    }

    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          message: 'User authentication required',
          code: 'UNAUTHORIZED',
        },
      });
      return;
    }

    const validationRequest: LocationValidationRequest = {
      cafeId,
      ssid,
      coordinates,
      userId,
    };

    const result = await locationService.validateCafeAccess(validationRequest);

    res.status(200).json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date(),
        version: 'v1',
      },
    });
  } catch (error) {
    console.error('Error validating location:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
};

/**
 * PUT /api/location/update
 * Update user presence status
 */
export const updatePresence = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, cafeId, inCafe, ssid, coordinates } = req.body;
    const authenticatedUserId = (req as any).user?.id;

    // Ensure user can only update their own presence
    if (userId !== authenticatedUserId) {
      res.status(403).json({
        success: false,
        error: {
          message: 'Cannot update presence for another user',
          code: 'FORBIDDEN',
        },
      });
      return;
    }

    if (!userId || !cafeId || typeof inCafe !== 'boolean') {
      res.status(400).json({
        success: false,
        error: {
          message: 'userId, cafeId, and inCafe are required',
          code: 'MISSING_REQUIRED_FIELDS',
        },
      });
      return;
    }

    const updateRequest: PresenceUpdateRequest = {
      userId,
      cafeId,
      inCafe,
      ssid,
      coordinates,
    };

    const result = await locationService.updateUserPresence(updateRequest);

    res.status(200).json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date(),
        version: 'v1',
      },
    });
  } catch (error) {
    console.error('Error updating presence:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
};

/**
 * GET /api/cafes/:cafeId/nearby
 * Get nearby cafes based on user's location
 */
export const getNearbyCafes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { lat, lng } = req.query;
    const radiusMeters = req.query.radiusMeters
      ? parseInt(req.query.radiusMeters as string, 10)
      : 5000;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    if (!lat || !lng) {
      res.status(400).json({
        success: false,
        error: {
          message: 'lat and lng query parameters are required',
          code: 'MISSING_COORDINATES',
        },
      });
      return;
    }

    const query: NearbyCafeQuery = {
      lat: parseFloat(lat as string),
      lng: parseFloat(lng as string),
      radiusMeters,
      limit,
    };

    const cafes = await locationService.getNearbyCafes(query);

    res.status(200).json({
      success: true,
      data: cafes,
      meta: {
        timestamp: new Date(),
        version: 'v1',
        count: cafes.length,
      },
    });
  } catch (error) {
    console.error('Error getting nearby cafes:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
};

/**
 * GET /api/location/presence/:userId
 * Get user's current presence status
 */
export const getUserPresence = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: {
          message: 'userId is required',
          code: 'MISSING_USER_ID',
        },
      });
      return;
    }

    const presence = await locationService.getUserPresence(userId);

    if (!presence) {
      res.status(404).json({
        success: false,
        error: {
          message: 'User presence not found',
          code: 'NOT_FOUND',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: presence,
      meta: {
        timestamp: new Date(),
        version: 'v1',
      },
    });
  } catch (error) {
    console.error('Error getting user presence:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
};

/**
 * GET /api/cafes/:cafeId/users
 * Get all users currently in a cafe
 */
export const getUsersInCafe = async (req: Request, res: Response): Promise<void> => {
  try {
    const { cafeId } = req.params;

    if (!cafeId) {
      res.status(400).json({
        success: false,
        error: {
          message: 'cafeId is required',
          code: 'MISSING_CAFE_ID',
        },
      });
      return;
    }

    const users = await locationService.getUsersInCafe(cafeId);

    res.status(200).json({
      success: true,
      data: users,
      meta: {
        timestamp: new Date(),
        version: 'v1',
        count: users.length,
      },
    });
  } catch (error) {
    console.error('Error getting users in cafe:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
};

/**
 * POST /api/cafes/:cafeId/geofence/check
 * Check if coordinates are within cafe geofence
 */
export const checkGeofence = async (req: Request, res: Response): Promise<void> => {
  try {
    const { cafeId } = req.params;
    const { latitude, longitude } = req.body;

    if (!cafeId || !latitude || !longitude) {
      res.status(400).json({
        success: false,
        error: {
          message: 'cafeId, latitude, and longitude are required',
          code: 'MISSING_REQUIRED_FIELDS',
        },
      });
      return;
    }

    const result = await locationService.checkGeofence(cafeId, latitude, longitude);

    res.status(200).json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date(),
        version: 'v1',
      },
    });
  } catch (error) {
    console.error('Error checking geofence:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
};
