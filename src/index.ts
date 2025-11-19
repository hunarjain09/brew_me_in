import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import logger from './utils/logger';
import scheduler from './scheduler';
import { pool } from './config/database';
import { connectRedis } from './config/redis';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  try {
    // Check database connection
    await pool.query('SELECT 1');

    const schedulerStatus = scheduler.getStatus();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      scheduler: schedulerStatus,
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Scheduler status endpoint
app.get('/api/scheduler/status', (req: Request, res: Response) => {
  const status = scheduler.getStatus();
  res.json(status);
});

// Manual job trigger endpoints (for testing/admin)
app.post('/api/scheduler/trigger/:jobName', async (req: Request, res: Response) => {
  const { jobName } = req.params;

  try {
    let result;

    switch (jobName) {
      case 'expireUsers':
        const { expireUsers } = await import('./scheduler/jobs/expireUsers');
        result = await expireUsers();
        break;
      case 'expireBadges':
        const { expireBadges } = await import('./scheduler/jobs/expireBadges');
        result = await expireBadges();
        break;
      case 'calculateBadges':
        const { calculateNewBadges } = await import('./scheduler/jobs/calculateBadges');
        result = await calculateNewBadges();
        break;
      case 'expirePokes':
        const { expirePokes } = await import('./scheduler/jobs/expirePokes');
        result = await expirePokes();
        break;
      case 'aggregateAnalytics':
        const { aggregateAnalytics } = await import('./scheduler/jobs/aggregateAnalytics');
        result = await aggregateAnalytics();
        break;
      case 'proactiveMessages':
        const { sendProactiveAgentMessages } = await import('./scheduler/jobs/proactiveMessages');
        result = await sendProactiveAgentMessages();
        break;
      default:
        return res.status(404).json({
          error: 'Job not found',
          availableJobs: [
            'expireUsers',
            'expireBadges',
            'calculateBadges',
            'expirePokes',
            'aggregateAnalytics',
            'proactiveMessages',
          ],
        });
    }

    res.json({
      job: jobName,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(`Error triggering job ${jobName}:`, error);
    res.status(500).json({
      error: 'Failed to trigger job',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: any) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
async function startServer() {
  try {
    logger.info('Starting Brew Me In application...');

    // Initialize Redis
    await connectRedis();
    logger.info('Redis connected');

    // Test database connection
    await pool.query('SELECT NOW()');
    logger.info('Database connected');

    // Start scheduler
    await scheduler.start();
    logger.info('Scheduler started');

    // Start Express server
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await scheduler.stop();
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await scheduler.stop();
  await pool.end();
  process.exit(0);
});

// Start the application
if (require.main === module) {
  startServer();
}

export { app };
