import express, { Application } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env';
import agentRoutes from './routes/agent.routes';
import redisCacheService from './services/redis-cache.service';
import { initializeAgentSocket } from './socket/agent-socket.handler';
import { errorHandler, notFoundHandler } from './middleware/error-handler';

/**
 * Main Server
 * Initializes and configures the Express application with Socket.IO
 */

class Server {
  private app: Application;
  private httpServer: ReturnType<typeof createServer>;
  private io: Server;

  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.io = new Server(this.httpServer, {
      cors: {
        origin: config.FRONTEND_URL,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true,
      },
    });

    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeSocketHandlers();
    this.initializeErrorHandlers();
  }

  /**
   * Initialize Express middleware
   */
  private initializeMiddleware(): void {
    // Security
    this.app.use(helmet());
    this.app.use(cors({
      origin: config.FRONTEND_URL,
      credentials: true,
    }));

    // Body parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Logging
    if (config.NODE_ENV === 'development') {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined'));
    }

    // Request ID and timestamp
    this.app.use((req, res, next) => {
      req.headers['x-request-id'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      req.headers['x-request-time'] = new Date().toISOString();
      next();
    });
  }

  /**
   * Initialize API routes
   */
  private initializeRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.NODE_ENV,
      });
    });

    // API routes
    this.app.use('/api/agent', agentRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Brew Me In - AI Agent API',
        version: '1.0.0',
        description: 'AI-powered virtual cafe platform with Claude integration',
        endpoints: {
          health: '/health',
          agent: {
            query: 'POST /api/agent/query',
            config: 'GET /api/agent/config/:cafeId',
            updateConfig: 'PUT /api/agent/config/:cafeId',
            proactiveMessage: 'POST /api/agent/proactive-message',
            analytics: 'GET /api/agent/analytics/:cafeId',
          },
          socket: {
            namespace: '/agent',
            events: ['query:stream', 'cafe:join', 'cafe:leave'],
          },
        },
      });
    });
  }

  /**
   * Initialize Socket.IO handlers
   */
  private initializeSocketHandlers(): void {
    initializeAgentSocket(this.io);

    // Root namespace connection logging
    this.io.on('connection', (socket) => {
      console.log(`Client connected to root namespace: ${socket.id}`);
      socket.on('disconnect', () => {
        console.log(`Client disconnected from root namespace: ${socket.id}`);
      });
    });
  }

  /**
   * Initialize error handlers (must be last)
   */
  private initializeErrorHandlers(): void {
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    try {
      // Connect to Redis
      console.log('Connecting to Redis...');
      await redisCacheService.connect();
      console.log('Redis connected successfully');

      // Start HTTP server
      this.httpServer.listen(config.PORT, () => {
        console.log('='.repeat(50));
        console.log(`🚀 Brew Me In - AI Agent Server`);
        console.log('='.repeat(50));
        console.log(`Environment: ${config.NODE_ENV}`);
        console.log(`Server: http://localhost:${config.PORT}`);
        console.log(`Socket.IO: ws://localhost:${config.PORT}`);
        console.log(`Health: http://localhost:${config.PORT}/health`);
        console.log('='.repeat(50));
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown
   */
  private async shutdown(): Promise<void> {
    console.log('\nShutting down gracefully...');

    try {
      // Close Socket.IO connections
      this.io.close(() => {
        console.log('Socket.IO connections closed');
      });

      // Close HTTP server
      this.httpServer.close(() => {
        console.log('HTTP server closed');
      });

      // Disconnect Redis
      await redisCacheService.disconnect();
      console.log('Redis disconnected');

      console.log('Shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  }

  /**
   * Get Socket.IO instance
   */
  getSocketIO(): Server {
    return this.io;
  }
}

// Create and start server
const server = new Server();
server.start();

export default server;
