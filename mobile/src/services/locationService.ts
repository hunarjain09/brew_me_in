/**
 * Location service for React Native
 * Handles geolocation, geofencing, and location permissions
 */

import * as Location from 'expo-location';

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
}

export interface LocationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: Location.PermissionStatus;
}

export class LocationService {
  /**
   * Request location permissions from the user
   */
  static async requestPermissions(): Promise<LocationPermissionStatus> {
    try {
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();

      return {
        granted: status === Location.PermissionStatus.GRANTED,
        canAskAgain,
        status,
      };
    } catch (error) {
      console.error('[LocationService] Error requesting permissions:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: Location.PermissionStatus.DENIED,
      };
    }
  }

  /**
   * Check current location permission status
   */
  static async checkPermissions(): Promise<LocationPermissionStatus> {
    try {
      const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();

      return {
        granted: status === Location.PermissionStatus.GRANTED,
        canAskAgain,
        status,
      };
    } catch (error) {
      console.error('[LocationService] Error checking permissions:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: Location.PermissionStatus.DENIED,
      };
    }
  }

  /**
   * Get current position
   */
  static async getCurrentPosition(): Promise<Coordinates | null> {
    try {
      const permission = await this.checkPermissions();
      if (!permission.granted) {
        console.warn('[LocationService] Location permission not granted');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || undefined,
        altitude: location.coords.altitude || undefined,
        altitudeAccuracy: location.coords.altitudeAccuracy || undefined,
        heading: location.coords.heading || undefined,
        speed: location.coords.speed || undefined,
      };
    } catch (error) {
      console.error('[LocationService] Error getting current position:', error);
      return null;
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   * Returns distance in meters
   */
  static calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = this.toRadians(coord1.latitude);
    const φ2 = this.toRadians(coord2.latitude);
    const Δφ = this.toRadians(coord2.latitude - coord1.latitude);
    const Δλ = this.toRadians(coord2.longitude - coord1.longitude);

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Check if current position is within geofence radius
   */
  static async checkGeofence(
    centerLat: number,
    centerLng: number,
    radiusMeters: number
  ): Promise<{ withinGeofence: boolean; distance: number } | null> {
    try {
      const currentPos = await this.getCurrentPosition();
      if (!currentPos) {
        return null;
      }

      const distance = this.calculateDistance(
        currentPos,
        { latitude: centerLat, longitude: centerLng }
      );

      return {
        withinGeofence: distance <= radiusMeters,
        distance,
      };
    } catch (error) {
      console.error('[LocationService] Error checking geofence:', error);
      return null;
    }
  }

  /**
   * Start watching position changes
   * Returns a subscription object that can be removed
   */
  static async watchPosition(
    callback: (coordinates: Coordinates) => void,
    options?: {
      accuracy?: Location.Accuracy;
      distanceInterval?: number; // Minimum distance (meters) between updates
      timeInterval?: number; // Minimum time (ms) between updates
    }
  ): Promise<Location.LocationSubscription | null> {
    try {
      const permission = await this.checkPermissions();
      if (!permission.granted) {
        console.warn('[LocationService] Location permission not granted');
        return null;
      }

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: options?.accuracy || Location.Accuracy.Balanced,
          distanceInterval: options?.distanceInterval || 10, // Update every 10 meters
          timeInterval: options?.timeInterval || 10000, // Update every 10 seconds
        },
        (location) => {
          callback({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || undefined,
            altitude: location.coords.altitude || undefined,
            altitudeAccuracy: location.coords.altitudeAccuracy || undefined,
            heading: location.coords.heading || undefined,
            speed: location.coords.speed || undefined,
          });
        }
      );

      return subscription;
    } catch (error) {
      console.error('[LocationService] Error watching position:', error);
      return null;
    }
  }

  /**
   * Request background location permissions
   * Required for location tracking when app is in background
   */
  static async requestBackgroundPermissions(): Promise<LocationPermissionStatus> {
    try {
      const { status, canAskAgain } = await Location.requestBackgroundPermissionsAsync();

      return {
        granted: status === Location.PermissionStatus.GRANTED,
        canAskAgain,
        status,
      };
    } catch (error) {
      console.error('[LocationService] Error requesting background permissions:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: Location.PermissionStatus.DENIED,
      };
    }
  }

  /**
   * Convert degrees to radians
   */
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Validate coordinate values
   */
  static isValidCoordinate(coord: Coordinates): boolean {
    return (
      typeof coord.latitude === 'number' &&
      typeof coord.longitude === 'number' &&
      coord.latitude >= -90 &&
      coord.latitude <= 90 &&
      coord.longitude >= -180 &&
      coord.longitude <= 180
    );
  }
}
