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
      <div className="glass-card rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white drop-shadow-lg">Analytics Dashboard</h2>
          <div className="flex space-x-4 relative z-10">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(Number(e.target.value))}
              className="glass-input px-4 py-2 rounded-xl text-white font-medium"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <button
              onClick={handleExport}
              className="glass-btn-primary px-4 py-2 rounded-xl text-white font-medium"
              style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.9), rgba(22, 163, 74, 0.9))' }}
            >
              Export CSV
            </button>
          </div>
        </div>

        {summary && (
          <div className="grid grid-cols-5 gap-4 mb-6 relative z-10">
            <div className="glass-light p-4 rounded-xl border border-blue-300/30">
              <p className="text-sm text-white/80 font-medium">Total Messages</p>
              <p className="text-2xl font-bold text-white drop-shadow">{summary.total_messages || 0}</p>
            </div>
            <div className="glass-light p-4 rounded-xl border border-green-300/30">
              <p className="text-sm text-white/80 font-medium">Avg Daily Users</p>
              <p className="text-2xl font-bold text-white drop-shadow">{summary.avg_daily_users || 0}</p>
            </div>
            <div className="glass-light p-4 rounded-xl border border-purple-300/30">
              <p className="text-sm text-white/80 font-medium">Agent Queries</p>
              <p className="text-2xl font-bold text-white drop-shadow">{summary.total_agent_queries || 0}</p>
            </div>
            <div className="glass-light p-4 rounded-xl border border-yellow-300/30">
              <p className="text-sm text-white/80 font-medium">Pokes Exchanged</p>
              <p className="text-2xl font-bold text-white drop-shadow">{summary.total_pokes || 0}</p>
            </div>
            <div className="glass-light p-4 rounded-xl border border-pink-300/30">
              <p className="text-sm text-white/80 font-medium">Badges Earned</p>
              <p className="text-2xl font-bold text-white drop-shadow">{summary.total_badges || 0}</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-white/70 text-lg">Loading analytics...</p>
          </div>
        ) : analytics.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-white/70 text-lg">No analytics data available</p>
          </div>
        ) : (
          <div className="glass-light rounded-xl p-4 relative z-10">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={analytics}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                  stroke="rgba(255,255,255,0.8)"
                />
                <YAxis stroke="rgba(255,255,255,0.8)" />
                <Tooltip
                  labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '12px',
                    color: 'white',
                  }}
                />
                <Legend wrapperStyle={{ color: 'white' }} />
                <Line
                  type="monotone"
                  dataKey="total_messages"
                  stroke="#60A5FA"
                  strokeWidth={2}
                  name="Messages"
                />
                <Line
                  type="monotone"
                  dataKey="unique_users"
                  stroke="#34D399"
                  strokeWidth={2}
                  name="Users"
                />
                <Line
                  type="monotone"
                  dataKey="agent_queries"
                  stroke="#A78BFA"
                  strokeWidth={2}
                  name="Agent Queries"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
