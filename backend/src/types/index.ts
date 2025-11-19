// COMPONENT 1: User Management & Authentication
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
  wifiSsid?: string;
  location?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  geofenceRadius?: number;
  createdAt?: Date;
  created_at?: Date;
  updatedAt?: Date;
  updated_at?: Date;
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

// COMPONENT 7: Network Validation & Location Services
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

// COMPONENT 2: Real-time Chat
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

// COMPONENT 6: Moderator Dashboard & Admin Tools
export interface Moderator {
  id: string;
  cafe_id: string;
  email: string;
  password_hash?: string; // Excluded in responses
  role: 'owner' | 'moderator';
  permissions: string[];
  created_at: Date;
  updated_at: Date;
}

export interface ModeratorResponse extends Omit<Moderator, 'password_hash'> {}

export interface ModerationAction {
  id: string;
  moderator_id: string;
  target_user_id: string;
  action: 'mute' | 'delete_message' | 'warn' | 'ban' | 'unmute' | 'unban';
  reason?: string;
  duration?: number; // minutes
  metadata?: Record<string, any>;
  created_at: Date;
}

export interface CafeAnalytics {
  cafe_id: string;
  date: Date;
  total_messages: number;
  unique_users: number;
  peak_hour?: number;
  agent_queries: number;
  pokes_exchanged: number;
  badges_earned: number;
}

export interface AgentQuery {
  id: string;
  cafe_id: string;
  user_id?: string;
  query: string;
  response?: string;
  agent_type?: string;
  processing_time_ms?: number;
  created_at: Date;
}

export interface AgentConfig {
  cafe_id: string;
  config: {
    enabled: boolean;
    responseTime: 'fast' | 'balanced' | 'thorough';
    personality: string;
    specializations: string[];
  };
  updated_at: Date;
}

export interface CafeEvent {
  id: string;
  cafe_id: string;
  name: string;
  description?: string;
  event_date: Date;
  created_by?: string;
  created_at: Date;
}

// API Request/Response types for Component 6
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  moderator: ModeratorResponse;
  cafe: Cafe;
}

export interface MuteUserRequest {
  userId: string;
  duration: number; // minutes
  reason?: string;
}

export interface BanUserRequest {
  userId: string;
  reason?: string;
  permanent?: boolean;
}

export interface DeleteMessageRequest {
  messageId: string;
  reason?: string;
}

export interface CreateEventRequest {
  name: string;
  description?: string;
  event_date: Date;
}

export interface UpdateAgentConfigRequest {
  enabled?: boolean;
  responseTime?: 'fast' | 'balanced' | 'thorough';
  personality?: string;
  specializations?: string[];
}

export interface ActivityEvent {
  type: 'message' | 'user_join' | 'user_leave' | 'poke' | 'agent_query' | 'moderation';
  user?: string;
  content?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface DashboardStats {
  activeUsers: number;
  totalMessages: number;
  agentQueries: number;
  flaggedMessages: number;
}

// WebSocket event types for Component 6
export interface AdminSocketEvents {
  // Server -> Client
  'activity:new': (event: ActivityEvent) => void;
  'flag:message': (data: { messageId: string; reason: string }) => void;
  'stats:update': (stats: DashboardStats) => void;

  // Client -> Server
  'moderate:message': (data: { messageId: string; action: string }) => void;
  'moderate:user': (data: { userId: string; action: string; duration?: number }) => void;
  'join:cafe': (cafeId: string) => void;
}

// Moderator JWT Payload for Component 6
export interface ModeratorJWTPayload {
  moderatorId: string;
  cafeId: string;
  role: string;
  email: string;
}

// Express Request extensions
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
        cafeId: string;
      };
    }
  }
}

// Active Socket for presence tracking
export interface ActiveSocket {
  userId: string;
  cafeId: string;
  socketId: string;
  joinedAt: Date;
  connectedAt: Date;
  lastActivity: Date;
}
