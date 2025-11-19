import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { MessageModel } from '../models/Message';
import { redisClient } from '../db/redis';

export class ChatController {
  /**
   * GET /api/chat/messages/:cafeId
   * Get message history for a cafe
   */
  static async getMessages(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { cafeId } = req.params;
      const { limit, before } = req.query;

      const messages = await MessageModel.findByCafeId(cafeId, {
        limit: limit ? parseInt(limit as string) : 50,
        before: before ? new Date(before as string) : undefined,
      });

      // Return in chronological order (oldest first)
      res.json({ messages: messages.reverse() });
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  }

  /**
   * DELETE /api/chat/messages/:messageId
   * Delete a message (soft delete, user can only delete their own messages)
   */
  static async deleteMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { messageId } = req.params;

      // Verify message exists and belongs to user
      const message = await MessageModel.findById(messageId);

      if (!message) {
        res.status(404).json({ error: 'Message not found' });
        return;
      }

      if (message.userId !== req.user.userId) {
        res.status(403).json({ error: 'You can only delete your own messages' });
        return;
      }

      const deleted = await MessageModel.softDelete(messageId, req.user.userId);

      if (!deleted) {
        res.status(500).json({ error: 'Failed to delete message' });
        return;
      }

      res.json({ success: true, messageId });
    } catch (error) {
      console.error('Error deleting message:', error);
      res.status(500).json({ error: 'Failed to delete message' });
    }
  }

  /**
   * GET /api/chat/presence/:cafeId
   * Get active user count and presence info for a cafe
   */
  static async getPresence(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { cafeId } = req.params;
      const { includeUsers } = req.query;

      const userIds = await redisClient.sMembers(`cafe:${cafeId}:users`);
      const userCount = userIds.length;

      let userList: string[] | undefined;

      if (includeUsers === 'true') {
        // Get usernames from Redis presence data
        userList = [];
        for (const userId of userIds) {
          const presence = await redisClient.hGetAll(`user:${userId}:presence`);
          if (presence && presence.online === 'true') {
            // You might want to fetch username from DB or include it in presence
            userList.push(userId);
          }
        }
      }

      res.json({
        cafeId,
        total: userCount,
        inCafe: userCount,
        userList,
      });
    } catch (error) {
      console.error('Error fetching presence:', error);
      res.status(500).json({ error: 'Failed to fetch presence' });
    }
  }

  /**
   * GET /api/chat/topics/:cafeId
   * Get trending topics/words for a cafe
   */
  static async getTopics(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { cafeId } = req.params;
      const { limit } = req.query;

      const topicLimit = limit ? parseInt(limit as string) : 10;

      const topics = await redisClient.zRangeWithScores(
        `cafe:${cafeId}:topics`,
        0,
        topicLimit - 1,
        { REV: true }
      );

      const formattedTopics = topics.map((item) => ({
        word: item.value,
        count: item.score,
      }));

      res.json({ topics: formattedTopics });
    } catch (error) {
      console.error('Error fetching topics:', error);
      res.status(500).json({ error: 'Failed to fetch topics' });
    }
  }
}
