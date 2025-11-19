/**
 * Unit tests for network validation utilities
 */
import { validateWifiSSID, isWithinGeofence, calculateDistance } from '../../../utils/networkValidation';

describe('Network Validation', () => {
  describe('validateWifiSSID', () => {
    it('should return true for matching SSID', () => {
      const cafeSSID = 'CAFE_WIFI_123';
      const userSSID = 'CAFE_WIFI_123';

      const result = validateWifiSSID(userSSID, cafeSSID);

      expect(result).toBe(true);
    });

    it('should return false for non-matching SSID', () => {
      const cafeSSID = 'CAFE_WIFI_123';
      const userSSID = 'OTHER_WIFI';

      const result = validateWifiSSID(userSSID, cafeSSID);

      expect(result).toBe(false);
    });

    it('should be case-sensitive', () => {
      const cafeSSID = 'CAFE_WIFI_123';
      const userSSID = 'cafe_wifi_123';

      const result = validateWifiSSID(userSSID, cafeSSID);

      expect(result).toBe(false);
    });

    it('should handle empty strings', () => {
      expect(validateWifiSSID('', 'CAFE_WIFI')).toBe(false);
      expect(validateWifiSSID('CAFE_WIFI', '')).toBe(false);
      expect(validateWifiSSID('', '')).toBe(false);
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two points', () => {
      // San Francisco and Los Angeles (approximately 559 km)
      const lat1 = 37.7749;
      const lon1 = -122.4194;
      const lat2 = 34.0522;
      const lon2 = -118.2437;

      const distance = calculateDistance(lat1, lon1, lat2, lon2);

      // Should be approximately 559 km (allowing 10km margin of error)
      expect(distance).toBeGreaterThan(550000);
      expect(distance).toBeLessThan(570000);
    });

    it('should return 0 for same coordinates', () => {
      const distance = calculateDistance(40.7128, -74.0060, 40.7128, -74.0060);

      expect(distance).toBe(0);
    });

    it('should calculate short distances accurately', () => {
      // Two points approximately 100 meters apart
      const lat1 = 40.7128;
      const lon1 = -74.0060;
      const lat2 = 40.7138;
      const lon2 = -74.0060;

      const distance = calculateDistance(lat1, lon1, lat2, lon2);

      // Should be approximately 100-150 meters
      expect(distance).toBeGreaterThan(50);
      expect(distance).toBeLessThan(200);
    });
  });

  describe('isWithinGeofence', () => {
    it('should return true when user is within geofence', () => {
      const cafeLat = 40.7128;
      const cafeLon = -74.0060;
      const userLat = 40.7129; // Very close
      const userLon = -74.0061;
      const radius = 100; // 100 meters

      const result = isWithinGeofence(userLat, userLon, cafeLat, cafeLon, radius);

      expect(result).toBe(true);
    });

    it('should return false when user is outside geofence', () => {
      const cafeLat = 40.7128;
      const cafeLon = -74.0060;
      const userLat = 40.7228; // About 1km away
      const userLon = -74.0160;
      const radius = 100; // 100 meters

      const result = isWithinGeofence(userLat, userLon, cafeLat, cafeLon, radius);

      expect(result).toBe(false);
    });

    it('should work with exact boundary', () => {
      const cafeLat = 40.7128;
      const cafeLon = -74.0060;
      // Calculate a point exactly 50 meters away
      const userLat = 40.7128 + (50 / 111000); // Roughly 50 meters north
      const userLon = -74.0060;
      const radius = 50;

      const result = isWithinGeofence(userLat, userLon, cafeLat, cafeLon, radius);

      // Should be at or very close to boundary
      expect(result).toBe(true);
    });

    it('should handle different radius values', () => {
      const cafeLat = 40.7128;
      const cafeLon = -74.0060;
      const userLat = 40.7148; // About 200 meters away
      const userLon = -74.0060;

      expect(isWithinGeofence(userLat, userLon, cafeLat, cafeLon, 100)).toBe(false);
      expect(isWithinGeofence(userLat, userLon, cafeLat, cafeLon, 250)).toBe(true);
      expect(isWithinGeofence(userLat, userLon, cafeLat, cafeLon, 500)).toBe(true);
    });
  });
});
