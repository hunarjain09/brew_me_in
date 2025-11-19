import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import toast from 'react-hot-toast';

interface AgentConfiguration {
  enabled: boolean;
  responseTime: 'fast' | 'balanced' | 'thorough';
  personality: string;
  specializations: string[];
  customPrompt?: string;
  proactiveMessagesEnabled?: boolean;
}

const AgentConfig: React.FC = () => {
  const { cafe } = useAuth();
  const [config, setConfig] = useState<AgentConfiguration>({
    enabled: true,
    responseTime: 'fast',
    personality: 'friendly',
    specializations: [],
    customPrompt: '',
    proactiveMessagesEnabled: false,
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
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-2xl font-bold mb-6 text-white drop-shadow-lg">Agent Configuration</h2>

        <div className="space-y-6 relative z-10">
          <div className="flex items-center justify-between glass-light p-4 rounded-xl">
            <div>
              <h3 className="text-lg font-semibold text-white">Agent Status</h3>
              <p className="text-sm text-white/70">Enable or disable the agent</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white/30 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-semibold text-white/90 mb-2">
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
              className="glass-input w-full px-4 py-2 rounded-xl text-white font-medium"
            >
              <option value="fast">Fast - Quick responses</option>
              <option value="balanced">Balanced - Moderate depth</option>
              <option value="thorough">Thorough - Deep analysis</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-white/90 mb-2">
              Personality
            </label>
            <select
              value={config.personality}
              onChange={(e) => setConfig({ ...config, personality: e.target.value })}
              className="glass-input w-full px-4 py-2 rounded-xl text-white font-medium"
            >
              <option value="friendly">Friendly - Warm and welcoming</option>
              <option value="professional">Professional - Formal and business-like</option>
              <option value="casual">Casual - Relaxed and laid-back</option>
              <option value="quirky">Quirky - Playful and humorous</option>
              <option value="bartender">Bartender - Knowledgeable and conversational</option>
              <option value="barista">Barista - Coffee enthusiast and energetic</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-white/90 mb-2">
              Custom System Prompt (Optional)
            </label>
            <textarea
              value={config.customPrompt}
              onChange={(e) => setConfig({ ...config, customPrompt: e.target.value })}
              className="glass-input w-full px-4 py-2 rounded-xl text-white placeholder-white/50 font-medium"
              placeholder="Add custom instructions for the AI agent..."
              rows={4}
            />
            <p className="text-xs text-white/60 mt-1">
              Override the default personality with your own custom instructions for how the agent should behave.
            </p>
          </div>

          <div className="flex items-center justify-between glass-light p-4 rounded-xl">
            <div>
              <h3 className="text-lg font-semibold text-white">Proactive Messages</h3>
              <p className="text-sm text-white/70">Allow agent to send proactive messages to users</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.proactiveMessagesEnabled}
                onChange={(e) => setConfig({ ...config, proactiveMessagesEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white/30 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-semibold text-white/90 mb-2">
              Specializations
            </label>
            <div className="space-y-2">
              {config.specializations.map((spec, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span className="flex-1 px-4 py-2 glass-light rounded-xl text-white font-medium">{spec}</span>
                  <button
                    onClick={() => removeSpecialization(index)}
                    className="glass-btn-primary px-3 py-2 rounded-xl text-white font-semibold"
                    style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.9), rgba(220, 38, 38, 0.9))' }}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                onClick={addSpecialization}
                className="glass-btn-primary px-4 py-2 rounded-xl text-white font-semibold"
                style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.9), rgba(22, 163, 74, 0.9))' }}
              >
                Add Specialization
              </button>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="glass-btn-primary w-full px-4 py-2 rounded-xl text-white font-semibold disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      {stats && (
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-xl font-semibold mb-4 text-white drop-shadow">Agent Statistics</h3>
          <div className="grid grid-cols-3 gap-4 relative z-10">
            <div className="glass-light p-4 rounded-xl border border-blue-300/30">
              <p className="text-sm text-white/80 font-medium">Total Queries</p>
              <p className="text-2xl font-bold text-white drop-shadow">{stats.total_queries || 0}</p>
            </div>
            <div className="glass-light p-4 rounded-xl border border-green-300/30">
              <p className="text-sm text-white/80 font-medium">Avg Processing Time</p>
              <p className="text-2xl font-bold text-white drop-shadow">{stats.avg_processing_time || 0}ms</p>
            </div>
            <div className="glass-light p-4 rounded-xl border border-purple-300/30">
              <p className="text-sm text-white/80 font-medium">Unique Users</p>
              <p className="text-2xl font-bold text-white drop-shadow">{stats.unique_users || 0}</p>
            </div>
          </div>
        </div>
      )}

      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-xl font-semibold mb-4 text-white drop-shadow">Recent Queries</h3>
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2 relative z-10">
          {queries.length === 0 ? (
            <p className="text-white/70 text-center py-8">No queries yet</p>
          ) : (
            queries.map((query) => (
              <div key={query.id} className="glass-light rounded-xl p-4 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-white">{query.username || 'Anonymous'}</span>
                  <span className="text-xs text-white/70">
                    {new Date(query.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="text-sm">
                  <p className="text-white/90 mb-2">
                    <strong className="text-white">Query:</strong> {query.query}
                  </p>
                  {query.response && (
                    <p className="text-white/80">
                      <strong className="text-white">Response:</strong> {query.response}
                    </p>
                  )}
                  {query.processing_time_ms && (
                    <p className="text-xs text-white/60 mt-1">
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
