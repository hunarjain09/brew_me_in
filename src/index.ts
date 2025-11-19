import express, { Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import matchingRoutes from './routes/matching.routes';
import pokeRoutes from './routes/poke.routes';
import dmRoutes from './routes/dm.routes';
import notificationService from './services/notification.service';
import { startPokeExpirationJob } from './jobs/poke-expiration.job';
import pool from './db/connection';

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    connectedUsers: notificationService.getConnectedUserCount(),
  });
});

// API Routes
app.use('/api/matching', matchingRoutes);
app.use('/api/pokes', pokeRoutes);
app.use('/api/dm', dmRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
    path: req.path,
  });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
  });
});

// Initialize notification service (Socket.IO)
notificationService.initialize(server);

// Start background jobs
startPokeExpirationJob();

// Start server
server.listen(PORT, () => {
  console.log('=================================');
  console.log('  Brew Me In - Interest Matching');
  console.log('  & Poke System');
  console.log('=================================');
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log('=================================');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed');
  });

  await pool.end();
  console.log('Database connections closed');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed');
  });

  await pool.end();
  console.log('Database connections closed');
  process.exit(0);
});

export default app;
