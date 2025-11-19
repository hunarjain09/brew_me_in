import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env';
import { morganStream, logger } from './config/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import rateLimitRoutes from './routes/rateLimitRoutes';

/**
 * Express Server Setup
 * Component 3: Rate Limiting & Spam Prevention
 */

export function createServer(): Application {
  const app = express();

  // Security middleware
  app.use(helmet());

  // CORS
  app.use(
    cors({
      origin: config.cors.origin,
      credentials: true,
    })
  );

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // HTTP logging
  if (config.server.env === 'development') {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined', { stream: morganStream }));
  }

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: config.server.env,
    });
  });

  // API routes
  app.use(`/api/${config.server.apiVersion}`, rateLimitRoutes);

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  return app;
}

/**
 * Start the server
 */
export function startServer(app: Application): void {
  const port = config.server.port;

  app.listen(port, () => {
    logger.info(`Server started`, {
      port,
      environment: config.server.env,
      apiVersion: config.server.apiVersion,
    });

    logger.info(`Health check: http://localhost:${port}/health`);
    logger.info(`API Base: http://localhost:${port}/api/${config.server.apiVersion}`);
  });
}
