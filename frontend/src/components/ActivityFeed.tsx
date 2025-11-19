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
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Live Activity Feed</h2>
          <div className="flex space-x-2">
            {['all', 'message', 'moderation'].map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-4 py-2 rounded ${
                  filter === type
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No activity yet</p>
            <p className="text-sm mt-2">Activity will appear here in real-time</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {filteredActivities.map((activity, index) => (
              <div
                key={index}
                className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <div className="flex-shrink-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      activity.type === 'message'
                        ? 'bg-blue-100 text-blue-600'
                        : activity.type === 'moderation'
                        ? 'bg-red-100 text-red-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {activity.type === 'message' ? '💬' : '🛡️'}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="font-semibold text-gray-900">
                      {activity.user || activity.username || 'System'}
                    </p>
                    <span className="text-xs text-gray-500">
                      {format(new Date(activity.timestamp), 'HH:mm:ss')}
                    </span>
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        activity.type === 'moderation'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {activity.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1 break-words">
                    {activity.content}
                  </p>
                  {activity.metadata && (
                    <div className="text-xs text-gray-500 mt-2">
                      {Object.entries(activity.metadata).map(([key, value]) => (
                        <div key={key}>
                          <span className="font-medium">{key}:</span> {String(value)}
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
