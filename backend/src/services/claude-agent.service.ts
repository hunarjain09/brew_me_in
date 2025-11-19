import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config/env';
import { AgentConfig, CafeContext, AgentQueryResponse, ProactiveMessage } from '../types/agent.types';
import promptBuilderService from './prompt-builder.service';
import redisCacheService from './redis-cache.service';

/**
 * Claude Agent Service
 * Main service for interacting with Claude API
 */

export class ClaudeAgentService {
  private anthropic: Anthropic;
  private fallbackResponses: Map<string, string>;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: config.anthropic.apiKey,
    });

    this.initializeFallbackResponses();
  }

  /**
   * Initialize fallback responses for when API is unavailable
   */
  private initializeFallbackResponses(): void {
    this.fallbackResponses = new Map([
      ['default', "I'm having trouble connecting right now, but I'll be back shortly! Please try again in a moment."],
      ['orders', "I'd love to help with order information, but I'm experiencing technical difficulties. Please try again soon!"],
      ['stats', "Statistics are temporarily unavailable. Check back in a few minutes!"],
      ['menu', "The menu information is temporarily unavailable. Please try again shortly!"],
      ['events', "Event information is currently unavailable. Please check back soon!"],
      ['community', "Community features are temporarily down. We'll be back shortly!"],
    ]);
  }

  /**
   * Query the agent with a question
   */
  async queryAgent(
    question: string,
    config: AgentConfig,
    context: CafeContext,
    userId: string
  ): Promise<AgentQueryResponse> {
    const startTime = Date.now();
    const queryId = this.generateQueryId();

    try {
      // Check cache first
      const cachedResponse = await redisCacheService.getCachedResponse(config.cafeId, question);
      if (cachedResponse) {
        const responseTime = Date.now() - startTime;
        await redisCacheService.trackQuery(config.cafeId, question, responseTime, true);

        return {
          response: cachedResponse,
          responseTime,
          cached: true,
          queryId,
        };
      }

      // Build prompts
      const systemPrompt = promptBuilderService.buildSystemPrompt(config, context);
      const userMessage = promptBuilderService.buildUserMessage(question);

      // Call Claude API
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: config.maxTokens || 300,
        temperature: config.temperature || 0.7,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userMessage,
          },
        ],
      });

      const response = message.content[0].type === 'text' ? message.content[0].text : '';
      const responseTime = Date.now() - startTime;

      // Cache the response
      await redisCacheService.cacheAgentResponse(config.cafeId, question, response);

      // Track analytics
      await redisCacheService.trackQuery(config.cafeId, question, responseTime, false);

      return {
        response,
        responseTime,
        cached: false,
        queryId,
      };
    } catch (error) {
      console.error('Error querying Claude API:', error);

      // Use fallback response
      const responseTime = Date.now() - startTime;
      const fallbackResponse = this.getFallbackResponse(question);

      return {
        response: fallbackResponse,
        responseTime,
        cached: false,
        queryId,
      };
    }
  }

  /**
   * Query agent with streaming response
   */
  async queryAgentStream(
    question: string,
    config: AgentConfig,
    context: CafeContext,
    onChunk: (chunk: string) => void,
    onComplete: (fullResponse: string) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    try {
      // Check cache first
      const cachedResponse = await redisCacheService.getCachedResponse(config.cafeId, question);
      if (cachedResponse) {
        // Simulate streaming for cached responses
        const words = cachedResponse.split(' ');
        for (const word of words) {
          onChunk(word + ' ');
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        onComplete(cachedResponse);
        return;
      }

      // Build prompts
      const systemPrompt = promptBuilderService.buildSystemPrompt(config, context);
      const userMessage = promptBuilderService.buildUserMessage(question);

      // Stream from Claude API
      const stream = await this.anthropic.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: config.maxTokens || 300,
        temperature: config.temperature || 0.7,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userMessage,
          },
        ],
      });

      let fullResponse = '';

      stream.on('text', (text) => {
        fullResponse += text;
        onChunk(text);
      });

      stream.on('end', async () => {
        // Cache the complete response
        await redisCacheService.cacheAgentResponse(config.cafeId, question, fullResponse);
        onComplete(fullResponse);
      });

      stream.on('error', (error) => {
        console.error('Streaming error:', error);
        onError(error);
      });
    } catch (error) {
      console.error('Error in streaming query:', error);
      onError(error as Error);
    }
  }

  /**
   * Generate a proactive message
   */
  async generateProactiveMessage(
    config: AgentConfig,
    context: CafeContext,
    trigger: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    try {
      const systemPrompt = promptBuilderService.buildSystemPrompt(config, context);

      let userPrompt = `Generate a proactive, engaging message for the cafe community based on this event: ${trigger}`;

      if (metadata) {
        userPrompt += `\n\nContext: ${JSON.stringify(metadata, null, 2)}`;
      }

      userPrompt += '\n\nKeep it brief (1-2 sentences) and match your personality. Make it interesting and relevant to the community.';

      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 150,
        temperature: 0.8,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      return message.content[0].type === 'text' ? message.content[0].text : '';
    } catch (error) {
      console.error('Error generating proactive message:', error);
      return this.getGenericProactiveMessage(trigger);
    }
  }

  /**
   * Validate if a question is appropriate
   */
  async validateQuestion(question: string): Promise<{ valid: boolean; reason?: string }> {
    // Basic validation
    if (question.trim().length === 0) {
      return { valid: false, reason: 'Question cannot be empty' };
    }

    if (question.length > 500) {
      return { valid: false, reason: 'Question is too long (max 500 characters)' };
    }

    // Check for inappropriate content (basic check)
    const inappropriatePatterns = [
      /\b(hack|exploit|attack|ddos)\b/i,
      /\b(password|credit card|ssn)\b/i,
    ];

    for (const pattern of inappropriatePatterns) {
      if (pattern.test(question)) {
        return { valid: false, reason: 'Question contains inappropriate content' };
      }
    }

    return { valid: true };
  }

  /**
   * Get fallback response based on question content
   */
  private getFallbackResponse(question: string): string {
    const lowerQuestion = question.toLowerCase();

    if (lowerQuestion.includes('order') || lowerQuestion.includes('popular')) {
      return this.fallbackResponses.get('orders')!;
    }
    if (lowerQuestion.includes('stat') || lowerQuestion.includes('data')) {
      return this.fallbackResponses.get('stats')!;
    }
    if (lowerQuestion.includes('menu') || lowerQuestion.includes('item')) {
      return this.fallbackResponses.get('menu')!;
    }
    if (lowerQuestion.includes('event')) {
      return this.fallbackResponses.get('events')!;
    }
    if (lowerQuestion.includes('community') || lowerQuestion.includes('member')) {
      return this.fallbackResponses.get('community')!;
    }

    return this.fallbackResponses.get('default')!;
  }

  /**
   * Get generic proactive message when AI fails
   */
  private getGenericProactiveMessage(trigger: string): string {
    const messages = {
      milestone: "We've reached an exciting milestone! Thank you all for being part of our community!",
      event: "There's something exciting happening at the cafe! Check it out!",
      scheduled: "Hope everyone is having a great day at the cafe!",
      manual: "The cafe team has an update for you!",
    };

    return messages[trigger as keyof typeof messages] || messages.manual;
  }

  /**
   * Generate a unique query ID
   */
  private generateQueryId(): string {
    return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Pre-generate common question responses
   */
  async pregenerateCommonResponses(config: AgentConfig, context: CafeContext): Promise<void> {
    const commonQuestions = [
      "What's popular today?",
      "When are you busiest?",
      "What should I order?",
      "Tell me about the cafe",
      "Any upcoming events?",
    ];

    const responses: Array<{ question: string; answer: string }> = [];

    for (const question of commonQuestions) {
      try {
        const result = await this.queryAgent(question, config, context, 'system');
        responses.push({ question, answer: result.response });
      } catch (error) {
        console.error(`Error pregenerating response for "${question}":`, error);
      }
    }

    await redisCacheService.preCacheCommonQuestions(config.cafeId, responses);
  }
}

export default new ClaudeAgentService();
