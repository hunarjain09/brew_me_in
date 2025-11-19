import { createServer, startServer } from './server';
import { redisClient } from './config/redis';
import { logger } from './config/logger';
import { config } from './config/env';

/**
 * Application Entry Point
 * Component 3: Rate Limiting & Spam Prevention
 */

async function main() {
  try {
    logger.info('Starting Brew Me In Backend...');
    logger.info(`Environment: ${config.server.env}`);

    // Initialize Redis connection
    logger.info('Connecting to Redis...');
    await redisClient.connect();

    // Verify Redis connection
    const redisHealthy = await redisClient.healthCheck();
    if (!redisHealthy) {
      throw new Error('Redis health check failed');
    }
    logger.info('Redis connection successful');

    // Create and start Express server
    const app = createServer();
    startServer(app);

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      await redisClient.disconnect();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully...');
      await redisClient.disconnect();
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to start application', { error });
    process.exit(1);
  }
}

// Start the application
main();
