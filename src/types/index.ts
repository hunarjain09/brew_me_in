export interface User {
  id: string;
  username: string;
  cafeId: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Cafe {
  id: string;
  name: string;
  location: string;
  enableProactiveMessages: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Badge {
  id: string;
  userId: string;
  type: BadgeType;
  name: string;
  description: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum BadgeType {
  REGULAR = 'REGULAR',
  EARLY_BIRD = 'EARLY_BIRD',
  NIGHT_OWL = 'NIGHT_OWL',
  SOCIAL_BUTTERFLY = 'SOCIAL_BUTTERFLY',
  COFFEE_CONNOISSEUR = 'COFFEE_CONNOISSEUR',
  FIRST_TIMER = 'FIRST_TIMER',
  FREQUENT_VISITOR = 'FREQUENT_VISITOR'
}

export interface Poke {
  id: string;
  fromUserId: string;
  toUserId: string;
  message?: string;
  expiresAt: Date;
  createdAt: Date;
  isRead: boolean;
}

export interface Analytics {
  id: string;
  cafeId: string;
  date: Date;
  totalUsers: number;
  activeUsers: number;
  totalPokes: number;
  totalMessages: number;
  averageSessionDuration: number;
  peakHour: number;
  createdAt: Date;
}

export interface ProactiveMessage {
  cafeId: string;
  message: string;
  context: string;
  timestamp: Date;
}

export interface JobResult {
  success: boolean;
  message: string;
  affectedRecords?: number;
  error?: string;
}

export interface SchedulerConfig {
  enableScheduler: boolean;
  enableProactiveMessages: boolean;
  timezone?: string;
}
