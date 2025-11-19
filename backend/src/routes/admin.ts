import { Router } from 'express';
import analyticsRoutes from './analytics';
import activityRoutes from './activity';
import agentRoutes from './agent';
import moderationRoutes from './moderation';
import eventsRoutes from './events';
import cafeRoutes from './cafes';
import adminUsersRoutes from './users';

const router = Router();

// Component 6: Admin Dashboard Routes
router.use('/analytics', analyticsRoutes);
router.use('/', activityRoutes); // Activity routes include /cafes/:cafeId/activity
router.use('/agent', agentRoutes);
router.use('/', moderationRoutes); // Moderation routes include various endpoints
router.use('/events', eventsRoutes);
router.use('/cafes', cafeRoutes);
router.use('/users', adminUsersRoutes);

export default router;
