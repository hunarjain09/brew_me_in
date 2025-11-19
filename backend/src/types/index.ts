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

export interface Message {
  id: string;
  userId: string | null;
  username: string;
  cafeId: string;
  content: string;
  messageType: 'user' | 'agent' | 'system' | 'barista';
  metadata?: {
    interests?: string[];
    badgeHolder?: boolean;
  };
  createdAt: Date;
  deletedAt?: Date;
}

export interface SocketData {
  userId: string;
  username: string;
  cafeId?: string;
}

export interface ClientToServerEvents {
  'join:cafe': (data: { cafeId: string; userId: string; location?: { lat: number; lng: number } }) => void;
  'leave:cafe': (data: { cafeId: string }) => void;
  'message:send': (data: { content: string; cafeId: string }) => void;
  'typing:start': (data: { cafeId: string }) => void;
  'typing:stop': (data: { cafeId: string }) => void;
  'presence:update': (data: { inCafe: boolean; cafeId?: string }) => void;
}

export interface ServerToClientEvents {
  'message:new': (message: Message) => void;
  'users:update': (data: { total: number; inCafe: number; userList?: string[] }) => void;
  'typing:indicator': (data: { username: string; cafeId: string }) => void;
  'topics:update': (data: { topics: { word: string; count: number }[] }) => void;
  'error': (data: { message: string; code?: string }) => void;
  'connected': (data: { userId: string; cafeId?: string }) => void;
}

export interface InterServerEvents {
  ping: () => void;
}
