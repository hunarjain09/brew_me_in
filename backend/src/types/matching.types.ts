export interface UserInterests {
  userId: string;
  interests: string[];
  pokeEnabled: boolean;
}

export type PokeStatus = 'pending' | 'matched' | 'declined' | 'expired';

export interface Poke {
  id: string;
  fromUserId: string;
  toUserId: string;
  sharedInterest: string;
  status: PokeStatus;
  createdAt: Date;
  expiresAt: Date;
  respondedAt?: Date;
}

export interface DirectMessage {
  channelId: string;
  user1Id: string;
  user2Id: string;
  cafeId: string;
  createdAt: Date;
  lastMessageAt: Date;
}

export interface DMMessage {
  id: string;
  channelId: string;
  senderId: string;
  content: string;
  createdAt: Date;
}

export interface DiscoverUsersQuery {
  cafeId: string;
  interests?: string[];
  limit?: number;
  offset?: number;
}

export interface DiscoveredUser {
  userId: string;
  username?: string;
  sharedInterests: string[];
  totalSharedInterests: number;
}

export interface SendPokeRequest {
  toUserId: string;
  sharedInterest: string;
}

export interface PokeResponseRequest {
  pokeId: string;
  action: 'accept' | 'decline';
}

export interface NotificationPayload {
  type: 'poke_received' | 'poke_matched' | 'dm_message';
  data: {
    pokeId?: string;
    fromUserId?: string;
    channelId?: string;
    message?: string;
  };
}
