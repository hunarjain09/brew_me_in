import { Server as SocketIOServer } from 'socket.io';
import { ChatAgentModel } from '../models/ChatAgent';
import { MessageModel } from '../models/Message';
import { AgentInteractionModel } from '../models/AgentInteraction';
import { AgentRateLimitModel } from '../models/AgentRateLimit';
import { AgentContextModel } from '../models/AgentContext';
import { MessageParserService, MentionParseResult } from './message-parser.service';
import claudeAgentService from './claude-agent.service';
import { Message, ChatAgent, ServerToClientEvents, ClientToServerEvents } from '../types';
import { config } from '../config/env';

/**
 * AgentMessageRouter Service
 * Routes messages to agents and handles streaming responses
 */

export class AgentMessageRouterService {
  private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents> | null = null;

  // Rate limit configuration (can be made configurable per cafe/agent)
  private readonly DEFAULT_MAX_MESSAGES = 10;
  private readonly DEFAULT_WINDOW_MINUTES = 60;

  /**
   * Initialize with Socket.IO server
   */
  initialize(io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>): void {
    this.io = io;
  }

  /**
   * Route a user message to appropriate agents
   */
  async routeMessage(
    message: Message,
    userId: string
  ): Promise<void> {
    try {
      // Parse message for mentions
      const parseResult = MessageParserService.parseMentions(message.content);

      if (!parseResult.hasAgentMention) {
        return; // No agent mentioned
      }

      // Get cafe agent
      const agent = await ChatAgentModel.findByCafeId(message.cafeId);

      if (!agent || !agent.enabled) {
        console.log(`No enabled agent found for cafe ${message.cafeId}`);
        return;
      }

      // Check if this agent was mentioned
      const isMentioned = parseResult.mentionedAgents.includes(agent.username.toLowerCase());

      if (!isMentioned) {
        return; // This agent wasn't mentioned
      }

      // Process the agent response
      await this.processAgentResponse(agent, message, userId, parseResult);

    } catch (error) {
      console.error('Error routing message to agent:', error);
    }
  }

  /**
   * Process agent response to a message
   */
  private async processAgentResponse(
    agent: ChatAgent,
    userMessage: Message,
    userId: string,
    parseResult: MentionParseResult
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Check rate limit
      const rateLimitCheck = await AgentRateLimitModel.check(
        userId,
        agent.id,
        this.DEFAULT_MAX_MESSAGES,
        this.DEFAULT_WINDOW_MINUTES
      );

      if (!rateLimitCheck.allowed) {
        // Emit rate limit error
        if (this.io) {
          this.io.to(`cafe:${agent.cafeId}`).emit('agent:rate_limit', {
            message: `You've reached the message limit. Please try again in ${Math.ceil(rateLimitCheck.secondsUntilReset! / 60)} minutes.`,
            resetAt: rateLimitCheck.windowResetAt!,
            secondsUntilReset: rateLimitCheck.secondsUntilReset!,
          });
        }

        // Log interaction as rate limited
        await AgentInteractionModel.create({
          agentId: agent.id,
          userId,
          messageId: userMessage.id,
          interactionType: 'mention',
          query: userMessage.content,
          success: false,
          errorMessage: 'Rate limit exceeded',
          processingTimeMs: Date.now() - startTime,
        });

        return;
      }

      // Validate message content
      const validation = MessageParserService.validateContent(parseResult.cleanedContent);
      if (!validation.valid) {
        console.log(`Invalid message content: ${validation.reason}`);
        return;
      }

      // Set agent status to 'busy' and emit typing indicator
      await ChatAgentModel.updateStatus(agent.id, 'busy');

      if (this.io) {
        this.io.to(`cafe:${agent.cafeId}`).emit('agent:typing', {
          agentName: agent.name,
          agentUsername: agent.username,
          cafeId: agent.cafeId,
          isTyping: true,
        });
      }

      // Create initial streaming message
      const agentMessage = await MessageModel.create({
        username: agent.username,
        cafeId: agent.cafeId,
        content: '',
        messageType: 'agent',
        agentId: agent.id,
        replyToMessageId: userMessage.id,
        isStreaming: true,
      });

      // Emit response start
      if (this.io) {
        this.io.to(`cafe:${agent.cafeId}`).emit('agent:response:start', {
          agentId: agent.id,
          messageId: agentMessage.id,
          cafeId: agent.cafeId,
        });
      }

      // Build context for Claude
      const context = await this.buildAgentContext(agent, userMessage.cafeId);

      // Build agent config
      const agentConfig = {
        cafeId: agent.cafeId,
        personality: agent.personality,
        customPrompt: agent.customPrompt,
        proactivity: agent.proactivity,
        enabledQueries: ['orders', 'stats', 'menu', 'events', 'community'] as any[],
        maxTokens: 500,
        temperature: 0.7,
      };

      let fullResponse = '';

      // Stream response from Claude
      await claudeAgentService.queryAgentStream(
        parseResult.cleanedContent,
        agentConfig,
        context,
        // onChunk
        (chunk: string) => {
          fullResponse += chunk;

          if (this.io) {
            this.io.to(`cafe:${agent.cafeId}`).emit('agent:response:chunk', {
              messageId: agentMessage.id,
              chunk,
              cafeId: agent.cafeId,
            });
          }
        },
        // onComplete
        async (response: string) => {
          const processingTime = Date.now() - startTime;

          // Update message with full response
          await MessageModel.updateContent(agentMessage.id, response);

          // Emit completion
          if (this.io) {
            this.io.to(`cafe:${agent.cafeId}`).emit('agent:response:complete', {
              messageId: agentMessage.id,
              fullMessage: response,
              cafeId: agent.cafeId,
            });

            // Stop typing indicator
            this.io.to(`cafe:${agent.cafeId}`).emit('agent:typing', {
              agentName: agent.name,
              agentUsername: agent.username,
              cafeId: agent.cafeId,
              isTyping: false,
            });
          }

          // Set agent back to online
          await ChatAgentModel.updateStatus(agent.id, 'online');

          // Increment rate limit
          await AgentRateLimitModel.increment(userId, agent.id);

          // Log interaction
          await AgentInteractionModel.create({
            agentId: agent.id,
            userId,
            messageId: agentMessage.id,
            interactionType: 'mention',
            query: parseResult.cleanedContent,
            response,
            processingTimeMs: processingTime,
            tokenCount: Math.ceil(response.length / 4), // Rough estimate
            success: true,
          });

          console.log(`Agent ${agent.name} responded in ${processingTime}ms`);
        },
        // onError
        async (error: Error) => {
          console.error('Error in agent streaming:', error);

          // Update message with error response
          const errorResponse = "I'm having trouble responding right now. Please try again in a moment!";
          await MessageModel.updateContent(agentMessage.id, errorResponse);

          // Emit error completion
          if (this.io) {
            this.io.to(`cafe:${agent.cafeId}`).emit('agent:response:complete', {
              messageId: agentMessage.id,
              fullMessage: errorResponse,
              cafeId: agent.cafeId,
            });

            // Stop typing indicator
            this.io.to(`cafe:${agent.cafeId}`).emit('agent:typing', {
              agentName: agent.name,
              agentUsername: agent.username,
              cafeId: agent.cafeId,
              isTyping: false,
            });
          }

          // Set agent back to online
          await ChatAgentModel.updateStatus(agent.id, 'online');

          // Log failed interaction
          await AgentInteractionModel.create({
            agentId: agent.id,
            userId,
            messageId: agentMessage.id,
            interactionType: 'mention',
            query: parseResult.cleanedContent,
            response: errorResponse,
            processingTimeMs: Date.now() - startTime,
            success: false,
            errorMessage: error.message,
          });
        }
      );

    } catch (error) {
      console.error('Error processing agent response:', error);

      // Make sure agent is back online
      await ChatAgentModel.updateStatus(agent.id, 'online');

      // Stop typing indicator
      if (this.io) {
        this.io.to(`cafe:${agent.cafeId}`).emit('agent:typing', {
          agentName: agent.name,
          agentUsername: agent.username,
          cafeId: agent.cafeId,
          isTyping: false,
        });
      }
    }
  }

  /**
   * Build context for agent from conversation history and admin context
   */
  private async buildAgentContext(agent: ChatAgent, cafeId: string): Promise<any> {
    // Get recent messages for context
    const recentMessages = await MessageModel.findByCafeId(cafeId, { limit: 20 });

    // Get admin-configured context
    const adminContext = await AgentContextModel.getEnabledByAgentId(agent.id);

    // Build conversation history
    const conversationHistory = recentMessages
      .reverse()
      .map(msg => `${msg.username}: ${msg.content}`)
      .join('\n');

    // Build context object
    const context: any = {
      cafeName: 'Cafe', // TODO: Get actual cafe name
      conversationHistory,
      recentTopics: MessageParserService.extractTopics(conversationHistory),
    };

    // Add admin context
    if (adminContext.length > 0) {
      context.adminInstructions = adminContext
        .map(ctx => `${ctx.contextType}: ${ctx.content}`)
        .join('\n\n');
    }

    return context;
  }

  /**
   * Send proactive message from agent
   */
  async sendProactiveMessage(
    cafeId: string,
    trigger: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const agent = await ChatAgentModel.findByCafeId(cafeId);

      if (!agent || !agent.enabled) {
        return;
      }

      // Check if agent allows proactive messages
      if (agent.proactivity === 'silent') {
        return;
      }

      const context = await this.buildAgentContext(agent, cafeId);

      const agentConfig = {
        cafeId: agent.cafeId,
        personality: agent.personality,
        customPrompt: agent.customPrompt,
        proactivity: agent.proactivity,
        enabledQueries: ['orders', 'stats', 'menu', 'events', 'community'] as any[],
      };

      const message = await claudeAgentService.generateProactiveMessage(
        agentConfig,
        context,
        trigger,
        metadata
      );

      // Create message in database
      const agentMessage = await MessageModel.create({
        username: agent.username,
        cafeId: agent.cafeId,
        content: message,
        messageType: 'agent',
        agentId: agent.id,
      });

      // Broadcast to cafe
      if (this.io) {
        this.io.to(`cafe:${cafeId}`).emit('message:new', agentMessage);
      }

      // Log interaction
      await AgentInteractionModel.create({
        agentId: agent.id,
        interactionType: 'proactive',
        query: trigger,
        response: message,
        success: true,
        metadata,
      });

    } catch (error) {
      console.error('Error sending proactive message:', error);
    }
  }

  /**
   * Get list of active agents for a cafe
   */
  async getActiveAgents(cafeId: string): Promise<ChatAgent[]> {
    return ChatAgentModel.getEnabledByCafeId(cafeId);
  }
}

export default new AgentMessageRouterService();
