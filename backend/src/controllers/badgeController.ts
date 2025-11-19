import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { TipModel } from '../models/Tip';
import { BadgeModel } from '../models/Badge';
import { UserModel } from '../models/User';
import { config } from '../config';

export class BadgeController {
  /**
   * POST /api/badges/record-tip
   * Record a tip and check badge eligibility
   */
  static async recordTip(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { userId, amount } = req.body;

      // Verify user exists
      const user = await UserModel.findById(userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Record the tip
      const tip = await TipModel.create(userId, user.cafeId, amount);

      // Check badge eligibility
      const eligibility = await BadgeModel.checkEligibility(userId);

      let badge = null;
      if (eligibility.eligible) {
        // Check if user already has a badge
        const existingBadge = await BadgeModel.findByUserId(userId);

        if (!existingBadge) {
          // Create new badge
          badge = await BadgeModel.create(userId);
        } else {
          badge = existingBadge;
        }
      }

      res.json({
        tip,
        eligibility: {
          eligible: eligibility.eligible,
          tipsInWindow: eligibility.tipsInWindow,
          tipsNeeded: eligibility.tipsNeeded,
        },
        badge,
      });
    } catch (error) {
      console.error('Error recording tip:', error);
      res.status(500).json({ error: 'Failed to record tip' });
    }
  }

  /**
   * GET /api/badges/status
   * Get badge progress and status
   */
  static async getBadgeStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const user = await UserModel.findById(req.user.userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const badge = await BadgeModel.findByUserId(req.user.userId);
      const eligibility = await BadgeModel.checkEligibility(req.user.userId);

      res.json({
        hasBadge: user.badgeStatus === 'active',
        badgeStatus: user.badgeStatus,
        badge,
        eligibility: {
          eligible: eligibility.eligible,
          tipsInWindow: eligibility.tipsInWindow,
          tipsNeeded: eligibility.tipsNeeded,
          tipThreshold: config.badges.tipThreshold,
          windowDays: config.badges.tipWindowDays,
        },
        perks: user.badgeStatus === 'active' ? this.getBadgePerks() : null,
      });
    } catch (error) {
      console.error('Error fetching badge status:', error);
      res.status(500).json({ error: 'Failed to fetch badge status' });
    }
  }

  /**
   * Helper: Get badge perks
   */
  private static getBadgePerks(): string[] {
    return [
      'Priority in chat rooms',
      'Extended session time',
      'Exclusive badge icon',
      'Access to premium features',
    ];
  }
}
