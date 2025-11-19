/**
 * Location-related TypeScript interfaces and types
 */

export interface CafeLocation {
  cafeId: string;
  wifiSSID: string;
  latitude: number;
  longitude: number;
  radiusMeters: number; // Geofence radius
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserLocation {
  userId: string;
  inCafe: boolean;
  lastSeenInCafe: Date | null;
  currentSSID?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  updatedAt?: Date;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
}

export interface LocationValidationRequest {
  cafeId: string;
  ssid?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  userId: string;
}

export interface LocationValidationResponse {
  inCafe: boolean;
  method: 'wifi' | 'geofence' | 'none';
  distance?: number; // Distance from cafe in meters
  message?: string;
}

export interface PresenceUpdateRequest {
  userId: string;
  cafeId: string;
  inCafe: boolean;
  ssid?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface PresenceUpdateResponse {
  success: boolean;
  userLocation: UserLocation;
  previousState?: boolean;
}

export interface NearbyCafeQuery {
  lat: number;
  lng: number;
  radiusMeters?: number;
  limit?: number;
}

export interface NearbyCafe {
  cafeId: string;
  name: string;
  distance: number; // meters
  latitude: number;
  longitude: number;
  wifiSSID: string;
  radiusMeters: number;
}

export interface PresenceChangeEvent {
  userId: string;
  cafeId: string;
  inCafe: boolean;
  timestamp: Date;
  method: 'wifi' | 'geofence' | 'manual';
}

export interface GeofenceCheckResult {
  withinGeofence: boolean;
  distance: number;
  cafeLocation: CafeLocation;
}

export type LocationValidationMethod = 'wifi' | 'geofence' | 'manual' | 'none';

export interface AccessPattern {
  userId: string;
  cafeId: string;
  timestamp: Date;
  method: LocationValidationMethod;
  suspicious: boolean;
  reason?: string;
}

export interface UserPresenceStatus {
  userId: string;
  userName?: string;
  inCafe: boolean;
  lastSeen: Date;
  currentCafe?: string;
  onlineStatus: 'online' | 'offline' | 'away';
}
