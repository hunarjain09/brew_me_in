import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { CafeLocation, UserPresence, AccessLog } from '../models';
import {
  LocationValidationRequest,
  LocationValidationResponse,
  PresenceUpdateRequest,
  PresenceUpdateResponse,
  NearbyCafeQuery,
  NearbyCafe,
  GeofenceCheckResult,
} from '../types';
import { calculateDistance, isWithinGeofence, getBoundingBox } from '../utils/geolocation';

export class LocationService {
  private cafeLocationRepo: Repository<CafeLocation>;
  private userPresenceRepo: Repository<UserPresence>;
  private accessLogRepo: Repository<AccessLog>;

  constructor() {
    this.cafeLocationRepo = AppDataSource.getRepository(CafeLocation);
    this.userPresenceRepo = AppDataSource.getRepository(UserPresence);
    this.accessLogRepo = AppDataSource.getRepository(AccessLog);
  }

  /**
   * Validate if user has access to a cafe based on WiFi SSID or geofencing
   * Primary method: WiFi SSID match
   * Fallback method: Geofence check
   */
  async validateCafeAccess(
    request: LocationValidationRequest
  ): Promise<LocationValidationResponse> {
    const { cafeId, ssid, coordinates, userId } = request;

    // Get cafe location details
    const cafeLocation = await this.cafeLocationRepo.findOne({
      where: { cafeId },
    });

    if (!cafeLocation) {
      await this.logAccess(userId, cafeId, 'wifi', false, null, null, true, 'Cafe not found');
      return {
        inCafe: false,
        method: 'none',
        message: 'Cafe location not configured',
      };
    }

    // Primary validation: WiFi SSID match
    if (ssid && ssid.trim().toLowerCase() === cafeLocation.wifiSSID.trim().toLowerCase()) {
      await this.logAccess(userId, cafeId, 'wifi', true, ssid, null, false);
      return {
        inCafe: true,
        method: 'wifi',
        message: 'Access granted via WiFi SSID',
      };
    }

    // Fallback validation: Geofence check
    if (coordinates) {
      const distance = calculateDistance(
        { latitude: coordinates.lat, longitude: coordinates.lng },
        { latitude: Number(cafeLocation.latitude), longitude: Number(cafeLocation.longitude) }
      );

      const withinGeofence = distance <= cafeLocation.radiusMeters;

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
  async updateUserPresence(request: PresenceUpdateRequest): Promise<PresenceUpdateResponse> {
    const { userId, cafeId, inCafe, ssid, coordinates } = request;

    let userPresence = await this.userPresenceRepo.findOne({
      where: { userId },
    });

    const previousState = userPresence?.inCafe;

    if (!userPresence) {
      userPresence = this.userPresenceRepo.create({
        userId,
        cafeId: inCafe ? cafeId : null,
        inCafe,
        lastSeenInCafe: inCafe ? new Date() : null,
        currentSSID: ssid || null,
        lastLatitude: coordinates?.lat || null,
        lastLongitude: coordinates?.lng || null,
        validationMethod: ssid ? 'wifi' : coordinates ? 'geofence' : null,
      });
    } else {
      userPresence.cafeId = inCafe ? cafeId : null;
      userPresence.inCafe = inCafe;
      if (inCafe) {
        userPresence.lastSeenInCafe = new Date();
      }
      userPresence.currentSSID = ssid || null;
      userPresence.lastLatitude = coordinates?.lat || null;
      userPresence.lastLongitude = coordinates?.lng || null;
      userPresence.validationMethod = ssid ? 'wifi' : coordinates ? 'geofence' : null;
    }

    await this.userPresenceRepo.save(userPresence);

    return {
      success: true,
      userLocation: {
        userId: userPresence.userId,
        inCafe: userPresence.inCafe,
        lastSeenInCafe: userPresence.lastSeenInCafe,
        currentSSID: userPresence.currentSSID || undefined,
        coordinates: coordinates
          ? { lat: coordinates.lat, lng: coordinates.lng }
          : undefined,
      },
      previousState,
    };
  }

  /**
   * Get nearby cafes based on user's current location
   */
  async getNearbyCafes(query: NearbyCafeQuery): Promise<NearbyCafe[]> {
    const { lat, lng, radiusMeters = 5000, limit = 20 } = query;

    // Get bounding box for efficient query
    const bbox = getBoundingBox({ latitude: lat, longitude: lng }, radiusMeters);

    // Query cafes within bounding box
    const cafes = await this.cafeLocationRepo
      .createQueryBuilder('cafe')
      .where('cafe.latitude BETWEEN :minLat AND :maxLat', {
        minLat: bbox.minLat,
        maxLat: bbox.maxLat,
      })
      .andWhere('cafe.longitude BETWEEN :minLng AND :maxLng', {
        minLng: bbox.minLng,
        maxLng: bbox.maxLng,
      })
      .getMany();

    // Calculate distances and filter by actual radius
    const nearbyCafes = cafes
      .map((cafe) => {
        const distance = calculateDistance(
          { latitude: lat, longitude: lng },
          { latitude: Number(cafe.latitude), longitude: Number(cafe.longitude) }
        );

        return {
          cafeId: cafe.cafeId,
          name: '', // TODO: Join with cafes table to get name
          distance,
          latitude: Number(cafe.latitude),
          longitude: Number(cafe.longitude),
          wifiSSID: cafe.wifiSSID,
          radiusMeters: cafe.radiusMeters,
        };
      })
      .filter((cafe) => cafe.distance <= radiusMeters)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);

    return nearbyCafes;
  }

  /**
   * Check geofence for a specific cafe
   */
  async checkGeofence(
    cafeId: string,
    userLat: number,
    userLng: number
  ): Promise<GeofenceCheckResult> {
    const cafeLocation = await this.cafeLocationRepo.findOne({
      where: { cafeId },
    });

    if (!cafeLocation) {
      throw new Error('Cafe location not found');
    }

    const distance = calculateDistance(
      { latitude: userLat, longitude: userLng },
      { latitude: Number(cafeLocation.latitude), longitude: Number(cafeLocation.longitude) }
    );

    const withinGeofence = isWithinGeofence(
      { latitude: userLat, longitude: userLng },
      { latitude: Number(cafeLocation.latitude), longitude: Number(cafeLocation.longitude) },
      cafeLocation.radiusMeters
    );

    return {
      withinGeofence,
      distance,
      cafeLocation: {
        cafeId: cafeLocation.cafeId,
        wifiSSID: cafeLocation.wifiSSID,
        latitude: Number(cafeLocation.latitude),
        longitude: Number(cafeLocation.longitude),
        radiusMeters: cafeLocation.radiusMeters,
      },
    };
  }

  /**
   * Get all users currently in a specific cafe
   */
  async getUsersInCafe(cafeId: string): Promise<UserPresence[]> {
    return await this.userPresenceRepo.find({
      where: {
        cafeId,
        inCafe: true,
      },
      order: {
        lastSeenInCafe: 'DESC',
      },
    });
  }

  /**
   * Get user's current presence status
   */
  async getUserPresence(userId: string): Promise<UserPresence | null> {
    return await this.userPresenceRepo.findOne({
      where: { userId },
    });
  }

  /**
   * Detect suspicious access patterns
   * E.g., multiple users with same receipt, rapid location changes
   */
  async detectSuspiciousActivity(userId: string, cafeId: string): Promise<boolean> {
    // Get recent access logs for this user
    const recentLogs = await this.accessLogRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 10,
    });

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
  private async logAccess(
    userId: string,
    cafeId: string,
    method: 'wifi' | 'geofence' | 'manual',
    granted: boolean,
    ssid: string | null,
    distance: number | null,
    suspicious: boolean,
    reason?: string
  ): Promise<void> {
    const log = this.accessLogRepo.create({
      userId,
      cafeId,
      validationMethod: method,
      accessGranted: granted,
      ssidMatched: ssid,
      distanceMeters: distance,
      suspicious,
      reason: reason || null,
    });

    await this.accessLogRepo.save(log);
  }

  /**
   * Create or update cafe location
   */
  async upsertCafeLocation(
    cafeId: string,
    wifiSSID: string,
    latitude: number,
    longitude: number,
    radiusMeters: number = 50
  ): Promise<CafeLocation> {
    let cafeLocation = await this.cafeLocationRepo.findOne({
      where: { cafeId },
    });

    if (!cafeLocation) {
      cafeLocation = this.cafeLocationRepo.create({
        cafeId,
        wifiSSID,
        latitude,
        longitude,
        radiusMeters,
      });
    } else {
      cafeLocation.wifiSSID = wifiSSID;
      cafeLocation.latitude = latitude;
      cafeLocation.longitude = longitude;
      cafeLocation.radiusMeters = radiusMeters;
    }

    return await this.cafeLocationRepo.save(cafeLocation);
  }
}
