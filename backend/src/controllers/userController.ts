import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { UserModel } from '../models/User';

export class UserController {
  /**
   * GET /api/users/me
   * Get current user profile
   */
  static async getCurrentUser(req: AuthRequest, res: Response): Promise<void> {
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

      res.json({ user });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  }

  /**
   * PUT /api/users/me/interests
   * Update user interests
   */
  static async updateInterests(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { interests } = req.body;

      await UserModel.updateInterests(req.user.userId, interests);

      const updatedUser = await UserModel.findById(req.user.userId);

      res.json({ user: updatedUser });
    } catch (error) {
      console.error('Error updating interests:', error);
      res.status(500).json({ error: 'Failed to update interests' });
    }
  }

  /**
   * PUT /api/users/me/poke-enabled
   * Update poke enabled status
   */
  static async updatePokeEnabled(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { enabled } = req.body;

      await UserModel.updatePokeEnabled(req.user.userId, enabled);

      const updatedUser = await UserModel.findById(req.user.userId);

      res.json({ user: updatedUser });
    } catch (error) {
      console.error('Error updating poke enabled:', error);
      res.status(500).json({ error: 'Failed to update poke enabled' });
    }
  }
}
