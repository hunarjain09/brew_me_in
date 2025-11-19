import cron from 'node-cron';
import logger from '../utils/logger';
import { connectRedis, redisClient } from '../db/redis';
import { db } from '../db/connection';

// Import job functions
import { expireUsers } from './jobs/expireUsers';
import { expireBadges } from './jobs/expireBadges';
import { calculateNewBadges } from './jobs/calculateBadges';
import { expirePokes } from './jobs/expirePokes';
import { aggregateAnalytics } from './jobs/aggregateAnalytics';
import { sendProactiveAgentMessages } from './jobs/proactiveMessages';

class SchedulerAgent {
  private isRunning: boolean = false;
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  constructor() {
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) {
      logger.warn('Scheduler is already running');
      return;
    }

    try {
      logger.info('Starting Scheduler Agent...');

      // Check if scheduler is enabled
      const enableScheduler = process.env.ENABLE_SCHEDULER !== 'false';
      if (!enableScheduler) {
        logger.info('Scheduler is disabled via ENABLE_SCHEDULER env variable');
        return;
      }

      // Redis should already be connected by the main app
      // But we'll verify the connection
      try {
        await redisClient.ping();
        logger.info('Redis connection verified for scheduler');
      } catch (error) {
        logger.error('Redis not connected, attempting to connect...');
        await connectRedis();
      }

      // Test database connection
      await db.query('SELECT NOW()');
      logger.info('Database connection verified for scheduler');

      // Schedule jobs
      this.scheduleJobs();

      this.isRunning = true;
      logger.info('Scheduler Agent started successfully');
    } catch (error) {
      logger.error('Failed to start Scheduler Agent:', error);
      throw error;
    }
  }

  private scheduleJobs() {
    logger.info('Scheduling background jobs...');

    // Hourly: Expire usernames (runs at the top of every hour)
    this.jobs.set(
      'expireUsers',
      cron.schedule('0 * * * *', async () => {
        logger.info('Running expireUsers job');
        try {
          const result = await expireUsers();
          logger.info('expireUsers job completed:', result);
        } catch (error) {
          logger.error('expireUsers job failed:', error);
        }
      })
    );

    // Daily: Badge expiration check (runs at midnight)
    this.jobs.set(
      'expireBadges',
      cron.schedule('0 0 * * *', async () => {
        logger.info('Running expireBadges job');
        try {
          const result = await expireBadges();
          logger.info('expireBadges job completed:', result);
        } catch (error) {
          logger.error('expireBadges job failed:', error);
        }
      })
    );

    // Daily: Calculate new badges (runs at 12:05 AM, after badge expiration)
    this.jobs.set(
      'calculateBadges',
      cron.schedule('5 0 * * *', async () => {
        logger.info('Running calculateNewBadges job');
        try {
          const result = await calculateNewBadges();
          logger.info('calculateNewBadges job completed:', result);
        } catch (error) {
          logger.error('calculateNewBadges job failed:', error);
        }
      })
    );

    // Every 5 min: Clean up expired pokes
    this.jobs.set(
      'expirePokes',
      cron.schedule('*/5 * * * *', async () => {
        logger.info('Running expirePokes job');
        try {
          const result = await expirePokes();
          logger.info('expirePokes job completed:', result);
        } catch (error) {
          logger.error('expirePokes job failed:', error);
        }
      })
    );

    // Hourly: Update analytics (runs at 5 minutes past every hour)
    this.jobs.set(
      'aggregateAnalytics',
      cron.schedule('5 * * * *', async () => {
        logger.info('Running aggregateAnalytics job');
        try {
          const result = await aggregateAnalytics();
          logger.info('aggregateAnalytics job completed:', result);
        } catch (error) {
          logger.error('aggregateAnalytics job failed:', error);
        }
      })
    );

    // Every 2 min: Agent proactive messages (if enabled)
    this.jobs.set(
      'proactiveMessages',
      cron.schedule('*/2 * * * *', async () => {
        logger.info('Running sendProactiveAgentMessages job');
        try {
          const result = await sendProactiveAgentMessages();
          logger.info('sendProactiveAgentMessages job completed:', result);
        } catch (error) {
          logger.error('sendProactiveAgentMessages job failed:', error);
        }
      })
    );

    logger.info(`Scheduled ${this.jobs.size} background jobs`);
    this.logScheduledJobs();
  }

  private logScheduledJobs() {
    logger.info('Scheduled jobs:');
    logger.info('  - expireUsers: Every hour (0 * * * *)');
    logger.info('  - expireBadges: Daily at midnight (0 0 * * *)');
    logger.info('  - calculateBadges: Daily at 12:05 AM (5 0 * * *)');
    logger.info('  - expirePokes: Every 5 minutes (*/5 * * * *)');
    logger.info('  - aggregateAnalytics: Every hour at :05 (5 * * * *)');
    logger.info('  - proactiveMessages: Every 2 minutes (*/2 * * * *)');
  }

  async stop() {
    if (!this.isRunning) {
      logger.warn('Scheduler is not running');
      return;
    }

    logger.info('Stopping Scheduler Agent...');

    // Stop all scheduled jobs
    this.jobs.forEach((job, name) => {
      job.stop();
      logger.info(`Stopped job: ${name}`);
    });
    this.jobs.clear();

    this.isRunning = false;
    logger.info('Scheduler Agent stopped');
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      jobCount: this.jobs.size,
      jobs: Array.from(this.jobs.keys()),
    };
  }

  // Manual job trigger for testing/admin
  async triggerJob(jobName: string) {
    logger.info(`Manually triggering job: ${jobName}`);

    switch (jobName) {
      case 'expireUsers':
        return await expireUsers();
      case 'expireBadges':
        return await expireBadges();
      case 'calculateBadges':
        return await calculateNewBadges();
      case 'expirePokes':
        return await expirePokes();
      case 'aggregateAnalytics':
        return await aggregateAnalytics();
      case 'proactiveMessages':
        return await sendProactiveAgentMessages();
      default:
        throw new Error(`Unknown job: ${jobName}`);
    }
  }
}

// Create and export scheduler instance
export const scheduler = new SchedulerAgent();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down scheduler gracefully...');
  await scheduler.stop();
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down scheduler gracefully...');
  await scheduler.stop();
});

export default scheduler;
