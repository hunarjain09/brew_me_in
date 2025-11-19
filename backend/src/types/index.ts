export interface User {
  id: string;
  username: string;
  cafeId: string;
  receiptId: string;
  createdAt: Date;
  expiresAt: Date;
  interests: string[];
  pokeEnabled: boolean;
  badgeStatus: 'none' | 'active' | 'expired';
  badgeExpiresAt?: Date;
  tipCount: number;
  lastTipDate?: Date;
}

export interface Badge {
  userId: string;
  earnedAt: Date;
  expiresAt: Date;
  tipsInPeriod: number;
  periodStartDate: Date;
}

export interface Tip {
  id: string;
  userId: string;
  cafeId: string;
  amount: number;
  createdAt: Date;
}

export interface Cafe {
  id: string;
  name: string;
  wifiSsid: string;
  latitude?: number;
  longitude?: number;
  geofenceRadius?: number;
  createdAt: Date;
}

export interface JWTPayload {
  userId: string;
  username: string;
  cafeId: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// Location Services Types
export interface CafeLocation {
  cafeId: string;
  wifiSSID: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserPresence {
  userId: string;
  cafeId: string | null;
  inCafe: boolean;
  lastSeenInCafe: Date | null;
  currentSSID?: string;
  lastLatitude?: number;
  lastLongitude?: number;
  validationMethod?: 'wifi' | 'geofence' | 'manual';
  createdAt?: Date;
  updatedAt?: Date;
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
  distance?: number;
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

export interface NearbyCafe {
  cafeId: string;
  name: string;
  distance: number;
  latitude: number;
  longitude: number;
  wifiSSID: string;
  radiusMeters: number;
}

export interface AccessLog {
  id: string;
  userId: string;
  cafeId: string;
  validationMethod: 'wifi' | 'geofence' | 'manual';
  accessGranted: boolean;
  ssidMatched?: string;
  distanceMeters?: number;
  suspicious: boolean;
  reason?: string;
  createdAt: Date;
}
