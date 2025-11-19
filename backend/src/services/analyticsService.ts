import { db } from '../db/connection';

/**
 * Component 6: Analytics Service
 * Handles cafe analytics aggregation and reporting
 */

export interface CafeAnalytics {
  cafe_id: string;
  date: Date;
  total_messages: number;
  unique_users: number;
  peak_hour: number | null;
  agent_queries: number;
  pokes_exchanged: number;
  badges_earned: number;
}

export interface AnalyticsSummary {
  total_messages: number;
  avg_daily_users: number;
  total_agent_queries: number;
  total_pokes: number;
  total_badges: number;
}

export class AnalyticsService {
  /**
   * Get analytics for a cafe within a date range
   */
  static async getCafeAnalytics(
    cafeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CafeAnalytics[]> {
    const result = await db.query(
      `SELECT *
       FROM cafe_analytics
       WHERE cafe_id = $1 AND date >= $2 AND date <= $3
       ORDER BY date ASC`,
      [cafeId, startDate, endDate]
    );

    return result.rows;
  }

  /**
   * Get summary statistics
   */
  static async getSummaryStats(
    cafeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AnalyticsSummary> {
    const result = await db.query(
      `SELECT
         COALESCE(SUM(total_messages), 0) as total_messages,
         COALESCE(AVG(unique_users)::int, 0) as avg_daily_users,
         COALESCE(SUM(agent_queries), 0) as total_agent_queries,
         COALESCE(SUM(pokes_exchanged), 0) as total_pokes,
         COALESCE(SUM(badges_earned), 0) as total_badges
       FROM cafe_analytics
       WHERE cafe_id = $1 AND date >= $2 AND date <= $3`,
      [cafeId, startDate, endDate]
    );

    return result.rows[0];
  }

  /**
   * Get hourly message distribution
   */
  static async getHourlyDistribution(
    cafeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ hour: number; message_count: number }>> {
    const result = await db.query(
      `SELECT
         EXTRACT(HOUR FROM created_at)::int as hour,
         COUNT(*)::int as message_count
       FROM messages
       WHERE cafe_id = $1
         AND created_at >= $2
         AND created_at <= $3
         AND deleted_at IS NULL
       GROUP BY hour
       ORDER BY hour`,
      [cafeId, startDate, endDate]
    );

    return result.rows;
  }

  /**
   * Get real-time statistics (last 24 hours)
   */
  static async getRealtimeStats(cafeId: string) {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Active users (users who sent messages in last 24h)
    const activeUsersResult = await db.query(
      `SELECT COUNT(DISTINCT user_id)::int as active_users
       FROM messages
       WHERE cafe_id = $1 AND created_at >= $2 AND deleted_at IS NULL`,
      [cafeId, twentyFourHoursAgo]
    );

    // Total messages in last 24h
    const messagesResult = await db.query(
      `SELECT COUNT(*)::int as total_messages
       FROM messages
       WHERE cafe_id = $1 AND created_at >= $2 AND deleted_at IS NULL`,
      [cafeId, twentyFourHoursAgo]
    );

    // Messages in last hour
    const lastHourResult = await db.query(
      `SELECT COUNT(*)::int as messages_last_hour
       FROM messages
       WHERE cafe_id = $1 AND created_at >= NOW() - INTERVAL '1 hour' AND deleted_at IS NULL`,
      [cafeId]
    );

    // Agent queries in last 24h
    const agentResult = await db.query(
      `SELECT COUNT(*)::int as agent_queries
       FROM agent_queries
       WHERE cafe_id = $1 AND created_at >= $2`,
      [cafeId, twentyFourHoursAgo]
    );

    return {
      activeUsers: activeUsersResult.rows[0].active_users || 0,
      totalMessages: messagesResult.rows[0].total_messages || 0,
      messagesLastHour: lastHourResult.rows[0].messages_last_hour || 0,
      agentQueries: agentResult.rows[0].agent_queries || 0,
    };
  }

  /**
   * Update daily analytics (should run nightly via cron)
   */
  static async updateDailyAnalytics(cafeId: string, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Count total messages
    const messagesResult = await db.query(
      `SELECT COUNT(*)::int as total
       FROM messages
       WHERE cafe_id = $1 AND created_at >= $2 AND created_at <= $3 AND deleted_at IS NULL`,
      [cafeId, startOfDay, endOfDay]
    );

    // Count unique users
    const usersResult = await db.query(
      `SELECT COUNT(DISTINCT user_id)::int as total
       FROM messages
       WHERE cafe_id = $1 AND created_at >= $2 AND created_at <= $3`,
      [cafeId, startOfDay, endOfDay]
    );

    // Find peak hour
    const peakHourResult = await db.query(
      `SELECT EXTRACT(HOUR FROM created_at)::int as hour, COUNT(*) as count
       FROM messages
       WHERE cafe_id = $1 AND created_at >= $2 AND created_at <= $3
       GROUP BY hour
       ORDER BY count DESC
       LIMIT 1`,
      [cafeId, startOfDay, endOfDay]
    );

    // Count agent queries
    const agentQueriesResult = await db.query(
      `SELECT COUNT(*)::int as total
       FROM agent_queries
       WHERE cafe_id = $1 AND created_at >= $2 AND created_at <= $3`,
      [cafeId, startOfDay, endOfDay]
    );

    // Count pokes exchanged
    const pokesResult = await db.query(
      `SELECT COUNT(*)::int as total
       FROM pokes
       WHERE created_at >= $1 AND created_at <= $2`,
      [startOfDay, endOfDay]
    );

    // Count badges earned
    const badgesResult = await db.query(
      `SELECT COUNT(*)::int as total
       FROM badges
       WHERE earned_at >= $1 AND earned_at <= $2`,
      [startOfDay, endOfDay]
    );

    // Insert or update analytics
    await db.query(
      `INSERT INTO cafe_analytics (
         cafe_id, date, total_messages, unique_users, peak_hour,
         agent_queries, pokes_exchanged, badges_earned
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (cafe_id, date)
       DO UPDATE SET
         total_messages = EXCLUDED.total_messages,
         unique_users = EXCLUDED.unique_users,
         peak_hour = EXCLUDED.peak_hour,
         agent_queries = EXCLUDED.agent_queries,
         pokes_exchanged = EXCLUDED.pokes_exchanged,
         badges_earned = EXCLUDED.badges_earned`,
      [
        cafeId,
        date,
        messagesResult.rows[0].total || 0,
        usersResult.rows[0].total || 0,
        peakHourResult.rows[0]?.hour || null,
        agentQueriesResult.rows[0].total || 0,
        pokesResult.rows[0].total || 0,
        badgesResult.rows[0].total || 0,
      ]
    );
  }

  /**
   * Export analytics as CSV data
   */
  static async exportToCSV(
    cafeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<string> {
    const analytics = await this.getCafeAnalytics(cafeId, startDate, endDate);

    // CSV header
    let csv =
      'Date,Total Messages,Unique Users,Peak Hour,Agent Queries,Pokes Exchanged,Badges Earned\n';

    // CSV rows
    analytics.forEach((row) => {
      csv += [
        new Date(row.date).toISOString().split('T')[0],
        row.total_messages,
        row.unique_users,
        row.peak_hour || 'N/A',
        row.agent_queries,
        row.pokes_exchanged,
        row.badges_earned,
      ].join(',');
      csv += '\n';
    });

    return csv;
  }
}
