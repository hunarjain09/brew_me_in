import { db } from '../../db/connection';
import logger from '../../utils/logger';
import { redisClient } from '../../db/redis';
import { JobResult } from './expireUsers';
import { config } from '../../config';

/**
 * Send proactive agent messages to cafes with the feature enabled
 * Runs every 2 minutes
 * Note: This will become fully active once Socket.io (Component 2) and Claude AI (Component 5) are implemented
 */
export async function sendProactiveAgentMessages(): Promise<JobResult> {
  const jobName = 'sendProactiveAgentMessages';
  logger.info(`Starting ${jobName} job`);

  try {
    // Check if proactive messages are enabled globally
    const enableProactive = process.env.ENABLE_PROACTIVE_MESSAGES === 'true';
    if (!enableProactive) {
      logger.debug('Proactive messages disabled globally');
      return {
        success: true,
        message: 'Proactive messages disabled',
        affectedRecords: 0,
      };
    }

    // Check if agent_messages table exists
    const tableCheck = await db.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'agent_messages'
      )`
    );

    if (!tableCheck.rows[0].exists) {
      // Create the agent_messages table if it doesn't exist
      await db.query(`
        CREATE TABLE IF NOT EXISTS agent_messages (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          cafe_id UUID REFERENCES cafes(id),
          message_type VARCHAR(50) NOT NULL,
          content TEXT NOT NULL,
          context_data JSONB,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_agent_messages_cafe_id ON agent_messages(cafe_id);
        CREATE INDEX IF NOT EXISTS idx_agent_messages_created_at ON agent_messages(created_at);
      `);
      logger.info('Created agent_messages table');
    }

    // Get cafes (proactive message settings will be added in a future migration)
    const cafesResult = await db.query(
      `SELECT id, name FROM cafes`
    );

    let messagesCount = 0;

    for (const cafe of cafesResult.rows) {
      try {
        // Check if we've sent a message recently (rate limiting)
        const lastMessageKey = `cafe:${cafe.id}:last_proactive_message`;
        const lastMessageTime = await redisClient.get(lastMessageKey);

        if (lastMessageTime) {
          const timeSinceLastMessage = Date.now() - parseInt(lastMessageTime);
          const minInterval = 10 * 60 * 1000; // Minimum 10 minutes between messages

          if (timeSinceLastMessage < minInterval) {
            logger.debug(`Skipping cafe ${cafe.name} - too soon since last message`);
            continue;
          }
        }

        // Get cafe context
        const context = await getCafeContext(cafe.id);

        // Only send message if there are active users
        if (context.activeUsers < 2) {
          logger.debug(`Skipping cafe ${cafe.name} - not enough active users`);
          continue;
        }

        // Generate proactive message
        const message = generateProactiveMessage(cafe, context);

        if (message) {
          // Log the proactive message intent
          await db.query(
            `INSERT INTO agent_messages
             (cafe_id, message_type, content, context_data, created_at)
             VALUES ($1, $2, $3, $4, NOW())`,
            [cafe.id, 'PROACTIVE', message, JSON.stringify(context)]
          );

          // Update last message timestamp
          await redisClient.set(lastMessageKey, Date.now().toString());

          // TODO: When Socket.io is implemented (Component 2), broadcast message to cafe
          // await sendMessageToCafe(cafe.id, message);

          messagesCount++;
          logger.info(`Logged proactive message intent for cafe: ${cafe.name}`);
        }
      } catch (error) {
        logger.error(`Failed to process proactive message for cafe ${cafe.id}:`, error);
      }
    }

    return {
      success: true,
      message: `Successfully processed ${messagesCount} proactive messages`,
      affectedRecords: messagesCount,
    };
  } catch (error) {
    logger.error(`Error in ${jobName} job:`, error);
    return {
      success: false,
      message: `Failed to send proactive messages`,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function getCafeContext(cafeId: string) {
  // Get active users count
  const activeUsersResult = await db.query(
    `SELECT COUNT(*) as count
     FROM users
     WHERE cafe_id = $1
     AND expires_at > NOW()`,
    [cafeId]
  );

  // Get recent tips count
  const recentTipsResult = await db.query(
    `SELECT COUNT(*) as count
     FROM tips t
     INNER JOIN users u ON t.user_id = u.id
     WHERE u.cafe_id = $1
     AND t.created_at >= NOW() - INTERVAL '30 minutes'`,
    [cafeId]
  );

  return {
    activeUsers: parseInt(activeUsersResult.rows[0]?.count || '0'),
    recentTips: parseInt(recentTipsResult.rows[0]?.count || '0'),
  };
}

function generateProactiveMessage(cafe: any, context: any): string | null {
  // Generate contextual proactive messages based on activity
  const messages: string[] = [];

  if (context.activeUsers >= 5) {
    messages.push(
      `The cafe is buzzing with ${context.activeUsers} people! Great energy today at ${cafe.name}!`,
      `Wow, ${context.activeUsers} people here! Anyone want to start a conversation?`,
      `${cafe.name} is popular today with ${context.activeUsers} visitors! Perfect time to make new connections!`
    );
  }

  if (context.activeUsers >= 2 && context.activeUsers < 5) {
    messages.push(
      `Just a few people here - perfect for a good conversation!`,
      `Cozy vibes with ${context.activeUsers} people. Great time to chat!`
    );
  }

  if (context.recentTips > 3) {
    messages.push(
      `Lots of support for the cafe today! ${context.recentTips} tips in the last 30 minutes!`
    );
  }

  // Check time of day for contextual messages
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 10) {
    messages.push(
      `Good morning! Perfect time for a coffee and conversation at ${cafe.name}`,
      `Morning coffee crew! Who's ready to start their day with good vibes?`
    );
  } else if (hour >= 12 && hour < 14) {
    messages.push(
      `Lunch rush at ${cafe.name}! Great time to meet someone new`,
      `Midday break? Perfect timing to connect with others here!`
    );
  } else if (hour >= 17 && hour < 20) {
    messages.push(
      `After-work crowd gathering! Time to unwind and chat`,
      `Evening vibes at ${cafe.name}. Who's up for a conversation?`
    );
  }

  // Return a random message or null if no messages available
  if (messages.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * messages.length);
  return messages[randomIndex];
}
