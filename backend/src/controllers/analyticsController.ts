import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analyticsService';
import { apiResponse } from '../utils/apiResponse';

/**
 * Component 6: Analytics Controller
 * Handles cafe analytics endpoints
 */

/**
 * Get cafe analytics
 * GET /api/admin/analytics
 */
export const getCafeAnalytics = async (req: Request, res: Response) => {
  try {
    const cafeId = req.user?.cafeId;
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate = new Date().toISOString(),
    } = req.query;

    if (!cafeId) {
      return apiResponse.error(res, 'Cafe ID is required', 400);
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    // Get analytics data
    const analytics = await AnalyticsService.getCafeAnalytics(
      cafeId,
      start,
      end
    );

    // Get summary stats
    const summary = await AnalyticsService.getSummaryStats(cafeId, start, end);

    // Get hourly distribution
    const hourlyDistribution = await AnalyticsService.getHourlyDistribution(
      cafeId,
      start,
      end
    );

    return apiResponse.success(res, {
      analytics,
      summary,
      hourlyDistribution,
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    return apiResponse.error(res, 'Failed to fetch analytics', 500);
  }
};

/**
 * Get real-time stats
 * GET /api/admin/analytics/realtime
 */
export const getRealtimeStats = async (req: Request, res: Response) => {
  try {
    const cafeId = req.user?.cafeId;

    if (!cafeId) {
      return apiResponse.error(res, 'Cafe ID is required', 400);
    }

    const stats = await AnalyticsService.getRealtimeStats(cafeId);

    return apiResponse.success(res, stats);
  } catch (error) {
    console.error('Get realtime stats error:', error);
    return apiResponse.error(res, 'Failed to fetch realtime stats', 500);
  }
};

/**
 * Export analytics as CSV
 * GET /api/admin/analytics/export
 */
export const exportAnalytics = async (req: Request, res: Response) => {
  try {
    const cafeId = req.user?.cafeId;
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate = new Date().toISOString(),
    } = req.query;

    if (!cafeId) {
      return apiResponse.error(res, 'Cafe ID is required', 400);
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    const csv = await AnalyticsService.exportToCSV(cafeId, start, end);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="cafe-analytics-${cafeId}-${startDate}-${endDate}.csv"`
    );
    res.send(csv);
  } catch (error) {
    console.error('Export analytics error:', error);
    return apiResponse.error(res, 'Failed to export analytics', 500);
  }
};
