/**
 * Unit tests for JWT utility functions
 */
import jwt from 'jsonwebtoken';
import { JWTService } from '../../../utils/jwt';
import { mockDb, mockSuccessfulQuery, resetDatabaseMocks } from '../../mocks/database.mock';
import { createTestJWTPayload } from '../../utils/testData';

// Mock the database connection
jest.mock('../../../db/connection', () => ({
  db: mockDb,
}));

// Mock the config
jest.mock('../../../config', () => ({
  config: {
    jwt: {
      secret: 'test-secret',
      refreshSecret: 'test-refresh-secret',
      expiresIn: '24h',
      refreshExpiresIn: '7d',
    },
  },
}));

describe('JWTService', () => {
  beforeEach(() => {
    resetDatabaseMocks();
    jest.clearAllMocks();
  });

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const payload = createTestJWTPayload();
      const token = JWTService.generateAccessToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      // Verify the token can be decoded
      const decoded = jwt.verify(token, 'test-secret') as any;
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.username).toBe(payload.username);
      expect(decoded.cafeId).toBe(payload.cafeId);
    });

    it('should include expiration in the token', () => {
      const payload = createTestJWTPayload();
      const token = JWTService.generateAccessToken(payload);

      const decoded = jwt.decode(token) as any;
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const payload = createTestJWTPayload();
      const token = JWTService.generateRefreshToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      // Verify the token can be decoded with refresh secret
      const decoded = jwt.verify(token, 'test-refresh-secret') as any;
      expect(decoded.userId).toBe(payload.userId);
    });
  });

  describe('generateTokenPair', () => {
    it('should generate both access and refresh tokens', async () => {
      const payload = createTestJWTPayload();
      mockSuccessfulQuery([]);

      const tokens = await JWTService.generateTokenPair(payload);

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO refresh_tokens'),
        expect.arrayContaining([payload.userId, tokens.refreshToken, expect.any(Date)])
      );
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid access token', () => {
      const payload = createTestJWTPayload();
      const token = jwt.sign(payload, 'test-secret', { expiresIn: '24h' });

      const decoded = JWTService.verifyAccessToken(token);

      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.username).toBe(payload.username);
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => {
        JWTService.verifyAccessToken(invalidToken);
      }).toThrow('Invalid access token');
    });

    it('should throw error for expired token', () => {
      const payload = createTestJWTPayload();
      const expiredToken = jwt.sign(payload, 'test-secret', { expiresIn: '-1h' });

      expect(() => {
        JWTService.verifyAccessToken(expiredToken);
      }).toThrow('Invalid access token');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', () => {
      const payload = createTestJWTPayload();
      const token = jwt.sign(payload, 'test-refresh-secret', { expiresIn: '7d' });

      const decoded = JWTService.verifyRefreshToken(token);

      expect(decoded.userId).toBe(payload.userId);
    });

    it('should throw error for invalid refresh token', () => {
      expect(() => {
        JWTService.verifyRefreshToken('invalid.token');
      }).toThrow('Invalid refresh token');
    });
  });

  describe('storeRefreshToken', () => {
    it('should store refresh token in database', async () => {
      const userId = 'user123';
      const token = 'refresh_token_xyz';
      mockSuccessfulQuery([]);

      await JWTService.storeRefreshToken(userId, token);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO refresh_tokens'),
        expect.arrayContaining([userId, token, expect.any(Date)])
      );
    });
  });

  describe('validateRefreshToken', () => {
    it('should return true for valid refresh token', async () => {
      const token = 'valid_token';
      mockSuccessfulQuery([{ token, expires_at: new Date(Date.now() + 86400000) }]);

      const isValid = await JWTService.validateRefreshToken(token);

      expect(isValid).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM refresh_tokens'),
        [token]
      );
    });

    it('should return false for non-existent token', async () => {
      mockSuccessfulQuery([]);

      const isValid = await JWTService.validateRefreshToken('non_existent_token');

      expect(isValid).toBe(false);
    });
  });

  describe('revokeRefreshToken', () => {
    it('should revoke a refresh token', async () => {
      const token = 'token_to_revoke';
      mockSuccessfulQuery([]);

      await JWTService.revokeRefreshToken(token);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE refresh_tokens'),
        [token]
      );
    });
  });

  describe('revokeAllUserTokens', () => {
    it('should revoke all tokens for a user', async () => {
      const userId = 'user123';
      mockSuccessfulQuery([]);

      await JWTService.revokeAllUserTokens(userId);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE refresh_tokens'),
        [userId]
      );
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should delete expired tokens', async () => {
      mockSuccessfulQuery([]);

      await JWTService.cleanupExpiredTokens();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM refresh_tokens')
      );
    });
  });
});
