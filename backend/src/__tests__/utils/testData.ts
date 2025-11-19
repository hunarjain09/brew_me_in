/**
 * Test data factories and fixtures
 */
import { faker } from '@faker-js/faker';
import { User, Cafe, Message, Moderator, JWTPayload, ModeratorJWTPayload } from '../../types';

export const createTestUser = (overrides?: Partial<User>): User => ({
  id: faker.string.uuid(),
  username: faker.internet.username(),
  cafeId: faker.string.uuid(),
  receiptId: faker.string.alphanumeric(10),
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  interests: [faker.word.noun(), faker.word.noun()],
  pokeEnabled: true,
  badgeStatus: 'none',
  tipCount: 0,
  ...overrides,
});

export const createTestCafe = (overrides?: Partial<Cafe>): Cafe => ({
  id: faker.string.uuid(),
  name: faker.company.name(),
  wifiSsid: `CAFE_${faker.string.alphanumeric(8)}`,
  latitude: faker.location.latitude(),
  longitude: faker.location.longitude(),
  geofenceRadius: 50,
  createdAt: new Date(),
  ...overrides,
});

export const createTestMessage = (overrides?: Partial<Message>): Message => ({
  id: faker.string.uuid(),
  userId: faker.string.uuid(),
  username: faker.internet.username(),
  cafeId: faker.string.uuid(),
  content: faker.lorem.sentence(),
  messageType: 'user',
  createdAt: new Date(),
  ...overrides,
});

export const createTestModerator = (overrides?: Partial<Moderator>): Moderator => ({
  id: faker.string.uuid(),
  cafe_id: faker.string.uuid(),
  email: faker.internet.email(),
  password_hash: faker.string.alphanumeric(60),
  role: 'moderator',
  permissions: ['view_analytics', 'moderate_users'],
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

export const createTestJWTPayload = (overrides?: Partial<JWTPayload>): JWTPayload => ({
  userId: faker.string.uuid(),
  username: faker.internet.username(),
  cafeId: faker.string.uuid(),
  ...overrides,
});

export const createTestModeratorJWTPayload = (
  overrides?: Partial<ModeratorJWTPayload>
): ModeratorJWTPayload => ({
  moderatorId: faker.string.uuid(),
  cafeId: faker.string.uuid(),
  role: 'moderator',
  email: faker.internet.email(),
  ...overrides,
});

// Batch creation helpers
export const createTestUsers = (count: number): User[] => {
  return Array.from({ length: count }, () => createTestUser());
};

export const createTestMessages = (count: number, cafeId?: string): Message[] => {
  return Array.from({ length: count }, () =>
    createTestMessage(cafeId ? { cafeId } : {})
  );
};
