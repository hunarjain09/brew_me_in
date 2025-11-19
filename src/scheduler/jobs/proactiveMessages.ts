import { query } from '../../config/database';
import logger from '../../utils/logger';
import { JobResult, Cafe } from '../../types';
import redisClient from '../../config/redis';

/**
 * Send proactive agent messages to cafes with the feature enabled
 * Runs every 2 minutes
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

    // Get cafes with proactive messages enabled
    const cafes = await getActiveProactiveCafes();
    let messagesCount = 0;

    for (const cafe of cafes) {
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

        // Generate and send proactive message
        const message = await generateProactiveMessage(cafe, context);

        if (message) {
          await sendMessageToCafe(cafe.id, message);

          // Update last message timestamp
          await redisClient.set(lastMessageKey, Date.now().toString());

          // Log the proactive message
          await query(
            `INSERT INTO agent_messages
             (cafe_id, message_type, content, context_data, created_at)
             VALUES ($1, $2, $3, $4, NOW())`,
            [cafe.id, 'PROACTIVE', message, JSON.stringify(context)]
          );

          messagesCount++;
          logger.info(`Sent proactive message to cafe: ${cafe.name}`);
        }
      } catch (error) {
        logger.error(`Failed to send proactive message to cafe ${cafe.id}:`, error);
      }
    }

    return {
      success: true,
      message: `Successfully sent ${messagesCount} proactive messages`,
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

async function getActiveProactiveCafes(): Promise<Cafe[]> {
  const result = await query(
    `SELECT id, name, location, enable_proactive_messages, created_at, updated_at
     FROM cafes
     WHERE is_active = true
     AND enable_proactive_messages = true`
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    location: row.location,
    enableProactiveMessages: row.enable_proactive_messages,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

async function getCafeContext(cafeId: string) {
  // Get active users count
  const activeUsersCount = await redisClient.sCard(`cafe:${cafeId}:active_users`);

  // Get recent activity
  const recentActivity = await query(
    `SELECT
       COUNT(DISTINCT p.id) as recent_pokes,
       COUNT(DISTINCT m.id) as recent_messages
     FROM users u
     LEFT JOIN pokes p ON u.id = p.from_user_id AND p.created_at >= NOW() - INTERVAL '30 minutes'
     LEFT JOIN messages m ON u.id = m.user_id AND m.created_at >= NOW() - INTERVAL '30 minutes'
     WHERE u.cafe_id = $1 AND u.is_active = true`,
    [cafeId]
  );

  // Get trending topics or recent usernames
  const recentUsers = await query(
    `SELECT username
     FROM users
     WHERE cafe_id = $1
     AND is_active = true
     ORDER BY created_at DESC
     LIMIT 5`,
    [cafeId]
  );

  return {
    activeUsers: activeUsersCount || 0,
    recentPokes: parseInt(recentActivity.rows[0]?.recent_pokes || '0'),
    recentMessages: parseInt(recentActivity.rows[0]?.recent_messages || '0'),
    recentUsernames: recentUsers.rows.map((u: any) => u.username),
  };
}

async function generateProactiveMessage(cafe: Cafe, context: any): Promise<string | null> {
  // Generate contextual proactive messages based on activity
  const messages: string[] = [];

  if (context.activeUsers >= 5) {
    messages.push(
      `🌟 The cafe is buzzing with ${context.activeUsers} people! Great energy today at ${cafe.name}!`,
      `☕ Wow, ${context.activeUsers} people here! Anyone want to start a conversation?`,
      `🎉 ${cafe.name} is popular today with ${context.activeUsers} visitors! Perfect time to make new connections!`
    );
  }

  if (context.activeUsers >= 2 && context.recentPokes === 0) {
    messages.push(
      `👋 I notice a few people here but it's quiet. How about breaking the ice with a poke?`,
      `💭 ${context.activeUsers} people, zero pokes? Someone should make the first move!`
    );
  }

  if (context.recentPokes > 5) {
    messages.push(
      `🔥 The poke game is strong today! ${context.recentPokes} pokes in the last 30 minutes!`,
      `📱 Social butterflies are active! ${context.recentPokes} pokes flying around!`
    );
  }

  if (context.activeUsers === 2) {
    messages.push(
      `👥 Just you two here - perfect for a good conversation!`,
      `☕ Cozy vibes with just 2 people. Great time to chat!`
    );
  }

  // Check time of day for contextual messages
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 10) {
    messages.push(
      `🌅 Good morning! Perfect time for a coffee and conversation at ${cafe.name}`,
      `☕ Morning coffee crew! Who's ready to start their day with good vibes?`
    );
  } else if (hour >= 12 && hour < 14) {
    messages.push(
      `🍽️ Lunch rush at ${cafe.name}! Great time to meet someone new`,
      `☕ Midday break? Perfect timing to connect with others here!`
    );
  } else if (hour >= 17 && hour < 20) {
    messages.push(
      `🌆 After-work crowd gathering! Time to unwind and chat`,
      `☕ Evening vibes at ${cafe.name}. Who's up for a conversation?`
    );
  }

  // Return a random message or null if no messages available
  if (messages.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * messages.length);
  return messages[randomIndex];
}

async function sendMessageToCafe(cafeId: string, message: string) {
  // Publish message to cafe's Socket.io channel via Redis pub/sub
  const payload = JSON.stringify({
    type: 'AGENT_MESSAGE',
    cafeId,
    message,
    timestamp: new Date().toISOString(),
  });

  await redisClient.publish(`cafe:${cafeId}:messages`, payload);

  logger.debug(`Published message to cafe ${cafeId}: ${message}`);
}
