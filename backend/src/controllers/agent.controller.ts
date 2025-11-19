import { Request, Response } from 'express';
import claudeAgentService from '../services/claude-agent.service';
import redisCacheService from '../services/redis-cache.service';
import { AgentConfig, CafeContext, AgentQueryRequest } from '../types/agent.types';

/**
 * Agent Controller
 * Handles HTTP requests for AI agent operations
 */

// In-memory storage for agent configs (replace with database in production)
const agentConfigs: Map<string, AgentConfig> = new Map();

// Mock cafe contexts (replace with database in production)
const cafeContexts: Map<string, CafeContext> = new Map();

/**
 * Initialize default config for a cafe
 */
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

/**
 * Initialize default context for a cafe
 */
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

export class AgentController {
  /**
   * POST /api/agent/query
   * Handle agent query with rate limiting
   */
  async queryAgent(req: Request, res: Response): Promise<void> {
    try {
      const { cafeId, question, userId } = req.body as AgentQueryRequest;

      // Validate input
      if (!cafeId || !question || !userId) {
        res.status(400).json({
          error: 'Missing required fields: cafeId, question, userId',
        });
        return;
      }

      // Validate question
      const validation = await claudeAgentService.validateQuestion(question);
      if (!validation.valid) {
        res.status(400).json({
          error: validation.reason,
        });
        return;
      }

      // Check global rate limit
      const globalAllowed = await redisCacheService.checkGlobalRateLimit();
      if (!globalAllowed) {
        res.status(429).json({
          error: 'Global rate limit exceeded. Please try again in a moment.',
        });
        return;
      }

      // Check user rate limit
      const userLimit = await redisCacheService.checkUserRateLimit(userId);
      if (!userLimit.allowed) {
        res.status(429).json({
          error: 'Daily query limit reached. Please try again tomorrow.',
          remaining: 0,
        });
        return;
      }

      // Get config and context
      const config = getOrCreateAgentConfig(cafeId);
      const context = getOrCreateCafeContext(cafeId);

      // Query the agent
      const result = await claudeAgentService.queryAgent(question, config, context, userId);

      res.status(200).json({
        ...result,
        remaining: userLimit.remaining,
      });
    } catch (error) {
      console.error('Error in queryAgent controller:', error);
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/agent/config/:cafeId
   * Get agent configuration for a cafe
   */
  async getConfig(req: Request, res: Response): Promise<void> {
    try {
      const { cafeId } = req.params;

      if (!cafeId) {
        res.status(400).json({ error: 'Cafe ID is required' });
        return;
      }

      const config = getOrCreateAgentConfig(cafeId);

      res.status(200).json(config);
    } catch (error) {
      console.error('Error in getConfig controller:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * PUT /api/agent/config/:cafeId
   * Update agent configuration (owner only)
   */
  async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      const { cafeId } = req.params;
      const updates = req.body as Partial<AgentConfig>;

      if (!cafeId) {
        res.status(400).json({ error: 'Cafe ID is required' });
        return;
      }

      // TODO: Add authentication check for cafe owner

      const currentConfig = getOrCreateAgentConfig(cafeId);

      // Validate updates
      if (updates.personality && !['bartender', 'quirky', 'historian', 'sarcastic', 'professional', 'custom'].includes(updates.personality)) {
        res.status(400).json({ error: 'Invalid personality type' });
        return;
      }

      if (updates.proactivity && !['silent', 'occasional', 'active', 'hype'].includes(updates.proactivity)) {
        res.status(400).json({ error: 'Invalid proactivity level' });
        return;
      }

      // Update config
      const updatedConfig: AgentConfig = {
        ...currentConfig,
        ...updates,
        cafeId, // Ensure cafeId doesn't change
        updatedAt: new Date(),
      };

      agentConfigs.set(cafeId, updatedConfig);

      // Invalidate cache when config changes
      await redisCacheService.invalidateCafeCache(cafeId);

      res.status(200).json(updatedConfig);
    } catch (error) {
      console.error('Error in updateConfig controller:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /api/agent/proactive-message
   * Generate and return a proactive message
   */
  async generateProactiveMessage(req: Request, res: Response): Promise<void> {
    try {
      const { cafeId, trigger, metadata } = req.body;

      if (!cafeId || !trigger) {
        res.status(400).json({ error: 'Missing required fields: cafeId, trigger' });
        return;
      }

      const config = getOrCreateAgentConfig(cafeId);
      const context = getOrCreateCafeContext(cafeId);

      // Check if proactivity is enabled
      if (config.proactivity === 'silent') {
        res.status(403).json({
          error: 'Proactive messaging is disabled for this cafe',
        });
        return;
      }

      const message = await claudeAgentService.generateProactiveMessage(
        config,
        context,
        trigger,
        metadata
      );

      res.status(200).json({
        message,
        cafeId,
        trigger,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error in generateProactiveMessage controller:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /api/agent/analytics/:cafeId
   * Get analytics for a cafe
   */
  async getAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { cafeId } = req.params;
      const { date } = req.query;

      if (!cafeId) {
        res.status(400).json({ error: 'Cafe ID is required' });
        return;
      }

      const analytics = await redisCacheService.getAnalytics(cafeId, date as string);

      if (!analytics) {
        res.status(404).json({ error: 'No analytics data available' });
        return;
      }

      res.status(200).json(analytics);
    } catch (error) {
      console.error('Error in getAnalytics controller:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * PUT /api/agent/context/:cafeId
   * Update cafe context (for testing/admin purposes)
   */
  async updateContext(req: Request, res: Response): Promise<void> {
    try {
      const { cafeId } = req.params;
      const updates = req.body as Partial<CafeContext>;

      if (!cafeId) {
        res.status(400).json({ error: 'Cafe ID is required' });
        return;
      }

      const currentContext = getOrCreateCafeContext(cafeId);

      const updatedContext: CafeContext = {
        ...currentContext,
        ...updates,
        cafeId, // Ensure cafeId doesn't change
      };

      cafeContexts.set(cafeId, updatedContext);

      // Invalidate cache when context changes
      await redisCacheService.invalidateCafeCache(cafeId);

      res.status(200).json(updatedContext);
    } catch (error) {
      console.error('Error in updateContext controller:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /api/agent/pregenerate/:cafeId
   * Pre-generate common responses for a cafe
   */
  async pregenerateResponses(req: Request, res: Response): Promise<void> {
    try {
      const { cafeId } = req.params;

      if (!cafeId) {
        res.status(400).json({ error: 'Cafe ID is required' });
        return;
      }

      const config = getOrCreateAgentConfig(cafeId);
      const context = getOrCreateCafeContext(cafeId);

      // Run in background (don't wait for completion)
      claudeAgentService.pregenerateCommonResponses(config, context).catch(err => {
        console.error('Error pregenerating responses:', err);
      });

      res.status(202).json({
        message: 'Pre-generation started',
        cafeId,
      });
    } catch (error) {
      console.error('Error in pregenerateResponses controller:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default new AgentController();
