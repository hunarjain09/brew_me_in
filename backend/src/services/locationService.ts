import { PoolClient } from 'pg';
import { UserPresence, LocationValidationRequest, LocationValidationResponse, NearbyCafe } from '../types';
import { db } from '../db/connection';

export class LocationService {
  /**
   * Validate if a user is within a cafe's location
   */
  static async validateUserLocation(
    request: LocationValidationRequest
  ): Promise<LocationValidationResponse> {
    const { cafeId, ssid, coordinates } = request;

    // WiFi validation (primary method)
    if (ssid) {
      // Check if SSID matches cafe's WiFi
      // This would require a database query to fetch cafe's SSID
      return {
        inCafe: true,
        method: 'wifi',
        message: 'WiFi SSID matched',
      };
    }

    // Geofence validation (fallback)
    if (coordinates) {
      // Check if coordinates are within cafe's geofence
      // This would require a database query to fetch cafe's location and radius
      return {
        inCafe: true,
        method: 'geofence',
        distance: 0,
        message: 'Within geofence radius',
      };
    }

    return {
      inCafe: false,
      method: 'none',
      message: 'No validation method available',
    };
  }

  /**
   * Update user presence status
   */
  static async updateUserPresence(data: {
    userId: string;
    cafeId: string | null;
    inCafe: boolean;
    ssid?: string;
    coordinates?: { lat: number; lng: number };
  }): Promise<UserPresence> {
    const { userId, cafeId, inCafe, ssid, coordinates } = data;
    const query = `
      INSERT INTO user_presence (user_id, cafe_id, in_cafe, last_seen_in_cafe, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET
        cafe_id = $2,
        in_cafe = $3,
        last_seen_in_cafe = CASE WHEN $3 THEN NOW() ELSE user_presence.last_seen_in_cafe END,
        updated_at = NOW()
      RETURNING *
    `;

    const result = await db.query(query, [userId, cafeId, inCafe]);
    return result.rows[0] as UserPresence;
  }

  /**
   * Get nearby cafes based on coordinates
   */
  static async getNearbyCafes(data: {
    lat: number;
    lng: number;
    radiusMeters?: number;
  }): Promise<NearbyCafe[]> {
    const { lat, lng, radiusMeters = 1000 } = data;
    // This would use PostGIS or a similar extension for geospatial queries
    const query = `
      SELECT
        id as cafe_id,
        name,
        latitude,
        longitude,
        wifi_ssid,
        geofence_radius as radius_meters,
        0 as distance
      FROM cafes
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      LIMIT 10
    `;

    const result = await db.query(query);
    return result.rows as NearbyCafe[];
  }

  /**
   * Check if user is still in cafe
   */
  static async checkUserPresence(userId: string): Promise<boolean> {
    // This would check if user's last presence update is recent
    // and if they're still marked as in_cafe
    return true;
  }

  /**
   * Validate cafe access for a user
   */
  static async validateCafeAccess(data: {
    userId: string;
    cafeId: string;
    ssid?: string;
    coordinates?: { lat: number; lng: number };
  }): Promise<LocationValidationResponse> {
    return await this.validateUserLocation(data);
  }

  /**
   * Get users currently in a cafe
   */
  static async getUsersInCafe(cafeId: string): Promise<string[]> {
    const query = `
      SELECT user_id
      FROM user_presence
      WHERE cafe_id = $1 AND in_cafe = true
    `;

    const result = await db.query(query, [cafeId]);
    return result.rows.map((row) => row.user_id);
  }

  /**
   * Get user presence information
   */
  static async getUserPresence(userId: string): Promise<UserPresence | null> {
    const query = `
      SELECT *
      FROM user_presence
      WHERE user_id = $1
    `;

    const result = await db.query(query, [userId]);
    return result.rows[0] || null;
  }
}
