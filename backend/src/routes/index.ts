import { Router } from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import badgeRoutes from './badgeRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/badges', badgeRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

export default router;
