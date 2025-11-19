import { Router, Request, Response } from 'express';
import dmService from '../services/dm.service';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/dm/channels
 * Get all DM channels for the current user
 */
router.get('/channels', authenticate, async (req: Request, res: Response) => {
  try {
    const channels = await dmService.getUserChannels(req.userId!);

    res.json({
      success: true,
      data: channels,
      count: channels.length,
    });
  } catch (error: any) {
    console.error('Get channels error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

/**
 * GET /api/dm/:channelId/messages
 * Get messages from a specific DM channel
 * Query params: limit, offset
 */
router.get('/:channelId/messages', authenticate, async (req: Request, res: Response) => {
  try {
    const { channelId } = req.params;
    const { limit, offset } = req.query;

    const messages = await dmService.getChannelMessages(
      channelId,
      req.userId!,
      limit ? parseInt(limit as string) : 50,
      offset ? parseInt(offset as string) : 0
    );

    res.json({
      success: true,
      data: messages,
      count: messages.length,
    });
  } catch (error: any) {
    console.error('Get messages error:', error);

    if (error.message.includes('not found') || error.message.includes('access denied')) {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message,
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

/**
 * POST /api/dm/:channelId/messages
 * Send a message in a DM channel
 * Body: { content: string }
 */
router.post('/:channelId/messages', authenticate, async (req: Request, res: Response) => {
  try {
    const { channelId } = req.params;
    const { content } = req.body;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'content is required and must be a string',
      });
    }

    const message = await dmService.sendMessage(channelId, req.userId!, content);

    res.status(201).json({
      success: true,
      data: message,
      message: 'Message sent successfully',
    });
  } catch (error: any) {
    console.error('Send message error:', error);

    if (error.message.includes('not found') || error.message.includes('access denied')) {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message,
      });
    }

    if (error.message.includes('empty') || error.message.includes('too long')) {
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message,
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/dm/messages/:messageId
 * Delete a message
 */
router.delete('/messages/:messageId', authenticate, async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;

    await dmService.deleteMessage(messageId, req.userId!);

    res.json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete message error:', error);

    if (error.message.includes('not found') || error.message.includes('permission')) {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message,
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

export default router;
