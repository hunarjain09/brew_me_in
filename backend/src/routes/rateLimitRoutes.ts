import { Router } from 'express';
import * as rateLimitController from '../controllers/rateLimitController';

/**
 * Rate Limit Routes
 * Component 3: Rate Limiting & Spam Prevention
 */
const router = Router();

// Rate Limit Endpoints
router.get('/ratelimit/status', rateLimitController.getRateLimitStatus);
router.post('/ratelimit/check', rateLimitController.checkRateLimit);
router.post('/ratelimit/consume', rateLimitController.consumeRateLimit);
router.post('/ratelimit/reset', rateLimitController.resetRateLimit);

// Spam Detection Endpoints
router.post('/spam/check', rateLimitController.checkSpam);
router.get('/spam/mute/:userId', rateLimitController.getMuteInfo);
router.delete('/spam/mute/:userId', rateLimitController.unmuteUser);

export default router;
