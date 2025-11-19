import { db } from '../db/connection';
import { DirectMessage, DMMessage } from '../types/matching.types';

export class DMService {
  /**
   * Get all DM channels for a user
   */
  async getUserChannels(userId: string): Promise<DirectMessage[]> {
    const result = await db.query(
      `SELECT
         dc.id as "channelId",
         dc.user1_id as "user1Id",
         dc.user2_id as "user2Id",
         dc.cafe_id as "cafeId",
         dc.created_at as "createdAt",
         dc.last_message_at as "lastMessageAt"
       FROM dm_channels dc
       WHERE dc.user1_id = $1 OR dc.user2_id = $1
       ORDER BY COALESCE(dc.last_message_at, dc.created_at) DESC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Get a specific DM channel
   */
  async getChannel(channelId: string, userId: string): Promise<DirectMessage | null> {
    const result = await db.query(
      `SELECT
         dc.id as "channelId",
         dc.user1_id as "user1Id",
         dc.user2_id as "user2Id",
         dc.cafe_id as "cafeId",
         dc.created_at as "createdAt",
         dc.last_message_at as "lastMessageAt"
       FROM dm_channels dc
       WHERE dc.id = $1 AND (dc.user1_id = $2 OR dc.user2_id = $2)`,
      [channelId, userId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get messages from a DM channel
   */
  async getChannelMessages(
    channelId: string,
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<DMMessage[]> {
    // First verify user has access to this channel
    const channel = await this.getChannel(channelId, userId);
    if (!channel) {
      throw new Error('Channel not found or access denied');
    }

    const result = await db.query(
      `SELECT
         dm.id,
         dm.channel_id as "channelId",
         dm.sender_id as "senderId",
         dm.content,
         dm.created_at as "createdAt"
       FROM dm_messages dm
       WHERE dm.channel_id = $1
       ORDER BY dm.created_at DESC
       LIMIT $2 OFFSET $3`,
      [channelId, limit, offset]
    );

    return result.rows.reverse(); // Return in chronological order
  }

  /**
   * Send a message in a DM channel
   */
  async sendMessage(
    channelId: string,
    senderId: string,
    content: string
  ): Promise<DMMessage> {
    // Verify user has access to this channel
    const channel = await this.getChannel(channelId, senderId);
    if (!channel) {
      throw new Error('Channel not found or access denied');
    }

    // Validate content
    if (!content || content.trim().length === 0) {
      throw new Error('Message content cannot be empty');
    }

    if (content.length > 2000) {
      throw new Error('Message content too long (max 2000 characters)');
    }

    const result = await db.query(
      `INSERT INTO dm_messages (channel_id, sender_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, channel_id as "channelId", sender_id as "senderId",
                 content, created_at as "createdAt"`,
      [channelId, senderId, content.trim()]
    );

    return result.rows[0];
  }

  /**
   * Create a DM channel between two users
   */
  async createChannel(
    user1Id: string,
    user2Id: string,
    cafeId?: string
  ): Promise<DirectMessage> {
    if (user1Id === user2Id) {
      throw new Error('Cannot create DM channel with yourself');
    }

    // Ensure user1_id < user2_id for uniqueness constraint
    const [sortedUser1, sortedUser2] = [user1Id, user2Id].sort();

    const result = await db.query(
      `INSERT INTO dm_channels (user1_id, user2_id, cafe_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user1_id, user2_id) DO UPDATE
       SET last_message_at = dm_channels.last_message_at
       RETURNING id as "channelId", user1_id as "user1Id", user2_id as "user2Id",
                 cafe_id as "cafeId", created_at as "createdAt",
                 last_message_at as "lastMessageAt"`,
      [sortedUser1, sortedUser2, cafeId || null]
    );

    return result.rows[0];
  }

  /**
   * Get the other user in a DM channel
   */
  getOtherUserId(channel: DirectMessage, currentUserId: string): string {
    return channel.user1Id === currentUserId ? channel.user2Id : channel.user1Id;
  }

  /**
   * Delete a message (soft delete by updating content)
   */
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const result = await db.query(
      `UPDATE dm_messages
       SET content = '[Message deleted]'
       WHERE id = $1 AND sender_id = $2`,
      [messageId, userId]
    );

    if (result.rowCount === 0) {
      throw new Error('Message not found or you do not have permission to delete it');
    }
  }
}

export default new DMService();
