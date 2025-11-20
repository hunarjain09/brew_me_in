import { Router, Request, Response } from 'express';
import { ChatAgentModel } from '../models/ChatAgent';
import { AgentContextModel } from '../models/AgentContext';
import { AgentInteractionModel } from '../models/AgentInteraction';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * Get agent for a cafe
 * GET /api/chat-agent/:cafeId
 */
router.get('/:cafeId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { cafeId } = req.params;

    const agent = await ChatAgentModel.findByCafeId(cafeId);

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found for this cafe' });
    }

    res.json(agent);
  } catch (error) {
    console.error('Error getting agent:', error);
    res.status(500).json({ message: 'Failed to get agent' });
  }
});

/**
 * Update agent configuration
 * PATCH /api/chat-agent/:agentId
 */
router.patch('/:agentId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const {
      name,
      username,
      avatarUrl,
      personality,
      customPrompt,
      proactivity,
      enabled,
      status,
    } = req.body;

    const updated = await ChatAgentModel.update(agentId, {
      name,
      username,
      avatarUrl,
      personality,
      customPrompt,
      proactivity,
      enabled,
      status,
    });

    if (!updated) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating agent:', error);
    res.status(500).json({ message: 'Failed to update agent' });
  }
});

/**
 * Get agent context
 * GET /api/chat-agent/:agentId/context
 */
router.get('/:agentId/context', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;

    const contexts = await AgentContextModel.findByAgentId(agentId);

    res.json(contexts);
  } catch (error) {
    console.error('Error getting agent context:', error);
    res.status(500).json({ message: 'Failed to get agent context' });
  }
});

/**
 * Upsert agent context (create or update)
 * PUT /api/chat-agent/:agentId/context
 */
router.put('/:agentId/context', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const { contextType, content, priority, enabled } = req.body;

    if (!contextType || !content) {
      return res.status(400).json({ message: 'contextType and content are required' });
    }

    const context = await AgentContextModel.upsert({
      agentId,
      contextType,
      content,
      priority,
      enabled,
    });

    res.json(context);
  } catch (error) {
    console.error('Error upserting agent context:', error);
    res.status(500).json({ message: 'Failed to save agent context' });
  }
});

/**
 * Delete agent context
 * DELETE /api/chat-agent/context/:contextId
 */
router.delete('/context/:contextId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { contextId } = req.params;

    const deleted = await AgentContextModel.delete(contextId);

    if (!deleted) {
      return res.status(404).json({ message: 'Context not found' });
    }

    res.json({ message: 'Context deleted successfully' });
  } catch (error) {
    console.error('Error deleting agent context:', error);
    res.status(500).json({ message: 'Failed to delete agent context' });
  }
});

/**
 * Get agent interaction stats
 * GET /api/chat-agent/:agentId/stats
 */
router.get('/:agentId/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const hours = parseInt(req.query.hours as string) || 24;

    const stats = await AgentInteractionModel.getStats(agentId, hours);

    res.json(stats);
  } catch (error) {
    console.error('Error getting agent stats:', error);
    res.status(500).json({ message: 'Failed to get agent stats' });
  }
});

/**
 * Get agent interaction history
 * GET /api/chat-agent/:agentId/interactions
 */
router.get('/:agentId/interactions', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const interactions = await AgentInteractionModel.findByAgentId(agentId, { limit, offset });

    res.json(interactions);
  } catch (error) {
    console.error('Error getting agent interactions:', error);
    res.status(500).json({ message: 'Failed to get agent interactions' });
  }
});

export default router;
