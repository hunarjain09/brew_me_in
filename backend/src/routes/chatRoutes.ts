import { Router } from 'express';
import { ChatController } from '../controllers/chatController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All chat routes require authentication
router.use(authenticate);

// GET /api/chat/messages/:cafeId
router.get('/messages/:cafeId', ChatController.getMessages);

// DELETE /api/chat/messages/:messageId
router.delete('/messages/:messageId', ChatController.deleteMessage);

// GET /api/chat/presence/:cafeId
router.get('/presence/:cafeId', ChatController.getPresence);

// GET /api/chat/topics/:cafeId
router.get('/topics/:cafeId', ChatController.getTopics);

export default router;
