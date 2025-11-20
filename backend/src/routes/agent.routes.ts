import { Router } from 'express';
import agentController from '../controllers/agent.controller';
import { authenticate, authenticateToken } from '../middleware/auth';
import { enforceWifiConnection } from '../middleware/wifiValidation';

/**
 * Agent Routes
 * Defines all routes for AI agent operations
 */

const router = Router();

// Query endpoints (authenticated users - requires WiFi)
router.post('/query', authenticate, enforceWifiConnection, (req, res) => agentController.queryAgent(req, res));

// Configuration endpoints (protected - moderators only)
router.get('/config/:cafeId', (req, res) => agentController.getConfig(req, res));
router.put('/config/:cafeId', authenticateToken, (req, res) => agentController.updateConfig(req, res));

// Context management (protected - moderators only)
router.put('/context/:cafeId', authenticateToken, (req, res) => agentController.updateContext(req, res));

// Proactive messaging
router.post('/proactive-message', (req, res) => agentController.generateProactiveMessage(req, res));

// Analytics
router.get('/analytics/:cafeId', (req, res) => agentController.getAnalytics(req, res));

// Utility endpoints (protected - moderators only)
router.post('/pregenerate/:cafeId', authenticateToken, (req, res) => agentController.pregenerateResponses(req, res));

export default router;
