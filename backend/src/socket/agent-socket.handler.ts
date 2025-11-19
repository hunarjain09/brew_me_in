import { Server, Socket } from 'socket.io';
import claudeAgentService from '../services/claude-agent.service';
import redisCacheService from '../services/redis-cache.service';
import { AgentConfig, CafeContext } from '../types/agent.types';

/**
 * Agent Socket Handler
 * Manages WebSocket connections for streaming agent responses
 */

// In-memory storage (replace with database in production)
const agentConfigs: Map<string, AgentConfig> = new Map();
const cafeContexts: Map<string, CafeContext> = new Map();

function getOrCreateAgentConfig(cafeId: string): AgentConfig {
  if (!agentConfigs.has(cafeId)) {
    const defaultConfig: AgentConfig = {
      cafeId,
      personality: 'bartender',
      proactivity: 'occasional',
      enabledQueries: ['orders', 'stats', 'menu', 'events', 'community'],
      maxTokens: 300,
      temperature: 0.7,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    agentConfigs.set(cafeId, defaultConfig);
  }
  return agentConfigs.get(cafeId)!;
}

function getOrCreateCafeContext(cafeId: string): CafeContext {
  if (!cafeContexts.has(cafeId)) {
    const defaultContext: CafeContext = {
      cafeId,
      cafeName: `Cafe ${cafeId}`,
      orderStats: [],
      peakHours: [],
      popularInterests: [],
      upcomingEvents: [],
      customKnowledge: '',
      totalCustomers: 0,
      averageOrderValue: 0,
    };
    cafeContexts.set(cafeId, defaultContext);
  }
  return cafeContexts.get(cafeId)!;
}

export function initializeAgentSocket(io: Server): void {
  // Create a namespace for agent operations
  const agentNamespace = io.of('/agent');

  agentNamespace.on('connection', (socket: Socket) => {
    console.log(`Agent client connected: ${socket.id}`);

    // Handle streaming query
    socket.on('query:stream', async (data: {
      cafeId: string;
      question: string;
      userId: string;
    }) => {
      try {
        const { cafeId, question, userId } = data;

        // Validate input
        if (!cafeId || !question || !userId) {
          socket.emit('query:error', {
            error: 'Missing required fields: cafeId, question, userId',
          });
          return;
        }

        // Validate question
        const validation = await claudeAgentService.validateQuestion(question);
        if (!validation.valid) {
          socket.emit('query:error', {
            error: validation.reason,
          });
          return;
        }

        // Check rate limits
        const globalAllowed = await redisCacheService.checkGlobalRateLimit();
        if (!globalAllowed) {
          socket.emit('query:error', {
            error: 'Global rate limit exceeded. Please try again in a moment.',
          });
          return;
        }

        const userLimit = await redisCacheService.checkUserRateLimit(userId);
        if (!userLimit.allowed) {
          socket.emit('query:error', {
            error: 'Daily query limit reached. Please try again tomorrow.',
            remaining: 0,
          });
          return;
        }

        // Get config and context
        const config = getOrCreateAgentConfig(cafeId);
        const context = getOrCreateCafeContext(cafeId);

        // Start streaming
        socket.emit('query:start', {
          queryId: `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        });

        const startTime = Date.now();

        await claudeAgentService.queryAgentStream(
          question,
          config,
          context,
          // On chunk
          (chunk: string) => {
            socket.emit('query:chunk', { chunk });
          },
          // On complete
          (fullResponse: string) => {
            const responseTime = Date.now() - startTime;
            socket.emit('query:complete', {
              response: fullResponse,
              responseTime,
              remaining: userLimit.remaining,
            });

            // Track analytics (without waiting)
            redisCacheService.trackQuery(cafeId, question, responseTime, false).catch(err => {
              console.error('Error tracking query:', err);
            });
          },
          // On error
          (error: Error) => {
            socket.emit('query:error', {
              error: error.message || 'An error occurred while processing your query',
            });
          }
        );
      } catch (error) {
        console.error('Error in streaming query:', error);
        socket.emit('query:error', {
          error: 'Internal server error',
        });
      }
    });

    // Join cafe room for proactive messages
    socket.on('cafe:join', (data: { cafeId: string; userId: string }) => {
      const { cafeId, userId } = data;
      if (cafeId) {
        socket.join(`cafe:${cafeId}`);
        console.log(`User ${userId} joined cafe ${cafeId}`);
        socket.emit('cafe:joined', { cafeId });
      }
    });

    // Leave cafe room
    socket.on('cafe:leave', (data: { cafeId: string }) => {
      const { cafeId } = data;
      if (cafeId) {
        socket.leave(`cafe:${cafeId}`);
        socket.emit('cafe:left', { cafeId });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`Agent client disconnected: ${socket.id}`);
    });
  });

  console.log('Agent socket namespace initialized');
}

/**
 * Broadcast a proactive message to all users in a cafe
 */
export function broadcastProactiveMessage(
  io: Server,
  cafeId: string,
  message: string,
  metadata?: Record<string, any>
): void {
  const agentNamespace = io.of('/agent');
  agentNamespace.to(`cafe:${cafeId}`).emit('proactive:message', {
    message,
    cafeId,
    timestamp: new Date(),
    metadata,
  });
}
