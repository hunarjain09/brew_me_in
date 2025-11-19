import { Request, Response } from 'express';
import { JoinTokenModel } from '../models/JoinToken';
import { UserModel } from '../models/User';
import { CafeModel } from '../models/Cafe';
import { JWTService } from '../utils/jwt';
import { NetworkValidator } from '../utils/networkValidation';
import { config } from '../config';

export class AuthController {
  /**
   * POST /api/auth/barista/generate-username
   * Barista generates a username for a customer
   */
  static async generateUsername(req: Request, res: Response): Promise<void> {
    try {
      const { cafeId, receiptId } = req.body;

      // Verify cafe exists
      const cafe = await CafeModel.findById(cafeId);
      if (!cafe) {
        res.status(404).json({ error: 'Cafe not found' });
        return;
      }

      // Generate unique username (simple implementation, can be enhanced)
      const username = await AuthController.generateUniqueUsername(cafeId);

      // Create join token (valid for 15 minutes)
      const joinToken = await JoinTokenModel.create(cafeId, username, receiptId, 15);

      res.status(201).json({
        username,
        joinToken: joinToken.token,
        expiresAt: joinToken.expiresAt,
      });
    } catch (error) {
      console.error('Error generating username:', error);
      res.status(500).json({ error: 'Failed to generate username' });
    }
  }

  /**
   * POST /api/auth/join
   * User joins cafe network using barista-generated username
   */
  static async joinCafe(req: Request, res: Response): Promise<void> {
    try {
      const { username, joinToken, cafeId, wifiSsid, latitude, longitude } = req.body;

      // Validate join token
      const token = await JoinTokenModel.findByToken(joinToken);
      if (!token) {
        res.status(400).json({ error: 'Invalid or expired join token' });
        return;
      }

      // Verify token matches username and cafe
      if (token.username !== username || token.cafeId !== cafeId) {
        res.status(400).json({ error: 'Token does not match username or cafe' });
        return;
      }

      // Validate user is at the cafe (WiFi or geofencing)
      const locationValidation = await NetworkValidator.validateUserLocation({
        cafeId,
        wifiSsid,
        latitude,
        longitude,
      });

      if (!locationValidation.valid) {
        res.status(403).json({
          error: 'Location validation failed',
          message: locationValidation.message,
          method: locationValidation.method,
        });
        return;
      }

      // Check if user already exists (shouldn't happen, but handle gracefully)
      const existingUser = await UserModel.findByUsername(username, cafeId);
      if (existingUser) {
        // User already exists, just issue new tokens
        const tokens = await JWTService.generateTokenPair({
          userId: existingUser.id,
          username: existingUser.username,
          cafeId: existingUser.cafeId,
        });

        res.json({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user: existingUser,
        });
        return;
      }

      // Create new user
      const user = await UserModel.create({
        username,
        cafeId,
        receiptId: token.receiptId,
        sessionDurationHours: config.user.sessionDurationHours,
      });

      // Mark join token as used
      await JoinTokenModel.markAsUsed(joinToken);

      // Generate JWT tokens
      const tokens = await JWTService.generateTokenPair({
        userId: user.id,
        username: user.username,
        cafeId: user.cafeId,
      });

      res.status(201).json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user,
      });
    } catch (error) {
      console.error('Error joining cafe:', error);
      res.status(500).json({ error: 'Failed to join cafe' });
    }
  }

  /**
   * POST /api/auth/refresh
   * Refresh access token using refresh token
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      // Verify refresh token
      let payload;
      try {
        payload = JWTService.verifyRefreshToken(refreshToken);
      } catch (error) {
        res.status(401).json({ error: 'Invalid refresh token' });
        return;
      }

      // Check if refresh token exists and is not revoked
      const isValid = await JWTService.validateRefreshToken(refreshToken);
      if (!isValid) {
        res.status(401).json({ error: 'Refresh token revoked or expired' });
        return;
      }

      // Verify user still exists
      const user = await UserModel.findById(payload.userId);
      if (!user) {
        res.status(401).json({ error: 'User not found or expired' });
        return;
      }

      // Generate new access token
      const accessToken = JWTService.generateAccessToken({
        userId: user.id,
        username: user.username,
        cafeId: user.cafeId,
      });

      res.json({
        accessToken,
        user,
      });
    } catch (error) {
      console.error('Error refreshing token:', error);
      res.status(500).json({ error: 'Failed to refresh token' });
    }
  }

  /**
   * Helper: Generate unique username for cafe
   */
  private static async generateUniqueUsername(cafeId: string): Promise<string> {
    const adjectives = [
      'Happy',
      'Sleepy',
      'Cosmic',
      'Neon',
      'Velvet',
      'Thunder',
      'Silent',
      'Golden',
      'Mystic',
      'Electric',
    ];
    const nouns = [
      'Otter',
      'Phoenix',
      'Dragon',
      'Tiger',
      'Wolf',
      'Eagle',
      'Panda',
      'Falcon',
      'Raven',
      'Bear',
    ];

    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
      const noun = nouns[Math.floor(Math.random() * nouns.length)];
      const number = Math.floor(Math.random() * 100);
      const username = `${adjective}${noun}${number}`;

      // Check if username exists
      const existingUser = await UserModel.findByUsername(username, cafeId);
      if (!existingUser) {
        return username;
      }

      attempts++;
    }

    // Fallback: use timestamp-based username
    return `User${Date.now()}`;
  }
}
