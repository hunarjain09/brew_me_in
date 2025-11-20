import { Router } from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import badgeRoutes from './badgeRoutes';
import locationRoutes from './locationRoutes';
import chatRoutes from './chatRoutes';
import chatAgentRoutes from './chat-agent.routes';
import rateLimitRoutes from './rateLimitRoutes';
import matchingRoutes from './matching.routes';
import pokeRoutes from './poke.routes';
import dmRoutes from './dm.routes';
import adminRoutes from './admin';

const router = Router();

// Component 1: Auth & User Management
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/badges', badgeRoutes);

// Component 2: Real-time Chat
router.use('/chat', chatRoutes);
router.use('/chat-agent', chatAgentRoutes);

// Component 3: Rate Limiting & Spam Prevention
router.use('/v1', rateLimitRoutes);

// Component 4: Interest Matching & Poke System
router.use('/matching', matchingRoutes);
router.use('/pokes', pokeRoutes);
router.use('/dm', dmRoutes);

// Component 6: Admin Dashboard
router.use('/admin', adminRoutes);

// Component 7: Network Validation & Location Services
router.use('/location', locationRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

export default router;
