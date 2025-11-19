import { Router } from 'express';
import agentController from '../controllers/agent.controller';

/**
 * Agent Routes
 * Defines all routes for AI agent operations
 */

const router = Router();

// Query endpoints
router.post('/query', (req, res) => agentController.queryAgent(req, res));

// Configuration endpoints
router.get('/config/:cafeId', (req, res) => agentController.getConfig(req, res));
router.put('/config/:cafeId', (req, res) => agentController.updateConfig(req, res));

// Context management
router.put('/context/:cafeId', (req, res) => agentController.updateContext(req, res));

// Proactive messaging
router.post('/proactive-message', (req, res) => agentController.generateProactiveMessage(req, res));

// Analytics
router.get('/analytics/:cafeId', (req, res) => agentController.getAnalytics(req, res));

// Utility endpoints
router.post('/pregenerate/:cafeId', (req, res) => agentController.pregenerateResponses(req, res));

export default router;
