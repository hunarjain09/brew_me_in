import React from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../context/AuthContext';

const Overview: React.FC = () => {
  const { stats, activities } = useWebSocket();
  const { cafe } = useAuth();

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-2xl font-bold mb-4 text-white drop-shadow-lg">Welcome to {cafe?.name}</h2>
        <p className="text-white/90">{cafe?.description}</p>
        {cafe?.location && (
          <p className="text-sm text-white/80 mt-2 flex items-center">
            <span className="mr-2">📍</span>
            {cafe.location}
          </p>
        )}
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-xl font-semibold mb-4 text-white drop-shadow">Recent Activity</h3>
        {activities.length === 0 ? (
          <p className="text-white/70 text-center py-8">No recent activity</p>
        ) : (
          <div className="space-y-3 relative z-10">
            {activities.slice(0, 10).map((activity, index) => (
              <div
                key={index}
                className="flex items-start space-x-3 p-4 glass-light rounded-xl hover:glass-medium transition-all"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-white">{activity.user || 'System'}</span>
                    <span className="text-xs text-white/70">
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-white/90 mt-1">{activity.content}</p>
                  {activity.metadata && (
                    <p className="text-xs text-white/60 mt-1 font-mono">
                      {JSON.stringify(activity.metadata)}
                    </p>
                  )}
                </div>
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
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4 text-white drop-shadow">Quick Stats</h3>
          <div className="space-y-3 text-sm relative z-10">
            <div className="flex justify-between items-center p-2 glass-light rounded-lg">
              <span className="text-white/80">Active Users:</span>
              <span className="font-bold text-white text-lg">{stats.activeUsers}</span>
            </div>
            <div className="flex justify-between items-center p-2 glass-light rounded-lg">
              <span className="text-white/80">Total Messages:</span>
              <span className="font-bold text-white text-lg">{stats.totalMessages}</span>
            </div>
            <div className="flex justify-between items-center p-2 glass-light rounded-lg">
              <span className="text-white/80">Agent Queries:</span>
              <span className="font-bold text-white text-lg">{stats.agentQueries}</span>
            </div>
            <div className="flex justify-between items-center p-2 glass-light rounded-lg">
              <span className="text-white/80">Flagged Messages:</span>
              <span className="font-bold text-white text-lg">{stats.flaggedMessages}</span>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4 text-white drop-shadow">Quick Actions</h3>
          <div className="space-y-3 relative z-10">
            <button className="glass-btn-primary w-full px-4 py-3 rounded-xl text-white font-medium">
              View All Users
            </button>
            <button className="glass-btn-primary w-full px-4 py-3 rounded-xl text-white font-medium" style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.9), rgba(22, 163, 74, 0.9))' }}>
              Export Analytics
            </button>
            <button className="glass-btn-primary w-full px-4 py-3 rounded-xl text-white font-medium" style={{ background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.9), rgba(147, 51, 234, 0.9))' }}>
              Configure Agent
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
