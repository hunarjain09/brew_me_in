import { CafeModel } from '../models/Cafe';

export interface NetworkValidationData {
  cafeId: string;
  wifiSsid?: string;
  latitude?: number;
  longitude?: number;
}

export class NetworkValidator {
  /**
   * Validates if the user is physically at the cafe
   * Primary: WiFi SSID matching
   * Fallback: Geofencing (if coordinates provided)
   */
  static async validateUserLocation(data: NetworkValidationData): Promise<{
    valid: boolean;
    method: 'wifi' | 'geofence' | 'none';
    message?: string;
  }> {
    const cafe = await CafeModel.findById(data.cafeId);

    if (!cafe) {
      return {
        valid: false,
        method: 'none',
        message: 'Cafe not found',
      };
    }

    // Primary validation: WiFi SSID
    if (data.wifiSsid) {
      if (data.wifiSsid === cafe.wifiSsid) {
        return {
          valid: true,
          method: 'wifi',
        };
      } else {
        // WiFi provided but doesn't match
        return {
          valid: false,
          method: 'wifi',
          message: 'WiFi network does not match cafe network',
        };
      }
    }

    // Fallback validation: Geofencing
    if (
      data.latitude !== undefined &&
      data.longitude !== undefined &&
      cafe.latitude !== undefined &&
      cafe.longitude !== undefined
    ) {
      const distance = this.calculateDistance(
        data.latitude,
        data.longitude,
        cafe.latitude,
        cafe.longitude
      );

      const radiusMeters = cafe.geofenceRadius || 100;

      if (distance <= radiusMeters) {
        return {
          valid: true,
          method: 'geofence',
        };
      } else {
        return {
          valid: false,
          method: 'geofence',
          message: `You are ${Math.round(distance)}m away from the cafe (max ${radiusMeters}m)`,
        };
      }
    }

    // No validation method available
    return {
      valid: false,
      method: 'none',
      message: 'No location validation method available (WiFi SSID or GPS required)',
    };
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * Returns distance in meters
   */
  private static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}
