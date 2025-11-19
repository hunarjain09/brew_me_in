import { Router } from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import badgeRoutes from './badgeRoutes';
import chatRoutes from './chatRoutes';
import rateLimitRoutes from './rateLimitRoutes';
import matchingRoutes from './matching.routes';
import pokeRoutes from './poke.routes';
import dmRoutes from './dm.routes';

const router = Router();

// Component 1: Auth & User Management
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/badges', badgeRoutes);

// Component 2: Real-time Chat
router.use('/chat', chatRoutes);

// Component 3: Rate Limiting & Spam Prevention
router.use('/v1', rateLimitRoutes);

// Component 4: Interest Matching & Poke System
router.use('/matching', matchingRoutes);
router.use('/pokes', pokeRoutes);
router.use('/dm', dmRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

export default router;
