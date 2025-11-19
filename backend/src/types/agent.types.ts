/**
 * Agent Configuration Types
 * Defines the structure for AI agent personality and behavior
 */

export type PersonalityType =
  | 'bartender'
  | 'quirky'
  | 'historian'
  | 'sarcastic'
  | 'professional'
  | 'custom';

export type ProactivityLevel =
  | 'silent'      // Never sends proactive messages
  | 'occasional'  // Sends messages during significant events
  | 'active'      // Regularly engages with community
  | 'hype';       // Very frequent engagement

export type QueryType =
  | 'orders'
  | 'stats'
  | 'menu'
  | 'events'
  | 'community';

export interface AgentConfig {
  cafeId: string;
  personality: PersonalityType;
  customPrompt?: string;
  proactivity: ProactivityLevel;
  enabledQueries: QueryType[];
  maxTokens?: number;
  temperature?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AgentQuery {
  id: string;
  userId: string;
  cafeId: string;
  question: string;
  response: string;
  responseTime: number;
  cached: boolean;
  createdAt: Date;
}

export interface OrderStat {
  item: string;
  count: number;
  revenue?: number;
}

export interface PeakHour {
  hour: number;
  customerCount: number;
  orderCount: number;
}

export interface UpcomingEvent {
  name: string;
  date: Date;
  description?: string;
  attendeeCount?: number;
}

export interface CafeContext {
  cafeId: string;
  cafeName: string;
  orderStats: OrderStat[];
  peakHours: PeakHour[];
  popularInterests: string[];
  upcomingEvents: UpcomingEvent[];
  customKnowledge: string;
  totalCustomers?: number;
  averageOrderValue?: number;
}

export interface AgentQueryRequest {
  cafeId: string;
  question: string;
  userId: string;
  streaming?: boolean;
}

export interface AgentQueryResponse {
  response: string;
  responseTime: number;
  cached: boolean;
  queryId: string;
}

export interface ProactiveMessage {
  cafeId: string;
  message: string;
  trigger: 'event' | 'milestone' | 'scheduled' | 'manual';
  metadata?: Record<string, any>;
}

export interface PersonalityDescription {
  name: string;
  description: string;
  tone: string;
  emojiUsage: 'none' | 'minimal' | 'moderate' | 'frequent';
  exampleGreeting: string;
}

export interface RateLimitInfo {
  global: {
    lastQuery: number;
    minInterval: number;
  };
  user: {
    count: number;
    limit: number;
    resetAt: Date;
  };
}

export interface AgentAnalytics {
  cafeId: string;
  totalQueries: number;
  averageResponseTime: number;
  cacheHitRate: number;
  popularQuestions: Array<{
    question: string;
    count: number;
  }>;
  queryDistribution: Record<QueryType, number>;
}
