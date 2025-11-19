import { Router } from 'express';
import {
  loginModerator,
  registerModerator,
  getCurrentModerator,
} from '../controllers/moderatorAuthController';
import {
  muteUser,
  unmuteUser,
  banUser,
  unbanUser,
  deleteMessage,
  getModerationHistory,
  getUsersForModeration,
} from '../controllers/moderationController';
import {
  getCafeAnalytics,
  getRealtimeStats,
  exportAnalytics,
} from '../controllers/analyticsController';
import { authenticate } from '../middleware/auth';

/**
 * Component 6: Admin Routes
 * All moderator dashboard routes
 */

const router = Router();

// =====================
// Auth Routes (no auth required)
// =====================
router.post('/auth/login', loginModerator);
router.post('/auth/register', registerModerator);

// =====================
// Protected Routes (require auth)
// =====================

// Auth - Get current moderator
router.get('/auth/me', authenticate, getCurrentModerator);

// User Management
router.get('/users', authenticate, getUsersForModeration);

// Moderation Actions
router.post('/moderation/mute', authenticate, muteUser);
router.post('/moderation/unmute', authenticate, unmuteUser);
router.post('/moderation/ban', authenticate, banUser);
router.post('/moderation/unban', authenticate, unbanUser);
router.delete('/moderation/messages/:messageId', authenticate, deleteMessage);
router.get('/moderation/history', authenticate, getModerationHistory);

// Analytics
router.get('/analytics', authenticate, getCafeAnalytics);
router.get('/analytics/realtime', authenticate, getRealtimeStats);
router.get('/analytics/export', authenticate, exportAnalytics);

export default router;
