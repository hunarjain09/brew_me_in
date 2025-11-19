import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';
import toast from 'react-hot-toast';

const Analytics: React.FC = () => {
  const { cafe } = useAuth();
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [dateRange, setDateRange] = useState(30);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!cafe?.id) return;

      setIsLoading(true);
      try {
        const endDate = new Date().toISOString();
        const startDate = subDays(new Date(), dateRange).toISOString();

        const response = await apiClient.get(`/analytics/${cafe.id}`, {
          params: { startDate, endDate },
        });

        setAnalytics(response.data.analytics);
        setSummary(response.data.summary);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
        toast.error('Failed to load analytics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [cafe, dateRange]);

  const handleExport = async () => {
    if (!cafe?.id) return;

    try {
      const endDate = new Date().toISOString();
      const startDate = subDays(new Date(), dateRange).toISOString();

      const response = await apiClient.get(`/analytics/${cafe.id}/export`, {
        params: { startDate, endDate },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics-${cafe.id}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('Analytics exported successfully');
    } catch (error) {
      console.error('Failed to export analytics:', error);
      toast.error('Failed to export analytics');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <div className="flex space-x-4">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(Number(e.target.value))}
              className="px-4 py-2 border rounded"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Export CSV
            </button>
          </div>
        </div>

        {summary && (
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Messages</p>
              <p className="text-2xl font-bold text-blue-600">{summary.total_messages || 0}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Avg Daily Users</p>
              <p className="text-2xl font-bold text-green-600">{summary.avg_daily_users || 0}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Agent Queries</p>
              <p className="text-2xl font-bold text-purple-600">{summary.total_agent_queries || 0}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Pokes Exchanged</p>
              <p className="text-2xl font-bold text-yellow-600">{summary.total_pokes || 0}</p>
            </div>
            <div className="bg-pink-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Badges Earned</p>
              <p className="text-2xl font-bold text-pink-600">{summary.total_badges || 0}</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-gray-500">Loading analytics...</p>
          </div>
        ) : analytics.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-gray-500">No analytics data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={analytics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => format(new Date(value), 'MMM dd')}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="total_messages"
                stroke="#3B82F6"
                name="Messages"
              />
              <Line
                type="monotone"
                dataKey="unique_users"
                stroke="#10B981"
                name="Users"
              />
              <Line
                type="monotone"
                dataKey="agent_queries"
                stroke="#8B5CF6"
                name="Agent Queries"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default Analytics;
