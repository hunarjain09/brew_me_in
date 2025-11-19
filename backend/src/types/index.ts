// Type definitions for Moderator Dashboard

export interface Cafe {
  id: string;
  name: string;
  location?: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: string;
  cafe_id: string;
  username: string;
  receipt_id?: string;
  is_banned: boolean;
  created_at: Date;
  last_seen_at: Date;
}

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

export interface Message {
  id: string;
  cafe_id: string;
  user_id: string;
  content: string;
  message_type: string;
  deleted_at?: Date;
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

// API Request/Response types
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

// WebSocket event types
export interface SocketEvents {
  // Server -> Client
  'activity:new': (event: ActivityEvent) => void;
  'flag:message': (data: { messageId: string; reason: string }) => void;
  'stats:update': (stats: DashboardStats) => void;

  // Client -> Server
  'moderate:message': (data: { messageId: string; action: string }) => void;
  'moderate:user': (data: { userId: string; action: string; duration?: number }) => void;
  'join:cafe': (cafeId: string) => void;
}

// JWT Payload
export interface JWTPayload {
  moderatorId: string;
  cafeId: string;
  role: string;
  email: string;
}
