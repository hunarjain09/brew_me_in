import { Router } from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import badgeRoutes from './badgeRoutes';
import chatRoutes from './chatRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/badges', badgeRoutes);
router.use('/chat', chatRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

export default router;
