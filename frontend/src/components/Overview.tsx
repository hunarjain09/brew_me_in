import React from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../context/AuthContext';

const Overview: React.FC = () => {
  const { stats, activities } = useWebSocket();
  const { cafe } = useAuth();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Welcome to {cafe?.name}</h2>
        <p className="text-gray-600">{cafe?.description}</p>
        {cafe?.location && (
          <p className="text-sm text-gray-500 mt-2">📍 {cafe.location}</p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold mb-4">Recent Activity</h3>
        {activities.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {activities.slice(0, 10).map((activity, index) => (
              <div
                key={index}
                className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{activity.user || 'System'}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{activity.content}</p>
                  {activity.metadata && (
                    <p className="text-xs text-gray-500 mt-1">
                      {JSON.stringify(activity.metadata)}
                    </p>
                  )}
                </div>
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
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Quick Stats</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Active Users:</span>
              <span className="font-bold">{stats.activeUsers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Messages:</span>
              <span className="font-bold">{stats.totalMessages}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Agent Queries:</span>
              <span className="font-bold">{stats.agentQueries}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Flagged Messages:</span>
              <span className="font-bold">{stats.flaggedMessages}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Quick Actions</h3>
          <div className="space-y-2">
            <button className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              View All Users
            </button>
            <button className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
              Export Analytics
            </button>
            <button className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600">
              Configure Agent
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
