/**
 * Frontend TypeScript types for Chat Agents
 */

// Agent Types
export type PersonalityType = 'bartender' | 'quirky' | 'historian' | 'sarcastic' | 'professional' | 'custom';
export type ProactivityLevel = 'silent' | 'occasional' | 'active';
export type AgentStatus = 'online' | 'offline' | 'busy';
export type InteractionType = 'mention' | 'proactive' | 'contextual';
export type ContextType = 'system' | 'knowledge' | 'instruction';

// Chat Agent
export interface ChatAgent {
  id: string;
  cafeId: string;
  name: string;
  username: string;
  avatarUrl?: string;
  personality: PersonalityType;
  customPrompt?: string;
  proactivity: ProactivityLevel;
  enabled: boolean;
  status: AgentStatus;
  metadata?: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
  isTyping?: boolean; // Frontend-only state
}

// Chat Message (extended from existing)
export interface ChatMessage {
  id: string;
  userId?: string | null;
  username: string;
  cafeId: string;
  content: string;
  messageType: 'user' | 'agent' | 'system' | 'barista';
  metadata?: {
    interests?: string[];
    badgeHolder?: boolean;
  };
  createdAt: Date | string;
  deletedAt?: Date | string | null;
  agentId?: string | null;
  replyToMessageId?: string | null;
  mentionedAgents?: string[];
  isStreaming?: boolean;
}

// Agent Context (for admin UI)
export interface AgentContext {
  id: string;
  agentId: string;
  contextType: ContextType;
  content: string;
  priority: number;
  enabled: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Agent Interaction (for analytics)
export interface AgentInteraction {
  id: string;
  agentId: string;
  userId: string | null;
  messageId: string | null;
  interactionType: InteractionType;
  query: string;
  response?: string;
  processingTimeMs?: number;
  tokenCount?: number;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: Date | string;
}

// Agent Statistics
export interface AgentStats {
  totalInteractions: number;
  successfulInteractions: number;
  failedInteractions: number;
  avgProcessingTimeMs: number;
  totalTokens: number;
  byType: {
    mention: number;
    proactive: number;
    contextual: number;
  };
}

// Socket Events (Client → Server)
export interface ClientToServerEvents {
  'join:cafe': (data: { cafeId: string; userId: string; location?: { lat: number; lng: number } }) => void;
  'leave:cafe': (data: { cafeId: string }) => void;
  'message:send': (data: { content: string; cafeId: string }) => void;
  'typing:start': (data: { cafeId: string }) => void;
  'typing:stop': (data: { cafeId: string }) => void;
  'presence:update': (data: { inCafe: boolean; cafeId?: string }) => void;
  'agent:mention': (data: { agentUsername: string; message: string; cafeId: string }) => void;
  'agent:list': (data: { cafeId: string }) => void;
}

// Socket Events (Server → Client)
export interface ServerToClientEvents {
  'message:new': (message: ChatMessage) => void;
  'users:update': (data: { total: number; inCafe: number; userList?: string[] }) => void;
  'typing:indicator': (data: { username: string; cafeId: string }) => void;
  'topics:update': (data: { topics: { word: string; count: number }[] }) => void;
  'error': (data: { message: string; code?: string }) => void;
  'connected': (data: { userId: string; cafeId?: string }) => void;
  'agent:typing': (data: { agentName: string; agentUsername: string; cafeId: string; isTyping: boolean }) => void;
  'agent:response:start': (data: { agentId: string; messageId: string; cafeId: string }) => void;
  'agent:response:chunk': (data: { messageId: string; chunk: string; cafeId: string }) => void;
  'agent:response:complete': (data: { messageId: string; fullMessage: string; cafeId: string }) => void;
  'agents:list': (data: { agents: ChatAgent[] }) => void;
  'agent:rate_limit': (data: { message: string; resetAt: Date | string; secondsUntilReset: number }) => void;
}

// Rate Limit Info
export interface RateLimitInfo {
  limited: boolean;
  message?: string;
  resetAt?: Date | string;
  secondsUntilReset?: number;
}

// Component Props Types
export interface AgentMessageProps {
  message: ChatMessage;
  agent?: ChatAgent;
  isStreaming?: boolean;
}

export interface AgentParticipantProps {
  agent: ChatAgent;
  onClick?: () => void;
}

export interface AgentMentionInputProps {
  agents: ChatAgent[];
  onSend: (message: string, mentionedAgent?: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export interface StreamingMessageProps {
  content: string;
  isComplete: boolean;
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface UpdateAgentRequest {
  name?: string;
  username?: string;
  avatarUrl?: string;
  personality?: PersonalityType;
  customPrompt?: string;
  proactivity?: ProactivityLevel;
  enabled?: boolean;
  status?: AgentStatus;
}

export interface UpsertContextRequest {
  contextType: ContextType;
  content: string;
  priority?: number;
  enabled?: boolean;
}
