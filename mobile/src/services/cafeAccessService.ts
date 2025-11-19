/**
 * Cafe Access Service - Combines network and location validation
 * This is the main service for validating cafe access from the mobile app
 */

import { NetworkService } from './networkService';
import { LocationService, Coordinates } from './locationService';

export interface CafeLocation {
  cafeId: string;
  wifiSSID: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface CafeAccessResult {
  hasAccess: boolean;
  method: 'wifi' | 'geofence' | 'none';
  distance?: number;
  ssid?: string;
  message: string;
}

export class CafeAccessService {
  /**
   * Validate access to a cafe using both WiFi SSID and geofencing
   * Primary method: WiFi SSID match
   * Fallback method: Geofence check
   */
  static async validateCafeAccess(cafe: CafeLocation): Promise<CafeAccessResult> {
    try {
      // Step 1: Try WiFi SSID validation (primary method)
      const ssid = await NetworkService.getCurrentSSID();
      if (ssid && ssid.toLowerCase().trim() === cafe.wifiSSID.toLowerCase().trim()) {
        return {
          hasAccess: true,
          method: 'wifi',
          ssid,
          message: 'Access granted via WiFi SSID',
        };
      }

      // Step 2: Fallback to geofence validation
      const geofenceResult = await LocationService.checkGeofence(
        cafe.latitude,
        cafe.longitude,
        cafe.radiusMeters
      );

      if (geofenceResult) {
        if (geofenceResult.withinGeofence) {
          return {
            hasAccess: true,
            method: 'geofence',
            distance: geofenceResult.distance,
            message: `Access granted via geofence (${Math.round(geofenceResult.distance)}m from cafe)`,
          };
        } else {
          return {
            hasAccess: false,
            method: 'geofence',
            distance: geofenceResult.distance,
            message: `Outside cafe radius (${Math.round(geofenceResult.distance)}m away)`,
          };
        }
      }

      // Step 3: No validation method succeeded
      return {
        hasAccess: false,
        method: 'none',
        message: ssid
          ? 'WiFi SSID does not match and location unavailable'
          : 'Neither WiFi SSID nor location available',
      };
    } catch (error) {
      console.error('[CafeAccessService] Error validating cafe access:', error);
      return {
        hasAccess: false,
        method: 'none',
        message: 'Error validating access',
      };
    }
  }

  /**
   * Get current location and network data for validation request
   */
  static async getValidationData(): Promise<{
    ssid?: string;
    coordinates?: { lat: number; lng: number };
  }> {
    try {
      const [ssid, location] = await Promise.all([
        NetworkService.getCurrentSSID(),
        LocationService.getCurrentPosition(),
      ]);

      return {
        ssid: ssid || undefined,
        coordinates: location
          ? { lat: location.latitude, lng: location.longitude }
          : undefined,
      };
    } catch (error) {
      console.error('[CafeAccessService] Error getting validation data:', error);
      return {};
    }
  }

  /**
   * Check if all required permissions are granted
   */
  static async checkPermissions(): Promise<{
    location: boolean;
    locationMessage: string;
  }> {
    const locationPermission = await LocationService.checkPermissions();

    return {
      location: locationPermission.granted,
      locationMessage: locationPermission.granted
        ? 'Location permission granted'
        : 'Location permission required for geofencing',
    };
  }

  /**
   * Request all required permissions
   */
  static async requestPermissions(): Promise<{
    location: boolean;
    locationMessage: string;
  }> {
    const locationPermission = await LocationService.requestPermissions();

    return {
      location: locationPermission.granted,
      locationMessage: locationPermission.granted
        ? 'Location permission granted'
        : locationPermission.canAskAgain
        ? 'Location permission denied'
        : 'Location permission permanently denied. Please enable in settings.',
    };
  }

  /**
   * Start continuous monitoring of cafe access
   * Useful for real-time presence updates
   */
  static async startMonitoring(
    cafe: CafeLocation,
    onAccessChange: (result: CafeAccessResult) => void,
    intervalMs: number = 30000 // Check every 30 seconds
  ): Promise<{ stop: () => void }> {
    let lastAccessState: boolean | null = null;

    // Initial check
    const initialResult = await this.validateCafeAccess(cafe);
    lastAccessState = initialResult.hasAccess;
    onAccessChange(initialResult);

    // Set up periodic checks
    const intervalId = setInterval(async () => {
      const result = await this.validateCafeAccess(cafe);

      // Only trigger callback if access state changed
      if (result.hasAccess !== lastAccessState) {
        lastAccessState = result.hasAccess;
        onAccessChange(result);
      }
    }, intervalMs);

    // Also monitor network changes for faster WiFi-based detection
    const networkUnsubscribe = NetworkService.subscribeToNetworkChanges(async () => {
      const result = await this.validateCafeAccess(cafe);

      if (result.hasAccess !== lastAccessState) {
        lastAccessState = result.hasAccess;
        onAccessChange(result);
      }
    });

    return {
      stop: () => {
        clearInterval(intervalId);
        networkUnsubscribe();
      },
    };
  }
}
