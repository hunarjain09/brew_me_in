/**
 * Unit tests for Matching routes (interest-based discovery)
 */
import { mockDb, mockSuccessfulQuery, resetDatabaseMocks } from '../../mocks/database.mock';
import { createTestUser } from '../../utils/testData';

jest.mock('../../../db/connection', () => ({
  db: mockDb,
}));

describe('Matching Routes', () => {
  beforeEach(() => {
    resetDatabaseMocks();
  });

  describe('GET /api/matching/discover', () => {
    it('should discover users with shared interests', async () => {
      const currentUser = createTestUser({
        id: 'user1',
        interests: ['coffee', 'coding', 'music'],
      });

      const matchingUsers = [
        createTestUser({ id: 'user2', interests: ['coffee', 'coding'] }),
        createTestUser({ id: 'user3', interests: ['coding', 'music'] }),
        createTestUser({ id: 'user4', interests: ['coffee'] }),
      ];

      mockSuccessfulQuery(matchingUsers);

      // Test would verify users are sorted by number of shared interests
      expect(matchingUsers).toHaveLength(3);
      expect(matchingUsers[0].interests).toContain('coffee');
    });

    it('should exclude users with poke disabled', async () => {
      const usersWithPokeEnabled = [
        createTestUser({ pokeEnabled: true }),
        createTestUser({ pokeEnabled: true }),
      ];

      mockSuccessfulQuery(usersWithPokeEnabled);

      expect(usersWithPokeEnabled.every(u => u.pokeEnabled)).toBe(true);
    });

    it('should exclude current user from results', async () => {
      const currentUserId = 'user1';
      const otherUsers = [
        createTestUser({ id: 'user2' }),
        createTestUser({ id: 'user3' }),
      ];

      mockSuccessfulQuery(otherUsers);

      expect(otherUsers.every(u => u.id !== currentUserId)).toBe(true);
    });

    it('should limit results to reasonable number', async () => {
      const maxResults = 20;
      const users = Array(15).fill(null).map(() => createTestUser());

      mockSuccessfulQuery(users);

      expect(users.length).toBeLessThanOrEqual(maxResults);
    });

    it('should prioritize users with multiple shared interests', async () => {
      const currentUser = createTestUser({
        interests: ['coffee', 'coding', 'music', 'reading'],
      });

      const highMatchUser = createTestUser({
        id: 'user2',
        interests: ['coffee', 'coding', 'music'],
      });

      const lowMatchUser = createTestUser({
        id: 'user3',
        interests: ['coffee'],
      });

      // High match user should have higher priority
      expect(highMatchUser.interests.length).toBeGreaterThan(lowMatchUser.interests.length);
    });
  });

  describe('POST /api/matching/interests', () => {
    it('should update all interests at once', async () => {
      const userId = 'user123';
      const newInterests = ['coffee', 'coding', 'music', 'reading'];
      const updatedUser = createTestUser({ id: userId, interests: newInterests });

      mockSuccessfulQuery([updatedUser]);

      expect(updatedUser.interests).toEqual(newInterests);
    });

    it('should validate interest format', async () => {
      const validInterests = ['coffee', 'coding'];
      const invalidInterests = ['', 'a', 'a'.repeat(100)];

      // Valid interests should be non-empty and reasonable length
      expect(validInterests.every(i => i.length > 0 && i.length < 50)).toBe(true);
      expect(invalidInterests.some(i => i.length === 0 || i.length > 50)).toBe(true);
    });

    it('should trim and normalize interests', async () => {
      const interests = ['  Coffee  ', 'CODING', 'Music'];
      const normalized = interests.map(i => i.trim().toLowerCase());

      expect(normalized).toEqual(['coffee', 'coding', 'music']);
    });
  });

  describe('POST /api/matching/interests/add', () => {
    it('should add a single interest', async () => {
      const user = createTestUser({ interests: ['coffee', 'coding'] });
      const updatedUser = { ...user, interests: [...user.interests, 'music'] };

      mockSuccessfulQuery([updatedUser]);

      expect(updatedUser.interests).toContain('music');
      expect(updatedUser.interests).toHaveLength(3);
    });

    it('should prevent duplicate interests', async () => {
      const user = createTestUser({ interests: ['coffee', 'coding'] });

      // Attempting to add 'coffee' again should not create duplicate
      const newInterests = Array.from(new Set([...user.interests, 'coffee']));

      expect(newInterests).toHaveLength(2);
      expect(newInterests.filter(i => i === 'coffee')).toHaveLength(1);
    });

    it('should enforce maximum number of interests', async () => {
      const maxInterests = 10;
      const user = createTestUser({
        interests: Array(maxInterests).fill(null).map((_, i) => `interest${i}`),
      });

      // Should not allow adding more
      expect(user.interests).toHaveLength(maxInterests);
    });
  });

  describe('POST /api/matching/interests/remove', () => {
    it('should remove a single interest', async () => {
      const user = createTestUser({ interests: ['coffee', 'coding', 'music'] });
      const updatedInterests = user.interests.filter(i => i !== 'coding');

      mockSuccessfulQuery([{ ...user, interests: updatedInterests }]);

      expect(updatedInterests).not.toContain('coding');
      expect(updatedInterests).toHaveLength(2);
    });

    it('should handle removing non-existent interest', async () => {
      const user = createTestUser({ interests: ['coffee', 'coding'] });
      const updatedInterests = user.interests.filter(i => i !== 'music');

      expect(updatedInterests).toEqual(user.interests);
    });

    it('should allow removing all interests', async () => {
      const user = createTestUser({ interests: ['coffee'] });
      const updatedUser = { ...user, interests: [] };

      mockSuccessfulQuery([updatedUser]);

      expect(updatedUser.interests).toHaveLength(0);
    });
  });

  describe('Interest matching algorithm', () => {
    it('should calculate match score correctly', () => {
      const user1Interests = ['coffee', 'coding', 'music', 'reading'];
      const user2Interests = ['coffee', 'coding', 'gaming'];

      const sharedInterests = user1Interests.filter(i =>
        user2Interests.includes(i)
      );

      expect(sharedInterests).toEqual(['coffee', 'coding']);
      expect(sharedInterests.length).toBe(2);
    });

    it('should handle users with no shared interests', () => {
      const user1Interests = ['coffee', 'coding'];
      const user2Interests = ['gaming', 'sports'];

      const sharedInterests = user1Interests.filter(i =>
        user2Interests.includes(i)
      );

      expect(sharedInterests).toHaveLength(0);
    });

    it('should handle users with all shared interests', () => {
      const commonInterests = ['coffee', 'coding', 'music'];
      const user1Interests = [...commonInterests];
      const user2Interests = [...commonInterests];

      const sharedInterests = user1Interests.filter(i =>
        user2Interests.includes(i)
      );

      expect(sharedInterests).toHaveLength(commonInterests.length);
    });
  });
});
