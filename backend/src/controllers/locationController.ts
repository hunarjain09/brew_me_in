import { Request, Response } from 'express';
import { Location } from '../models/Location';
import type {
  LocationValidationRequest,
  PresenceUpdateRequest,
} from '../types';

/**
 * POST /api/location/validate
 * Validate if user has access to a cafe
 */
export const validateLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { cafeId, ssid, coordinates } = req.body;
    const userId = (req as any).user?.userId; // From auth middleware

    if (!cafeId) {
      res.status(400).json({
        error: 'cafeId is required',
      });
      return;
    }

    if (!userId) {
      res.status(401).json({
        error: 'User authentication required',
      });
      return;
    }

    const validationRequest: LocationValidationRequest = {
      cafeId,
      ssid,
      coordinates,
      userId,
    };

    const result = await Location.validateCafeAccess(validationRequest);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error validating location:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
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
    const authenticatedUserId = (req as any).user?.userId;

    // Ensure user can only update their own presence
    if (userId !== authenticatedUserId) {
      res.status(403).json({
        error: 'Cannot update presence for another user',
      });
      return;
    }

    if (!userId || !cafeId || typeof inCafe !== 'boolean') {
      res.status(400).json({
        error: 'userId, cafeId, and inCafe are required',
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

    const result = await Location.updateUserPresence(updateRequest);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error updating presence:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * GET /api/location/cafes/nearby
 * Get nearby cafes based on user's location
 */
export const getNearbyCafes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { lat, lng, radiusMeters, limit } = req.query;

    if (!lat || !lng) {
      res.status(400).json({
        error: 'lat and lng query parameters are required',
      });
      return;
    }

    const radius = radiusMeters ? parseInt(radiusMeters as string, 10) : 5000;
    const resultLimit = limit ? parseInt(limit as string, 10) : 20;

    const cafes = await Location.getNearbyCafes(
      parseFloat(lat as string),
      parseFloat(lng as string),
      radius,
      resultLimit
    );

    res.status(200).json({
      success: true,
      data: cafes,
      count: cafes.length,
    });
  } catch (error) {
    console.error('Error getting nearby cafes:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
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
        error: 'userId is required',
      });
      return;
    }

    const presence = await Location.getUserPresence(userId);

    if (!presence) {
      res.status(404).json({
        error: 'User presence not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: presence,
    });
  } catch (error) {
    console.error('Error getting user presence:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * GET /api/location/cafes/:cafeId/users
 * Get all users currently in a cafe
 */
export const getUsersInCafe = async (req: Request, res: Response): Promise<void> => {
  try {
    const { cafeId } = req.params;

    if (!cafeId) {
      res.status(400).json({
        error: 'cafeId is required',
      });
      return;
    }

    const users = await Location.getUsersInCafe(cafeId);

    res.status(200).json({
      success: true,
      data: users,
      count: users.length,
    });
  } catch (error) {
    console.error('Error getting users in cafe:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
