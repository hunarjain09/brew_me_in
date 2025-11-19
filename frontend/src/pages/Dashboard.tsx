import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import Overview from '../components/Overview';
import ActivityFeed from '../components/ActivityFeed';
import Analytics from '../components/Analytics';
import Users from '../components/Users';
import AgentConfig from '../components/AgentConfig';

const Dashboard: React.FC = () => {
  const { moderator, cafe, logout } = useAuth();
  const { isConnected, stats } = useWebSocket();
  const location = useLocation();

  const navigation = [
    { name: 'Overview', path: '/', icon: '📊' },
    { name: 'Activity', path: '/activity', icon: '📡' },
    { name: 'Analytics', path: '/analytics', icon: '📈' },
    { name: 'Users', path: '/users', icon: '👥' },
    { name: 'Agent Config', path: '/agent', icon: '🤖' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-600 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-pink-400 opacity-20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-300 opacity-20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/3 w-72 h-72 bg-purple-300 opacity-20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Header */}
      <header className="glass-nav sticky top-0 z-50 border-b-0 animate-slide-up">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-white drop-shadow-lg">Brew Me In</h1>
              <p className="text-sm text-white/80 mt-1">{cafe?.name}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 glass-light rounded-full px-4 py-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-green-400 shadow-lg shadow-green-400/50' : 'bg-red-400 shadow-lg shadow-red-400/50'
                  }`}
                />
                <span className="text-sm text-white font-medium">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="text-sm text-white/90 font-medium">
                {moderator?.email}
              </div>
              <button
                onClick={logout}
                className="glass-btn-secondary px-4 py-2 rounded-lg text-white font-medium hover:bg-red-500/30"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="glass-heavy border-b border-white/20 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="glass-card rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-white drop-shadow-lg">{stats.activeUsers}</div>
              <div className="text-sm text-white/80 font-medium mt-1">Active Users</div>
            </div>
            <div className="glass-card rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-white drop-shadow-lg">{stats.totalMessages}</div>
              <div className="text-sm text-white/80 font-medium mt-1">Messages</div>
            </div>
            <div className="glass-card rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-white drop-shadow-lg">{stats.agentQueries}</div>
              <div className="text-sm text-white/80 font-medium mt-1">Agent Queries</div>
            </div>
            <div className="glass-card rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-white drop-shadow-lg">{stats.flaggedMessages}</div>
              <div className="text-sm text-white/80 font-medium mt-1">Flagged</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="flex space-x-8">
          {/* Sidebar Navigation */}
          <nav className="w-64 glass-card rounded-2xl p-4 h-fit sticky top-24 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <ul className="space-y-2 relative z-10">
              {navigation.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                      location.pathname === item.path
                        ? 'glass-btn-primary text-white shadow-lg'
                        : 'text-white/90 hover:glass-light hover:bg-white/10'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="font-medium">{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Main Content */}
          <main className="flex-1 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/activity" element={<ActivityFeed />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/users" element={<Users />} />
              <Route path="/agent" element={<AgentConfig />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
