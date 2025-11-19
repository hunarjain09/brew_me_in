import { Router, Request, Response } from 'express';
import pokeService from '../services/poke.service';
import { authenticate } from '../middleware/auth';
import { pokeRateLimit } from '../middleware/pokeRateLimit';

const router = Router();

/**
 * POST /api/pokes/send
 * Send a poke to another user
 * Body: { toUserId: string, sharedInterest: string }
 */
router.post('/send', authenticate, pokeRateLimit, async (req: Request, res: Response) => {
  try {
    const { toUserId, sharedInterest } = req.body;

    if (!toUserId || !sharedInterest) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'toUserId and sharedInterest are required',
      });
    }

    const poke = await pokeService.sendPoke(
      req.user!.userId,
      toUserId,
      sharedInterest
    );

    res.status(201).json({
      success: true,
      data: poke,
      message: 'Poke sent successfully',
    });
  } catch (error: any) {
    console.error('Send poke error:', error);

    if (error.message.includes('not found') || error.message.includes('disabled')) {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message,
      });
    }

    if (error.message.includes('already exists') || error.message.includes('Cannot poke')) {
      return res.status(409).json({
        error: 'Conflict',
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
 * POST /api/pokes/respond
 * Respond to a poke (accept or decline)
 * Body: { pokeId: string, action: 'accept' | 'decline' }
 */
router.post('/respond', authenticate, async (req: Request, res: Response) => {
  try {
    const { pokeId, action } = req.body;

    if (!pokeId || !action) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'pokeId and action are required',
      });
    }

    if (action !== 'accept' && action !== 'decline') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'action must be either "accept" or "decline"',
      });
    }

    const result = await pokeService.respondToPoke(pokeId, req.user!.userId, action);

    res.json({
      success: true,
      data: {
        poke: result.poke,
        matched: result.matched,
        channelId: result.channelId,
      },
      message: result.matched
        ? "It's a match! DM channel created"
        : action === 'accept'
        ? 'Poke accepted'
        : 'Poke declined',
    });
  } catch (error: any) {
    console.error('Respond to poke error:', error);

    if (
      error.message.includes('not found') ||
      error.message.includes('not the recipient') ||
      error.message.includes('no longer pending')
    ) {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message,
      });
    }

    if (error.message.includes('expired')) {
      return res.status(410).json({
        error: 'Gone',
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
 * GET /api/pokes/pending
 * Get pending incoming pokes
 */
router.get('/pending', authenticate, async (req: Request, res: Response) => {
  try {
    const pokes = await pokeService.getPendingPokes(req.user!.userId);

    res.json({
      success: true,
      data: pokes,
      count: pokes.length,
    });
  } catch (error: any) {
    console.error('Get pending pokes error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

/**
 * GET /api/pokes/sent
 * Get sent outgoing pokes
 */
router.get('/sent', authenticate, async (req: Request, res: Response) => {
  try {
    const pokes = await pokeService.getSentPokes(req.user!.userId);

    res.json({
      success: true,
      data: pokes,
      count: pokes.length,
    });
  } catch (error: any) {
    console.error('Get sent pokes error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

export default router;
