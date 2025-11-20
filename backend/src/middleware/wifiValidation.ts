import { Request, Response, NextFunction } from 'express';
import { NetworkValidator } from '../utils/networkValidation';
import { AuthRequest } from './auth';

/**
 * Middleware to enforce WiFi connectivity validation
 * Ensures users are connected to the cafe's WiFi network on every request
 *
 * This middleware should be applied AFTER authentication middleware,
 * as it requires the user's cafeId from the JWT token.
 *
 * Expected headers:
 * - x-wifi-ssid: The WiFi SSID the user is connected to (primary method)
 * - x-latitude: User's GPS latitude (fallback method)
 * - x-longitude: User's GPS longitude (fallback method)
 */
export const enforceWifiConnection = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Ensure user is authenticated first
    if (!req.user || !req.user.cafeId) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource'
      });
      return;
    }

    // Extract location data from headers
    const wifiSsid = req.headers['x-wifi-ssid'] as string | undefined;
    const latitudeHeader = req.headers['x-latitude'] as string | undefined;
    const longitudeHeader = req.headers['x-longitude'] as string | undefined;

    // Parse GPS coordinates if provided
    const latitude = latitudeHeader ? parseFloat(latitudeHeader) : undefined;
    const longitude = longitudeHeader ? parseFloat(longitudeHeader) : undefined;

    // Validate the user's location
    const validation = await NetworkValidator.validateUserLocation({
      cafeId: req.user.cafeId,
      wifiSsid,
      latitude,
      longitude,
    });

    if (!validation.valid) {
      res.status(403).json({
        error: 'Location validation failed',
        message: validation.message || 'You must be connected to the cafe WiFi to access this feature',
        method: validation.method,
        details: {
          required: 'You must be physically present at the cafe',
          hint: 'Please connect to the cafe WiFi network or ensure location services are enabled',
        },
      });
      return;
    }

    // Validation successful - attach validation method to request for logging
    (req as any).locationValidation = {
      method: validation.method,
      validatedAt: new Date().toISOString(),
    };

    next();
  } catch (error) {
    console.error('WiFi validation error:', error);
    res.status(500).json({
      error: 'Location validation error',
      message: 'Failed to validate your location. Please try again.'
    });
    return;
  }
};

/**
 * Optional: Middleware for endpoints that can work without strict WiFi validation
 * This is useful for read-only endpoints or for gradual rollout
 */
export const optionalWifiValidation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.cafeId) {
      next();
      return;
    }

    const wifiSsid = req.headers['x-wifi-ssid'] as string | undefined;
    const latitudeHeader = req.headers['x-latitude'] as string | undefined;
    const longitudeHeader = req.headers['x-longitude'] as string | undefined;

    if (wifiSsid || (latitudeHeader && longitudeHeader)) {
      const latitude = latitudeHeader ? parseFloat(latitudeHeader) : undefined;
      const longitude = longitudeHeader ? parseFloat(longitudeHeader) : undefined;

      const validation = await NetworkValidator.validateUserLocation({
        cafeId: req.user.cafeId,
        wifiSsid,
        latitude,
        longitude,
      });

      (req as any).wifiValidated = validation.valid;
      (req as any).locationValidation = {
        method: validation.method,
        valid: validation.valid,
      };
    }

    next();
  } catch (error) {
    // Don't block request on validation errors for optional validation
    console.error('Optional WiFi validation error:', error);
    next();
  }
};
