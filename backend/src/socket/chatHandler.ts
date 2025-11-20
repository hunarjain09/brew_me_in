import { Server, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  JWTPayload,
  Message,
} from '../types';
import { redisClient } from '../db/redis';
import { MessageModel } from '../models/Message';
import { config } from '../config';
import { CafeModel } from '../models/Cafe';
import agentMessageRouter from '../services/agent-message-router.service';
import { MessageParserService } from '../services/message-parser.service';

export class ChatHandler {
  private io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

  constructor(httpServer: HTTPServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: config.cors.origin,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingInterval: 25000,
      pingTimeout: 60000,
    });

    this.setupMiddleware();
    this.setupEventHandlers();

    // Initialize agent message router with socket.io instance
    agentMessageRouter.initialize(this.io);
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      try {
        const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;

        socket.data.userId = decoded.userId;
        socket.data.username = decoded.username;
        socket.data.cafeId = decoded.cafeId;

        next();
      } catch (error) {
        next(new Error('Invalid token'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`✅ User connected: ${socket.data.username} (${socket.data.userId})`);

      socket.emit('connected', {
        userId: socket.data.userId,
        cafeId: socket.data.cafeId,
      });

      this.handleJoinCafe(socket);
      this.handleLeaveCafe(socket);
      this.handleSendMessage(socket);
      this.handleTyping(socket);
      this.handlePresenceUpdate(socket);
      this.handleAgentList(socket);
      this.handleAgentMention(socket);
      this.handleDisconnect(socket);
    });
  }

  private handleJoinCafe(socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) {
    socket.on('join:cafe', async (data) => {
      try {
        const { cafeId, userId } = data;

        // Verify cafe exists
        const cafe = await CafeModel.findById(cafeId);
        if (!cafe) {
          socket.emit('error', { message: 'Cafe not found', code: 'CAFE_NOT_FOUND' });
          return;
        }

        // Leave previous cafe if any
        if (socket.data.cafeId && socket.data.cafeId !== cafeId) {
          await this.leaveCafeRoom(socket, socket.data.cafeId);
        }

        // Join new cafe room
        socket.join(cafeId);
        socket.data.cafeId = cafeId;

        // Add to Redis set
        await redisClient.sAdd(`cafe:${cafeId}:users`, userId);
        await redisClient.expire(`cafe:${cafeId}:users`, 1800); // 30 minutes

        // Set user presence
        await redisClient.hSet(`user:${userId}:presence`, {
          online: 'true',
          inCafe: 'true',
          cafeId,
          lastSeen: new Date().toISOString(),
        });
        await redisClient.expire(`user:${userId}:presence`, 3600); // 1 hour

        // Load recent messages from cache
        const cachedMessages = await redisClient.lRange(`cafe:${cafeId}:messages`, 0, 49);

        // If cache is empty, load from database
        if (cachedMessages.length === 0) {
          const dbMessages = await MessageModel.findByCafeId(cafeId, { limit: 50 });
          // Send messages in chronological order
          dbMessages.reverse().forEach((msg) => {
            socket.emit('message:new', msg);
          });
        } else {
          // Send cached messages (already in chronological order)
          cachedMessages.reverse().forEach((msgStr) => {
            const msg = JSON.parse(msgStr);
            socket.emit('message:new', msg);
          });
        }

        // Update user count
        const userCount = await redisClient.sCard(`cafe:${cafeId}:users`);
        this.io.to(cafeId).emit('users:update', {
          total: userCount,
          inCafe: userCount, // For now, assume all connected users are in cafe
        });

        // Send current live topics
        const topics = await this.getTopTopics(cafeId, 10);
        socket.emit('topics:update', { topics });

        console.log(`📍 ${socket.data.username} joined cafe ${cafeId}`);

        // System message
        const systemMessage: Message = {
          id: crypto.randomUUID(),
          userId: null,
          username: 'System',
          cafeId,
          content: `${socket.data.username} joined the chat`,
          messageType: 'system',
          createdAt: new Date(),
        };

        this.io.to(cafeId).emit('message:new', systemMessage);
      } catch (error) {
        console.error('Error joining cafe:', error);
        socket.emit('error', { message: 'Failed to join cafe', code: 'JOIN_ERROR' });
      }
    });
  }

  private handleLeaveCafe(socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) {
    socket.on('leave:cafe', async (data) => {
      const { cafeId } = data;
      await this.leaveCafeRoom(socket, cafeId);
    });
  }

  private async leaveCafeRoom(socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>, cafeId: string) {
    try {
      socket.leave(cafeId);

      await redisClient.sRem(`cafe:${cafeId}:users`, socket.data.userId);

      // Update user count
      const userCount = await redisClient.sCard(`cafe:${cafeId}:users`);
      this.io.to(cafeId).emit('users:update', {
        total: userCount,
        inCafe: userCount,
      });

      // System message
      const systemMessage: Message = {
        id: crypto.randomUUID(),
        userId: null,
        username: 'System',
        cafeId,
        content: `${socket.data.username} left the chat`,
        messageType: 'system',
        createdAt: new Date(),
      };

      this.io.to(cafeId).emit('message:new', systemMessage);

      if (socket.data.cafeId === cafeId) {
        socket.data.cafeId = undefined;
      }

      console.log(`👋 ${socket.data.username} left cafe ${cafeId}`);
    } catch (error) {
      console.error('Error leaving cafe:', error);
    }
  }

  private handleSendMessage(socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) {
    socket.on('message:send', async (data) => {
      try {
        const { content, cafeId } = data;

        if (!content || content.trim().length === 0) {
          socket.emit('error', { message: 'Message cannot be empty', code: 'EMPTY_MESSAGE' });
          return;
        }

        if (content.length > 1000) {
          socket.emit('error', { message: 'Message too long (max 1000 characters)', code: 'MESSAGE_TOO_LONG' });
          return;
        }

        // Rate limiting check
        const rateLimitKey = `message:ratelimit:${socket.data.userId}`;
        const current = await redisClient.incr(rateLimitKey);
        if (current === 1) {
          await redisClient.expire(rateLimitKey, 60); // 1 minute window
        }

        if (current > 30) {
          socket.emit('error', { message: 'Sending too fast. Please slow down.', code: 'RATE_LIMIT' });
          return;
        }

        // Create message
        const message = await MessageModel.create({
          userId: socket.data.userId,
          username: socket.data.username,
          cafeId,
          content: content.trim(),
          messageType: 'user',
        });

        // Cache in Redis (prepend to list)
        await redisClient.lPush(`cafe:${cafeId}:messages`, JSON.stringify(message));
        await redisClient.lTrim(`cafe:${cafeId}:messages`, 0, 99); // Keep last 100
        await redisClient.expire(`cafe:${cafeId}:messages`, 3600); // 1 hour

        // Extract and track topics (simple word frequency)
        const words = content
          .toLowerCase()
          .split(/\s+/)
          .filter((word) => word.length > 4 && !['https', 'http'].some((prefix) => word.startsWith(prefix)));

        for (const word of words) {
          await redisClient.zIncrBy(`cafe:${cafeId}:topics`, 1, word);
        }
        await redisClient.expire(`cafe:${cafeId}:topics`, 3600); // 1 hour

        // Broadcast to all users in cafe
        this.io.to(cafeId).emit('message:new', message);

        // Check for agent mentions and route to agent
        const parsedMessage = MessageParserService.parseMentions(content);
        if (parsedMessage.hasAgentMention) {
          // Route message to agent (async, don't await)
          agentMessageRouter.routeMessage(message, socket.data.userId).catch((error) => {
            console.error('Error routing message to agent:', error);
          });
        }

        // Periodically send updated topics (every 10th message)
        const messageCount = await MessageModel.getRecentCount(cafeId, 5);
        if (messageCount % 10 === 0) {
          const topics = await this.getTopTopics(cafeId, 10);
          this.io.to(cafeId).emit('topics:update', { topics });
        }

        console.log(`💬 Message from ${socket.data.username} in cafe ${cafeId}`);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message', code: 'SEND_ERROR' });
      }
    });
  }

  private handleTyping(socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) {
    socket.on('typing:start', (data) => {
      const { cafeId } = data;
      socket.to(cafeId).emit('typing:indicator', {
        username: socket.data.username,
        cafeId,
      });
    });

    socket.on('typing:stop', (data) => {
      // Could implement typing stop indicator if needed
    });
  }

  private handlePresenceUpdate(socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) {
    socket.on('presence:update', async (data) => {
      const { inCafe, cafeId } = data;

      await redisClient.hSet(`user:${socket.data.userId}:presence`, {
        online: 'true',
        inCafe: inCafe.toString(),
        cafeId: cafeId || '',
        lastSeen: new Date().toISOString(),
      });
      await redisClient.expire(`user:${socket.data.userId}:presence`, 3600);

      if (cafeId) {
        const userCount = await redisClient.sCard(`cafe:${cafeId}:users`);
        this.io.to(cafeId).emit('users:update', {
          total: userCount,
          inCafe: userCount,
        });
      }
    });
  }

  private handleAgentList(socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) {
    socket.on('agent:list', async (data) => {
      try {
        const { cafeId } = data;
        const agents = await agentMessageRouter.getActiveAgents(cafeId);

        socket.emit('agents:list', { agents });
      } catch (error) {
        console.error('Error getting agent list:', error);
        socket.emit('error', { message: 'Failed to get agents', code: 'AGENT_LIST_ERROR' });
      }
    });
  }

  private handleAgentMention(socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) {
    socket.on('agent:mention', async (data) => {
      try {
        const { agentUsername, message: messageContent, cafeId } = data;

        if (!messageContent || messageContent.trim().length === 0) {
          socket.emit('error', { message: 'Message cannot be empty', code: 'EMPTY_MESSAGE' });
          return;
        }

        // Create message with agent mention
        const message = await MessageModel.create({
          userId: socket.data.userId,
          username: socket.data.username,
          cafeId,
          content: `@${agentUsername} ${messageContent}`.trim(),
          messageType: 'user',
          mentionedAgents: [agentUsername],
        });

        // Broadcast to cafe
        this.io.to(cafeId).emit('message:new', message);

        // Route to agent
        await agentMessageRouter.routeMessage(message, socket.data.userId);

        console.log(`🤖 Agent ${agentUsername} mentioned by ${socket.data.username}`);
      } catch (error) {
        console.error('Error handling agent mention:', error);
        socket.emit('error', { message: 'Failed to mention agent', code: 'AGENT_MENTION_ERROR' });
      }
    });
  }

  private handleDisconnect(socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) {
    socket.on('disconnect', async () => {
      console.log(`❌ User disconnected: ${socket.data.username}`);

      if (socket.data.cafeId) {
        await this.leaveCafeRoom(socket, socket.data.cafeId);
      }

      await redisClient.hSet(`user:${socket.data.userId}:presence`, {
        online: 'false',
        inCafe: 'false',
        lastSeen: new Date().toISOString(),
      });
      await redisClient.expire(`user:${socket.data.userId}:presence`, 3600);
    });
  }

  private async getTopTopics(cafeId: string, limit: number): Promise<{ word: string; count: number }[]> {
    try {
      const topics = await redisClient.zRangeWithScores(`cafe:${cafeId}:topics`, 0, limit - 1, { REV: true });
      return topics.map((item) => ({
        word: item.value,
        count: item.score,
      }));
    } catch (error) {
      console.error('Error getting topics:', error);
      return [];
    }
  }

  public getIO() {
    return this.io;
  }
}
