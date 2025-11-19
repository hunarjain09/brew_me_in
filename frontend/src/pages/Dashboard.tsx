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
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Brew Me In</h1>
              <p className="text-sm text-gray-600 mt-1">{cafe?.name}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className="text-sm text-gray-600">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                {moderator?.email}
              </div>
              <button
                onClick={logout}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.activeUsers}</div>
              <div className="text-sm text-gray-600">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.totalMessages}</div>
              <div className="text-sm text-gray-600">Messages</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.agentQueries}</div>
              <div className="text-sm text-gray-600">Agent Queries</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.flaggedMessages}</div>
              <div className="text-sm text-gray-600">Flagged</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-8">
          {/* Sidebar Navigation */}
          <nav className="w-64 bg-white rounded-lg shadow p-4">
            <ul className="space-y-2">
              {navigation.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center space-x-3 px-4 py-2 rounded-lg ${
                      location.pathname === item.path
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Main Content */}
          <main className="flex-1">
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
