import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { format } from 'date-fns';

const ActivityFeed: React.FC = () => {
  const { activities } = useWebSocket();
  const { cafe } = useAuth();
  const [filter, setFilter] = useState<string>('all');
  const [historicalActivities, setHistoricalActivities] = useState<any[]>([]);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = await apiClient.get(`/cafes/${cafe?.id}/activity`, {
          params: { limit: 100 },
        });
        setHistoricalActivities(response.data.activity);
      } catch (error) {
        console.error('Failed to fetch activities:', error);
      }
    };

    if (cafe?.id) {
      fetchActivities();
    }
  }, [cafe]);

  // Combine real-time and historical activities
  const allActivities = [...activities, ...historicalActivities];

  const filteredActivities =
    filter === 'all'
      ? allActivities
      : allActivities.filter((a) => a.type === filter);

  return (
    <div className="glass-card rounded-2xl">
      <div className="p-6 border-b border-white/20">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white drop-shadow-lg">Live Activity Feed</h2>
          <div className="flex space-x-2 relative z-10">
            {['all', 'message', 'moderation'].map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  filter === type
                    ? 'glass-btn-primary text-white shadow-lg'
                    : 'glass-light text-white/80 hover:glass-medium hover:text-white'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6">
        {filteredActivities.length === 0 ? (
          <div className="text-center py-12 text-white/70">
            <p className="text-lg font-semibold">No activity yet</p>
            <p className="text-sm mt-2">Activity will appear here in real-time</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar relative z-10">
            {filteredActivities.map((activity, index) => (
              <div
                key={index}
                className="flex items-start space-x-4 p-4 glass-light rounded-xl hover:glass-medium transition-all"
              >
                <div className="flex-shrink-0">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                      activity.type === 'message'
                        ? 'bg-blue-400/30 border border-blue-300/30'
                        : activity.type === 'moderation'
                        ? 'bg-red-400/30 border border-red-300/30'
                        : 'bg-gray-400/30 border border-gray-300/30'
                    }`}
                  >
                    {activity.type === 'message' ? '💬' : '🛡️'}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 flex-wrap">
                    <p className="font-semibold text-white">
                      {activity.user || activity.username || 'System'}
                    </p>
                    <span className="text-xs text-white/70 font-medium">
                      {format(new Date(activity.timestamp), 'HH:mm:ss')}
                    </span>
                    <span
                      className={`px-3 py-1 text-xs rounded-full font-semibold ${
                        activity.type === 'moderation'
                          ? 'bg-red-400/30 text-red-100 border border-red-300/30'
                          : 'bg-blue-400/30 text-blue-100 border border-blue-300/30'
                      }`}
                    >
                      {activity.type}
                    </span>
                  </div>
                  <p className="text-sm text-white/90 mt-2 break-words">
                    {activity.content}
                  </p>
                  {activity.metadata && (
                    <div className="text-xs text-white/60 mt-2 font-mono bg-white/5 rounded-lg p-2">
                      {Object.entries(activity.metadata).map(([key, value]) => (
                        <div key={key}>
                          <span className="font-semibold text-white/80">{key}:</span> {String(value)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;
