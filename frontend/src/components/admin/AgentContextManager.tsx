import React, { useState, useEffect } from 'react';
import { AgentContext, ContextType, ChatAgent } from '../../types/chat-agent.types';

interface AgentContextManagerProps {
  agent: ChatAgent;
  apiBaseUrl?: string;
  token: string;
}

export const AgentContextManager: React.FC<AgentContextManagerProps> = ({
  agent,
  apiBaseUrl = '/api',
  token,
}) => {
  const [contexts, setContexts] = useState<AgentContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingContext, setEditingContext] = useState<AgentContext | null>(null);
  const [newContext, setNewContext] = useState({
    contextType: 'knowledge' as ContextType,
    content: '',
    priority: 0,
    enabled: true,
  });
  const [showAddForm, setShowAddForm] = useState(false);

  // Fetch contexts
  useEffect(() => {
    fetchContexts();
  }, [agent.id]);

  const fetchContexts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBaseUrl}/chat-agent/${agent.id}/context`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setContexts(data);
      }
    } catch (error) {
      console.error('Failed to fetch contexts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Upsert context
  const handleSaveContext = async () => {
    try {
      setSaving(true);
      const contextToSave = editingContext || newContext;

      const response = await fetch(`${apiBaseUrl}/chat-agent/${agent.id}/context`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(contextToSave),
      });

      if (response.ok) {
        await fetchContexts();
        setEditingContext(null);
        setShowAddForm(false);
        setNewContext({
          contextType: 'knowledge',
          content: '',
          priority: 0,
          enabled: true,
        });
      }
    } catch (error) {
      console.error('Failed to save context:', error);
    } finally {
      setSaving(false);
    }
  };

  // Delete context
  const handleDeleteContext = async (contextId: string) => {
    if (!confirm('Are you sure you want to delete this context?')) return;

    try {
      const response = await fetch(`${apiBaseUrl}/chat-agent/context/${contextId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchContexts();
      }
    } catch (error) {
      console.error('Failed to delete context:', error);
    }
  };

  const getContextTypeColor = (type: ContextType) => {
    switch (type) {
      case 'system':
        return 'bg-purple-100 text-purple-800';
      case 'knowledge':
        return 'bg-blue-100 text-blue-800';
      case 'instruction':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Agent Context</h2>
          <p className="text-gray-600 mt-1">
            Manage what {agent.name} knows and how it behaves
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showAddForm ? 'Cancel' : '+ Add Context'}
        </button>
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingContext) && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">
            {editingContext ? 'Edit Context' : 'Add New Context'}
          </h3>

          <div className="space-y-4">
            {/* Context Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Context Type
              </label>
              <select
                value={editingContext?.contextType || newContext.contextType}
                onChange={(e) =>
                  editingContext
                    ? setEditingContext({
                        ...editingContext,
                        contextType: e.target.value as ContextType,
                      })
                    : setNewContext({
                        ...newContext,
                        contextType: e.target.value as ContextType,
                      })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="system">System - Core instructions</option>
                <option value="knowledge">Knowledge - Facts & information</option>
                <option value="instruction">Instruction - Specific behaviors</option>
              </select>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content
              </label>
              <textarea
                value={editingContext?.content || newContext.content}
                onChange={(e) =>
                  editingContext
                    ? setEditingContext({ ...editingContext, content: e.target.value })
                    : setNewContext({ ...newContext, content: e.target.value })
                }
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter context content..."
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority (higher = more important)
              </label>
              <input
                type="number"
                value={editingContext?.priority || newContext.priority}
                onChange={(e) =>
                  editingContext
                    ? setEditingContext({
                        ...editingContext,
                        priority: parseInt(e.target.value),
                      })
                    : setNewContext({ ...newContext, priority: parseInt(e.target.value) })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Enabled */}
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={editingContext?.enabled ?? newContext.enabled}
                onChange={(e) =>
                  editingContext
                    ? setEditingContext({ ...editingContext, enabled: e.target.checked })
                    : setNewContext({ ...newContext, enabled: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="ml-2 text-sm text-gray-700">Enabled</label>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <button
                onClick={handleSaveContext}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setEditingContext(null);
                  setShowAddForm(false);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Context List */}
      <div className="space-y-4">
        {contexts.length === 0 ? (
          <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-4xl mb-2">📚</div>
            <p className="text-gray-600">No context configured yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Add context to customize the agent's knowledge and behavior
            </p>
          </div>
        ) : (
          contexts.map((context) => (
            <div
              key={context.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getContextTypeColor(
                        context.contextType
                      )}`}
                    >
                      {context.contextType}
                    </span>
                    <span className="text-xs text-gray-500">
                      Priority: {context.priority}
                    </span>
                    {!context.enabled && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                        Disabled
                      </span>
                    )}
                  </div>
                  <p className="text-gray-800 whitespace-pre-wrap">{context.content}</p>
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => setEditingContext(context)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteContext(context.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
