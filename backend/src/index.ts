import app from './app';
import { config } from './config';
import { db } from './db/connection';
import { connectRedis } from './db/redis';

async function startServer() {
  try {
    // Test database connection
    console.log('Testing database connection...');
    await db.query('SELECT NOW()');
    console.log('Database connected successfully');

    // Connect to Redis
    console.log('Connecting to Redis...');
    await connectRedis();
    console.log('Redis connected successfully');

    // Start Express server
    app.listen(config.port, () => {
      console.log(`
🚀 brew_me_in Backend Server Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Environment: ${config.env}
Port: ${config.port}
Database: ${config.database.name}
Redis: ${config.redis.host}:${config.redis.port}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
API Endpoints:
  POST   /api/auth/barista/generate-username
  POST   /api/auth/join
  POST   /api/auth/refresh
  GET    /api/users/me
  PUT    /api/users/me/interests
  PUT    /api/users/me/poke-enabled
  POST   /api/badges/record-tip
  GET    /api/badges/status
  GET    /api/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await db.close();
  process.exit(0);
});

startServer();
