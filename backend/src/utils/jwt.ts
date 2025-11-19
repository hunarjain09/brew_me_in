import jwt from 'jsonwebtoken';
import { config } from '../config';
import { JWTPayload, AuthTokens } from '../types';
import { db } from '../db/connection';
import crypto from 'crypto';

export class JWTService {
  static generateAccessToken(payload: JWTPayload): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
  }

  static generateRefreshToken(payload: JWTPayload): string {
    return jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
    });
  }

  static async generateTokenPair(payload: JWTPayload): Promise<AuthTokens> {
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    // Store refresh token in database
    await this.storeRefreshToken(payload.userId, refreshToken);

    return {
      accessToken,
      refreshToken,
    };
  }

  static verifyAccessToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, config.jwt.secret) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }

  static verifyRefreshToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, config.jwt.refreshSecret) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  static async storeRefreshToken(userId: string, token: string): Promise<void> {
    const expiresAt = new Date();
    // Assuming 7 days for refresh token
    expiresAt.setDate(expiresAt.getDate() + 7);

    const query = `
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES ($1, $2, $3)
    `;

    await db.query(query, [userId, token, expiresAt]);
  }

  static async validateRefreshToken(token: string): Promise<boolean> {
    const query = `
      SELECT * FROM refresh_tokens
      WHERE token = $1 AND expires_at > NOW() AND revoked = false
    `;

    const result = await db.query(query, [token]);
    return result.rows.length > 0;
  }

  static async revokeRefreshToken(token: string): Promise<void> {
    const query = `
      UPDATE refresh_tokens
      SET revoked = true
      WHERE token = $1
    `;

    await db.query(query, [token]);
  }

  static async revokeAllUserTokens(userId: string): Promise<void> {
    const query = `
      UPDATE refresh_tokens
      SET revoked = true
      WHERE user_id = $1
    `;

    await db.query(query, [userId]);
  }

  static async cleanupExpiredTokens(): Promise<void> {
    const query = `
      DELETE FROM refresh_tokens
      WHERE expires_at < NOW()
    `;

    await db.query(query);
  }
}
