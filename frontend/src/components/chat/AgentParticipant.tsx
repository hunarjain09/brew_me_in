import React from 'react';
import { ChatAgent } from '../../types/chat-agent.types';

interface AgentParticipantProps {
  agent: ChatAgent;
  onClick?: () => void;
}

export const AgentParticipant: React.FC<AgentParticipantProps> = ({ agent, onClick }) => {
  const getStatusColor = () => {
    switch (agent.status) {
      case 'online':
        return 'bg-green-500';
      case 'busy':
        return 'bg-orange-500';
      case 'offline':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = () => {
    if (agent.isTyping) return 'typing...';
    return agent.status;
  };

  const getPersonalityIcon = () => {
    switch (agent.personality) {
      case 'bartender':
        return '☕';
      case 'quirky':
        return '🎨';
      case 'historian':
        return '📚';
      case 'sarcastic':
        return '😏';
      case 'professional':
        return '💼';
      default:
        return '🤖';
    }
  };

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
        onClick
          ? 'cursor-pointer hover:bg-blue-50 hover:shadow-sm active:scale-98'
          : ''
      } ${agent.isTyping ? 'bg-blue-50' : ''}`}
      onClick={onClick}
    >
      {/* Agent Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold shadow-md">
          {agent.avatarUrl ? (
            <img
              src={agent.avatarUrl}
              alt={agent.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span className="text-xl">{getPersonalityIcon()}</span>
          )}
        </div>

        {/* Status Indicator */}
        <div
          className={`absolute bottom-0 right-0 w-3.5 h-3.5 ${getStatusColor()} rounded-full border-2 border-white ${
            agent.isTyping ? 'animate-pulse' : ''
          }`}
        ></div>
      </div>

      {/* Agent Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900 truncate">
            {agent.name}
          </h3>
          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
            AI
          </span>
        </div>

        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-sm text-gray-600 truncate">
            @{agent.username}
          </p>
          <span className="text-xs text-gray-500">•</span>
          <p className={`text-xs ${agent.isTyping ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
            {getStatusText()}
          </p>
        </div>

        {/* Personality Badge */}
        {agent.personality && (
          <div className="mt-1">
            <span className="text-xs text-gray-500 capitalize">
              {agent.personality} personality
            </span>
          </div>
        )}
      </div>

      {/* Quick Mention Button */}
      {onClick && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="flex-shrink-0 p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
          title={`Mention @${agent.username}`}
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
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </button>
      )}
    </div>
  );
};

// Agent List Component
interface AgentListProps {
  agents: ChatAgent[];
  onAgentClick?: (agent: ChatAgent) => void;
}

export const AgentList: React.FC<AgentListProps> = ({ agents, onAgentClick }) => {
  if (agents.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <div className="text-4xl mb-2">🤖</div>
        <p className="text-sm">No agents available</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {agents.map((agent) => (
        <AgentParticipant
          key={agent.id}
          agent={agent}
          onClick={onAgentClick ? () => onAgentClick(agent) : undefined}
        />
      ))}
    </div>
  );
};
