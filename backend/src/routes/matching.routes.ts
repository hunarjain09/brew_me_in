import { Router, Request, Response } from 'express';
import matchingService from '../services/matching.service';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * GET /api/matching/discover
 * Discover users with shared interests
 * Query params: cafeId, interests (comma-separated), limit, offset
 */
router.get('/discover', authenticate, async (req: Request, res: Response) => {
  try {
    const { cafeId, interests, limit, offset } = req.query;

    if (!cafeId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'cafeId is required',
      });
    }

    const interestArray = interests
      ? (interests as string).split(',').map((i) => i.trim())
      : undefined;

    const users = await matchingService.discoverUsers(req.user!.userId, {
      cafeId: cafeId as string,
      interests: interestArray,
      limit: limit ? parseInt(limit as string) : 20,
      offset: offset ? parseInt(offset as string) : 0,
    });

    res.json({
      success: true,
      data: users,
      count: users.length,
    });
  } catch (error: any) {
    console.error('Discover users error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

/**
 * GET /api/matching/interests
 * Get current user's interests
 */
router.get('/interests', authenticate, async (req: Request, res: Response) => {
  try {
    const interests = await matchingService.getUserInterests(req.user!.userId);

    res.json({
      success: true,
      data: interests,
    });
  } catch (error: any) {
    console.error('Get interests error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

/**
 * POST /api/matching/interests
 * Set user's interests (replaces existing)
 * Body: { interests: string[] }
 */
router.post('/interests', authenticate, async (req: Request, res: Response) => {
  try {
    const { interests } = req.body;

    if (!Array.isArray(interests)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'interests must be an array',
      });
    }

    await matchingService.setUserInterests(req.user!.userId, interests);

    res.json({
      success: true,
      message: 'Interests updated successfully',
    });
  } catch (error: any) {
    console.error('Set interests error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

/**
 * POST /api/matching/interests/add
 * Add a single interest
 * Body: { interest: string }
 */
router.post('/interests/add', authenticate, async (req: Request, res: Response) => {
  try {
    const { interest } = req.body;

    if (!interest || typeof interest !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'interest is required and must be a string',
      });
    }

    await matchingService.addUserInterest(req.user!.userId, interest);

    res.json({
      success: true,
      message: 'Interest added successfully',
    });
  } catch (error: any) {
    console.error('Add interest error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

/**
 * POST /api/matching/interests/remove
 * Remove a single interest
 * Body: { interest: string }
 */
router.post('/interests/remove', authenticate, async (req: Request, res: Response) => {
  try {
    const { interest } = req.body;

    if (!interest || typeof interest !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'interest is required and must be a string',
      });
    }

    await matchingService.removeUserInterest(req.user!.userId, interest);

    res.json({
      success: true,
      message: 'Interest removed successfully',
    });
  } catch (error: any) {
    console.error('Remove interest error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

export default router;
