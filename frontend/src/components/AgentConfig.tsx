import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import toast from 'react-hot-toast';

interface AgentConfiguration {
  enabled: boolean;
  responseTime: 'fast' | 'balanced' | 'thorough';
  personality: string;
  specializations: string[];
}

const AgentConfig: React.FC = () => {
  const { cafe } = useAuth();
  const [config, setConfig] = useState<AgentConfiguration>({
    enabled: true,
    responseTime: 'fast',
    personality: 'friendly',
    specializations: [],
  });
  const [queries, setQueries] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
    fetchQueries();
  }, [cafe]);

  const fetchConfig = async () => {
    if (!cafe?.id) return;

    try {
      const response = await apiClient.get(`/agent/config/${cafe.id}`);
      setConfig(response.data.config);
    } catch (error) {
      console.error('Failed to fetch agent config:', error);
    }
  };

  const fetchQueries = async () => {
    if (!cafe?.id) return;

    try {
      const response = await apiClient.get(`/agent/queries/${cafe.id}`, {
        params: { limit: 20 },
      });
      setQueries(response.data.queries);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Failed to fetch agent queries:', error);
    }
  };

  const handleSave = async () => {
    if (!cafe?.id) return;

    setIsSaving(true);
    try {
      await apiClient.put(`/agent/config/${cafe.id}`, config);
      toast.success('Agent configuration saved successfully');
    } catch (error) {
      console.error('Failed to save agent config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const addSpecialization = () => {
    const specialization = prompt('Enter a new specialization:');
    if (specialization) {
      setConfig({
        ...config,
        specializations: [...config.specializations, specialization],
      });
    }
  };

  const removeSpecialization = (index: number) => {
    setConfig({
      ...config,
      specializations: config.specializations.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-6">Agent Configuration</h2>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Agent Status</h3>
              <p className="text-sm text-gray-600">Enable or disable the agent</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Response Time
            </label>
            <select
              value={config.responseTime}
              onChange={(e) =>
                setConfig({
                  ...config,
                  responseTime: e.target.value as 'fast' | 'balanced' | 'thorough',
                })
              }
              className="w-full px-4 py-2 border rounded"
            >
              <option value="fast">Fast - Quick responses</option>
              <option value="balanced">Balanced - Moderate depth</option>
              <option value="thorough">Thorough - Deep analysis</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Personality
            </label>
            <input
              type="text"
              value={config.personality}
              onChange={(e) => setConfig({ ...config, personality: e.target.value })}
              className="w-full px-4 py-2 border rounded"
              placeholder="e.g., friendly, professional, casual"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Specializations
            </label>
            <div className="space-y-2">
              {config.specializations.map((spec, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span className="flex-1 px-4 py-2 bg-gray-100 rounded">{spec}</span>
                  <button
                    onClick={() => removeSpecialization(index)}
                    className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                onClick={addSpecialization}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Add Specialization
              </button>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      {stats && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4">Agent Statistics</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Queries</p>
              <p className="text-2xl font-bold text-blue-600">{stats.total_queries || 0}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Avg Processing Time</p>
              <p className="text-2xl font-bold text-green-600">{stats.avg_processing_time || 0}ms</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Unique Users</p>
              <p className="text-2xl font-bold text-purple-600">{stats.unique_users || 0}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold mb-4">Recent Queries</h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {queries.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No queries yet</p>
          ) : (
            queries.map((query) => (
              <div key={query.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{query.username || 'Anonymous'}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(query.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="text-sm">
                  <p className="text-gray-700 mb-2">
                    <strong>Query:</strong> {query.query}
                  </p>
                  {query.response && (
                    <p className="text-gray-600">
                      <strong>Response:</strong> {query.response}
                    </p>
                  )}
                  {query.processing_time_ms && (
                    <p className="text-xs text-gray-500 mt-1">
                      Processing time: {query.processing_time_ms}ms
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentConfig;
