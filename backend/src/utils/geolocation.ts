/**
 * Geolocation utility functions
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param coord1 First coordinate
 * @param coord2 Second coordinate
 * @returns Distance in meters
 */
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = toRadians(coord1.latitude);
  const φ2 = toRadians(coord2.latitude);
  const Δφ = toRadians(coord2.latitude - coord1.latitude);
  const Δλ = toRadians(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Check if a point is within a circular geofence
 * @param userCoord User's current coordinates
 * @param centerCoord Center of the geofence
 * @param radiusMeters Radius of the geofence in meters
 * @returns True if user is within the geofence
 */
export function isWithinGeofence(
  userCoord: Coordinates,
  centerCoord: Coordinates,
  radiusMeters: number
): boolean {
  const distance = calculateDistance(userCoord, centerCoord);
  return distance <= radiusMeters;
}

/**
 * Calculate bearing between two coordinates
 * @param from Start coordinate
 * @param to End coordinate
 * @returns Bearing in degrees (0-360)
 */
export function calculateBearing(from: Coordinates, to: Coordinates): number {
  const φ1 = toRadians(from.latitude);
  const φ2 = toRadians(to.latitude);
  const Δλ = toRadians(to.longitude - from.longitude);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  const θ = Math.atan2(y, x);
  return (toDegrees(θ) + 360) % 360;
}

/**
 * Convert radians to degrees
 */
function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Validate coordinate values
 */
export function isValidCoordinate(coord: Coordinates): boolean {
  return (
    typeof coord.latitude === 'number' &&
    typeof coord.longitude === 'number' &&
    coord.latitude >= -90 &&
    coord.latitude <= 90 &&
    coord.longitude >= -180 &&
    coord.longitude <= 180
  );
}

/**
 * Get bounding box for a given center and radius
 * Useful for database queries to filter nearby locations
 */
export function getBoundingBox(
  center: Coordinates,
  radiusMeters: number
): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} {
  const latDelta = (radiusMeters / 111320); // 1 degree latitude ≈ 111.32 km
  const lngDelta = radiusMeters / (111320 * Math.cos(toRadians(center.latitude)));

  return {
    minLat: center.latitude - latDelta,
    maxLat: center.latitude + latDelta,
    minLng: center.longitude - lngDelta,
    maxLng: center.longitude + lngDelta,
  };
}
