import express, { Request, Response } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import pool from './config/database';
import { connectRedis } from './config/redis';
import { initializeWebSocket } from './websocket';
import logger from './utils/logger';

// Import routes
import authRoutes from './routes/auth';
import moderationRoutes from './routes/moderation';
import usersRoutes from './routes/users';
import analyticsRoutes from './routes/analytics';
import agentRoutes from './routes/agent';
import activityRoutes from './routes/activity';
import eventsRoutes from './routes/events';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/admin/auth', authRoutes);
app.use('/api/admin/moderation', moderationRoutes);
app.use('/api/admin/users', usersRoutes);
app.use('/api/admin/analytics', analyticsRoutes);
app.use('/api/admin/agent', agentRoutes);
app.use('/api/admin', activityRoutes);
app.use('/api/admin/events', eventsRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: any) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize connections and start server
const startServer = async () => {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    logger.info('✓ Database connected');

    // Connect to Redis
    await connectRedis();
    logger.info('✓ Redis connected');

    // Initialize WebSocket
    const websocket = initializeWebSocket(httpServer);
    logger.info('✓ WebSocket initialized');

    // Start HTTP server
    httpServer.listen(PORT, () => {
      logger.info(`✓ Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    logger.info('HTTP server closed');
    pool.end(() => {
      logger.info('Database pool closed');
      process.exit(0);
    });
  });
});

startServer();
