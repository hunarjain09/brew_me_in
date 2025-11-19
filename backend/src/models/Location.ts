import { db } from '../db/connection';
import { calculateDistance, isWithinGeofence, getBoundingBox } from '../utils/geolocation';
import type {
  LocationValidationRequest,
  LocationValidationResponse,
  PresenceUpdateRequest,
  UserPresence,
  NearbyCafe,
  AccessLog,
  Cafe,
} from '../types';
import { v4 as uuidv4 } from 'uuid';

export class Location {
  /**
   * Validate if user has access to a cafe based on WiFi SSID or geofencing
   * Primary method: WiFi SSID match
   * Fallback method: Geofence check
   */
  static async validateCafeAccess(
    request: LocationValidationRequest
  ): Promise<LocationValidationResponse> {
    const { cafeId, ssid, coordinates, userId } = request;

    // Get cafe location details
    const cafeResult = await db.query(
      'SELECT * FROM cafes WHERE id = $1',
      [cafeId]
    );

    if (cafeResult.rows.length === 0) {
      await this.logAccess(userId, cafeId, 'wifi', false, null, null, true, 'Cafe not found');
      return {
        inCafe: false,
        method: 'none',
        message: 'Cafe location not configured',
      };
    }

    const cafe = cafeResult.rows[0];

    // Primary validation: WiFi SSID match
    if (ssid && cafe.wifiSsid && ssid.trim().toLowerCase() === cafe.wifiSsid.trim().toLowerCase()) {
      await this.logAccess(userId, cafeId, 'wifi', true, ssid, null, false);
      return {
        inCafe: true,
        method: 'wifi',
        message: 'Access granted via WiFi SSID',
      };
    }

    // Fallback validation: Geofence check
    if (coordinates && cafe.latitude && cafe.longitude && cafe.geofenceRadius) {
      const distance = calculateDistance(
        { latitude: coordinates.lat, longitude: coordinates.lng },
        { latitude: Number(cafe.latitude), longitude: Number(cafe.longitude) }
      );

      const withinGeofence = distance <= cafe.geofenceRadius;

      await this.logAccess(
        userId,
        cafeId,
        'geofence',
        withinGeofence,
        null,
        distance,
        false
      );

      if (withinGeofence) {
        return {
          inCafe: true,
          method: 'geofence',
          distance,
          message: 'Access granted via geofence',
        };
      }

      return {
        inCafe: false,
        method: 'geofence',
        distance,
        message: `Outside geofence radius (${distance.toFixed(0)}m away)`,
      };
    }

    // No validation method available
    await this.logAccess(userId, cafeId, 'wifi', false, null, null, true, 'No validation method');
    return {
      inCafe: false,
      method: 'none',
      message: 'No WiFi SSID or coordinates provided',
    };
  }

  /**
   * Update user presence status
   */
  static async updateUserPresence(
    request: PresenceUpdateRequest
  ): Promise<{ success: boolean; userPresence: UserPresence; previousState?: boolean }> {
    const { userId, cafeId, inCafe, ssid, coordinates } = request;

    // Check if presence record exists
    const existingResult = await db.query(
      'SELECT * FROM user_presence WHERE user_id = $1',
      [userId]
    );

    const previousState = existingResult.rows[0]?.inCafe;

    if (existingResult.rows.length === 0) {
      // Insert new presence record
      const result = await db.query(
        `INSERT INTO user_presence
         (user_id, cafe_id, in_cafe, last_seen_in_cafe, current_ssid, last_latitude, last_longitude, validation_method)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          userId,
          inCafe ? cafeId : null,
          inCafe,
          inCafe ? new Date() : null,
          ssid || null,
          coordinates?.lat || null,
          coordinates?.lng || null,
          ssid ? 'wifi' : coordinates ? 'geofence' : null,
        ]
      );

      return {
        success: true,
        userPresence: result.rows[0],
        previousState,
      };
    } else {
      // Update existing presence record
      const result = await db.query(
        `UPDATE user_presence
         SET cafe_id = $1,
             in_cafe = $2,
             last_seen_in_cafe = $3,
             current_ssid = $4,
             last_latitude = $5,
             last_longitude = $6,
             validation_method = $7,
             updated_at = NOW()
         WHERE user_id = $8
         RETURNING *`,
        [
          inCafe ? cafeId : null,
          inCafe,
          inCafe ? new Date() : existingResult.rows[0].lastSeenInCafe,
          ssid || null,
          coordinates?.lat || null,
          coordinates?.lng || null,
          ssid ? 'wifi' : coordinates ? 'geofence' : null,
          userId,
        ]
      );

      return {
        success: true,
        userPresence: result.rows[0],
        previousState,
      };
    }
  }

  /**
   * Get nearby cafes based on user's current location
   */
  static async getNearbyCafes(
    lat: number,
    lng: number,
    radiusMeters: number = 5000,
    limit: number = 20
  ): Promise<NearbyCafe[]> {
    // Get bounding box for efficient query
    const bbox = getBoundingBox({ latitude: lat, longitude: lng }, radiusMeters);

    // Query cafes within bounding box
    const result = await db.query(
      `SELECT * FROM cafes
       WHERE latitude BETWEEN $1 AND $2
         AND longitude BETWEEN $3 AND $4
         AND latitude IS NOT NULL
         AND longitude IS NOT NULL`,
      [bbox.minLat, bbox.maxLat, bbox.minLng, bbox.maxLng]
    );

    // Calculate distances and filter by actual radius
    const nearbyCafes = result.rows
      .map((cafe) => {
        const distance = calculateDistance(
          { latitude: lat, longitude: lng },
          { latitude: Number(cafe.latitude!), longitude: Number(cafe.longitude!) }
        );

        return {
          cafeId: cafe.id,
          name: cafe.name,
          distance,
          latitude: Number(cafe.latitude!),
          longitude: Number(cafe.longitude!),
          wifiSSID: cafe.wifiSsid,
          radiusMeters: cafe.geofenceRadius || 100,
        };
      })
      .filter((cafe) => cafe.distance <= radiusMeters)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);

    return nearbyCafes;
  }

  /**
   * Get all users currently in a specific cafe
   */
  static async getUsersInCafe(cafeId: string): Promise<UserPresence[]> {
    const result = await db.query(
      `SELECT * FROM user_presence
       WHERE cafe_id = $1 AND in_cafe = true
       ORDER BY last_seen_in_cafe DESC`,
      [cafeId]
    );

    return result.rows;
  }

  /**
   * Get user's current presence status
   */
  static async getUserPresence(userId: string): Promise<UserPresence | null> {
    const result = await db.query(
      'SELECT * FROM user_presence WHERE user_id = $1',
      [userId]
    );

    return result.rows[0] || null;
  }

  /**
   * Detect suspicious access patterns
   */
  static async detectSuspiciousActivity(userId: string, cafeId: string): Promise<boolean> {
    // Get recent access logs for this user
    const result = await db.query(
      `SELECT * FROM access_logs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [userId]
    );

    const recentLogs = result.rows;

    // Check for rapid location changes (different cafes in short time)
    if (recentLogs.length >= 2) {
      const lastLog = recentLogs[0];
      const prevLog = recentLogs[1];

      if (lastLog.cafeId !== prevLog.cafeId) {
        const timeDiff = lastLog.createdAt.getTime() - prevLog.createdAt.getTime();
        const minutesDiff = timeDiff / (1000 * 60);

        // Suspicious if switched cafes in less than 30 minutes
        if (minutesDiff < 30) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Log access attempt
   */
  private static async logAccess(
    userId: string,
    cafeId: string,
    method: 'wifi' | 'geofence' | 'manual',
    granted: boolean,
    ssid: string | null,
    distance: number | null,
    suspicious: boolean,
    reason?: string
  ): Promise<void> {
    await db.query(
      `INSERT INTO access_logs
       (user_id, cafe_id, validation_method, access_granted, ssid_matched, distance_meters, suspicious, reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, cafeId, method, granted, ssid, distance, suspicious, reason || null]
    );
  }
}
