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
