/**
 * Unit tests for User model
 */
import { User as UserModel } from '../../../models/User';
import { mockDb, mockSuccessfulQuery, mockFailedQuery, resetDatabaseMocks } from '../../mocks/database.mock';
import { createTestUser, createTestCafe } from '../../utils/testData';

// Mock the database connection
jest.mock('../../../db/connection', () => ({
  db: mockDb,
}));

describe('User Model', () => {
  beforeEach(() => {
    resetDatabaseMocks();
  });

  describe('create', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        username: 'testuser123',
        cafeId: 'cafe-uuid',
        receiptId: 'receipt123',
      };

      const createdUser = createTestUser(userData);
      mockSuccessfulQuery([createdUser]);

      const result = await UserModel.create(
        userData.username,
        userData.cafeId,
        userData.receiptId
      );

      expect(result).toBeDefined();
      expect(result.username).toBe(userData.username);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.any(Array)
      );
    });

    it('should handle database errors during creation', async () => {
      mockFailedQuery(new Error('Database connection failed'));

      await expect(
        UserModel.create('testuser', 'cafe123', 'receipt123')
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('findById', () => {
    it('should find user by ID', async () => {
      const testUser = createTestUser();
      mockSuccessfulQuery([testUser]);

      const result = await UserModel.findById(testUser.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(testUser.id);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM users'),
        [testUser.id]
      );
    });

    it('should return null for non-existent user', async () => {
      mockSuccessfulQuery([]);

      const result = await UserModel.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByUsername', () => {
    it('should find user by username', async () => {
      const testUser = createTestUser({ username: 'uniqueuser' });
      mockSuccessfulQuery([testUser]);

      const result = await UserModel.findByUsername('uniqueuser');

      expect(result).toBeDefined();
      expect(result?.username).toBe('uniqueuser');
    });

    it('should return null for non-existent username', async () => {
      mockSuccessfulQuery([]);

      const result = await UserModel.findByUsername('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByCafe', () => {
    it('should find all users in a cafe', async () => {
      const cafeId = 'cafe123';
      const users = [
        createTestUser({ cafeId }),
        createTestUser({ cafeId }),
        createTestUser({ cafeId }),
      ];
      mockSuccessfulQuery(users);

      const result = await UserModel.findByCafe(cafeId);

      expect(result).toHaveLength(3);
      expect(result.every(u => u.cafeId === cafeId)).toBe(true);
    });

    it('should return empty array for cafe with no users', async () => {
      mockSuccessfulQuery([]);

      const result = await UserModel.findByCafe('empty-cafe');

      expect(result).toEqual([]);
    });
  });

  describe('updateInterests', () => {
    it('should update user interests', async () => {
      const userId = 'user123';
      const interests = ['coffee', 'coding', 'music'];
      const updatedUser = createTestUser({ id: userId, interests });
      mockSuccessfulQuery([updatedUser]);

      const result = await UserModel.updateInterests(userId, interests);

      expect(result.interests).toEqual(interests);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET interests'),
        [interests, userId]
      );
    });

    it('should handle empty interests array', async () => {
      const userId = 'user123';
      const updatedUser = createTestUser({ id: userId, interests: [] });
      mockSuccessfulQuery([updatedUser]);

      const result = await UserModel.updateInterests(userId, []);

      expect(result.interests).toEqual([]);
    });
  });

  describe('updatePokeEnabled', () => {
    it('should enable poke for user', async () => {
      const userId = 'user123';
      const updatedUser = createTestUser({ id: userId, pokeEnabled: true });
      mockSuccessfulQuery([updatedUser]);

      const result = await UserModel.updatePokeEnabled(userId, true);

      expect(result.pokeEnabled).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET poke_enabled'),
        [true, userId]
      );
    });

    it('should disable poke for user', async () => {
      const userId = 'user123';
      const updatedUser = createTestUser({ id: userId, pokeEnabled: false });
      mockSuccessfulQuery([updatedUser]);

      const result = await UserModel.updatePokeEnabled(userId, false);

      expect(result.pokeEnabled).toBe(false);
    });
  });

  describe('updateBadgeStatus', () => {
    it('should update user badge status to active', async () => {
      const userId = 'user123';
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const updatedUser = createTestUser({
        id: userId,
        badgeStatus: 'active',
        badgeExpiresAt: expiresAt,
      });
      mockSuccessfulQuery([updatedUser]);

      const result = await UserModel.updateBadgeStatus(userId, 'active', expiresAt);

      expect(result.badgeStatus).toBe('active');
      expect(result.badgeExpiresAt).toBeDefined();
    });
  });

  describe('deleteExpired', () => {
    it('should delete expired users', async () => {
      mockSuccessfulQuery([]);

      await UserModel.deleteExpired();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM users WHERE expires_at')
      );
    });
  });

  describe('getActiveCafeUsers', () => {
    it('should get count of active users in cafe', async () => {
      const cafeId = 'cafe123';
      mockSuccessfulQuery([{ count: '15' }]);

      const result = await UserModel.getActiveCafeUsers(cafeId);

      expect(result).toBe(15);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*)'),
        [cafeId]
      );
    });

    it('should return 0 for cafe with no users', async () => {
      mockSuccessfulQuery([{ count: '0' }]);

      const result = await UserModel.getActiveCafeUsers('empty-cafe');

      expect(result).toBe(0);
    });
  });

  describe('getUsersByInterest', () => {
    it('should find users with specific interest', async () => {
      const interest = 'coffee';
      const users = [
        createTestUser({ interests: ['coffee', 'coding'] }),
        createTestUser({ interests: ['coffee', 'music'] }),
      ];
      mockSuccessfulQuery(users);

      const result = await UserModel.getUsersByInterest(interest);

      expect(result).toHaveLength(2);
      expect(result.every(u => u.interests.includes(interest))).toBe(true);
    });
  });
});
