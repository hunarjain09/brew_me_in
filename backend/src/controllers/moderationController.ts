import { Request, Response } from 'express';
import { db } from '../db/connection';
import { MessageModel } from '../models/Message';
import { apiResponse } from '../utils/apiResponse';
import redisClient from '../config/redis';

/**
 * Component 6: Moderation Actions Controller
 * Handles mute, ban, delete message operations
 */

/**
 * Mute a user
 * POST /api/admin/moderation/mute
 */
export const muteUser = async (req: Request, res: Response) => {
  try {
    const { userId, duration, reason } = req.body;
    const moderatorId = req.user?.id;
    const cafeId = req.user?.cafeId;

    if (!userId || !duration) {
      return apiResponse.error(res, 'userId and duration are required', 400);
    }

    // Record moderation action in database
    await db.query(
      `INSERT INTO moderation_actions (moderator_id, target_user_id, action, reason, duration)
       VALUES ($1, $2, 'mute', $3, $4)`,
      [moderatorId, userId, reason || 'No reason provided', duration]
    );

    // Add to Redis for fast lookup
    const muteKey = `mute:${cafeId}:${userId}`;
    const muteUntil = Date.now() + duration * 60 * 1000;
    await redisClient.set(muteKey, muteUntil.toString(), {
      EX: duration * 60,
    });

    return apiResponse.success(res, {
      message: 'User muted successfully',
      mutedUntil: new Date(muteUntil),
    });
  } catch (error) {
    console.error('Mute user error:', error);
    return apiResponse.error(res, 'Failed to mute user', 500);
  }
};

/**
 * Unmute a user
 * POST /api/admin/moderation/unmute
 */
export const unmuteUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const moderatorId = req.user?.id;
    const cafeId = req.user?.cafeId;

    if (!userId) {
      return apiResponse.error(res, 'userId is required', 400);
    }

    // Record moderation action
    await db.query(
      `INSERT INTO moderation_actions (moderator_id, target_user_id, action)
       VALUES ($1, $2, 'unmute')`,
      [moderatorId, userId]
    );

    // Remove from Redis
    const muteKey = `mute:${cafeId}:${userId}`;
    await redisClient.del(muteKey);

    return apiResponse.success(res, {
      message: 'User unmuted successfully',
    });
  } catch (error) {
    console.error('Unmute user error:', error);
    return apiResponse.error(res, 'Failed to unmute user', 500);
  }
};

/**
 * Ban a user
 * POST /api/admin/moderation/ban
 */
export const banUser = async (req: Request, res: Response) => {
  try {
    const { userId, reason, permanent = true } = req.body;
    const moderatorId = req.user?.id;

    if (!userId) {
      return apiResponse.error(res, 'userId is required', 400);
    }

    // Update user banned status
    await db.query('UPDATE users SET is_banned = true WHERE id = $1', [
      userId,
    ]);

    // Record moderation action
    await db.query(
      `INSERT INTO moderation_actions (moderator_id, target_user_id, action, reason, metadata)
       VALUES ($1, $2, 'ban', $3, $4)`,
      [
        moderatorId,
        userId,
        reason || 'No reason provided',
        JSON.stringify({ permanent }),
      ]
    );

    return apiResponse.success(res, {
      message: 'User banned successfully',
    });
  } catch (error) {
    console.error('Ban user error:', error);
    return apiResponse.error(res, 'Failed to ban user', 500);
  }
};

/**
 * Unban a user
 * POST /api/admin/moderation/unban
 */
export const unbanUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const moderatorId = req.user?.id;

    if (!userId) {
      return apiResponse.error(res, 'userId is required', 400);
    }

    // Update user banned status
    await db.query('UPDATE users SET is_banned = false WHERE id = $1', [
      userId,
    ]);

    // Record moderation action
    await db.query(
      `INSERT INTO moderation_actions (moderator_id, target_user_id, action)
       VALUES ($1, $2, 'unban')`,
      [moderatorId, userId]
    );

    return apiResponse.success(res, {
      message: 'User unbanned successfully',
    });
  } catch (error) {
    console.error('Unban user error:', error);
    return apiResponse.error(res, 'Failed to unban user', 500);
  }
};

/**
 * Delete a message (soft delete)
 * DELETE /api/admin/moderation/messages/:messageId
 */
export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const { reason } = req.body;
    const moderatorId = req.user?.id;
    const cafeId = req.user?.cafeId;

    if (!messageId) {
      return apiResponse.error(res, 'messageId is required', 400);
    }

    // Get message to find user_id
    const message = await MessageModel.findById(messageId);

    if (!message) {
      return apiResponse.error(res, 'Message not found', 404);
    }

    // Soft delete the message
    const deleted = await MessageModel.moderatorDelete(messageId, cafeId!);

    if (!deleted) {
      return apiResponse.error(res, 'Failed to delete message', 400);
    }

    // Record moderation action
    if (message.userId) {
      await db.query(
        `INSERT INTO moderation_actions (moderator_id, target_user_id, action, reason, metadata)
         VALUES ($1, $2, 'delete_message', $3, $4)`,
        [
          moderatorId,
          message.userId,
          reason || 'No reason provided',
          JSON.stringify({ messageId }),
        ]
      );
    }

    return apiResponse.success(res, {
      message: 'Message deleted successfully',
    });
  } catch (error) {
    console.error('Delete message error:', error);
    return apiResponse.error(res, 'Failed to delete message', 500);
  }
};

/**
 * Get moderation history
 * GET /api/admin/moderation/history
 */
export const getModerationHistory = async (req: Request, res: Response) => {
  try {
    const cafeId = req.user?.cafeId;
    const { limit = 50, offset = 0, action, userId } = req.query;

    let queryText = `
      SELECT ma.*,
             u.username as target_username,
             m.email as moderator_email
      FROM moderation_actions ma
      JOIN users u ON ma.target_user_id = u.id
      JOIN moderators m ON ma.moderator_id = m.id
      WHERE u.cafe_id = $1
    `;

    const params: any[] = [cafeId];
    let paramIndex = 2;

    if (action) {
      queryText += ` AND ma.action = $${paramIndex}`;
      params.push(action);
      paramIndex++;
    }

    if (userId) {
      queryText += ` AND ma.target_user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    queryText += ` ORDER BY ma.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(queryText, params);

    return apiResponse.success(res, {
      actions: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Get moderation history error:', error);
    return apiResponse.error(res, 'Failed to fetch moderation history', 500);
  }
};

/**
 * Get user list with moderation status
 * GET /api/admin/users
 */
export const getUsersForModeration = async (req: Request, res: Response) => {
  try {
    const cafeId = req.user?.cafeId;
    const { search, banned, limit = 100, offset = 0 } = req.query;

    let queryText = `
      SELECT u.*,
             COUNT(m.id) as message_count,
             MAX(m.created_at) as last_message_at
      FROM users u
      LEFT JOIN messages m ON u.id = m.user_id
      WHERE u.cafe_id = $1
    `;

    const params: any[] = [cafeId];
    let paramIndex = 2;

    if (search) {
      queryText += ` AND (u.username ILIKE $${paramIndex} OR u.receipt_id ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (banned !== undefined) {
      queryText += ` AND u.is_banned = $${paramIndex}`;
      params.push(banned === 'true');
      paramIndex++;
    }

    queryText += `
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const result = await db.query(queryText, params);

    // Check muted status from Redis for each user
    const users = await Promise.all(
      result.rows.map(async (user) => {
        const muteKey = `mute:${cafeId}:${user.id}`;
        const muteUntil = await redisClient.get(muteKey);

        return {
          ...user,
          is_muted: !!muteUntil,
          muted_until: muteUntil ? new Date(parseInt(muteUntil)) : null,
        };
      })
    );

    return apiResponse.success(res, {
      users,
      count: users.length,
    });
  } catch (error) {
    console.error('Get users error:', error);
    return apiResponse.error(res, 'Failed to fetch users', 500);
  }
};
