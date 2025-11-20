import React from 'react';
import { ChatMessage, ChatAgent } from '../../types/chat-agent.types';

interface AgentMessageProps {
  message: ChatMessage;
  agent?: ChatAgent;
  isStreaming?: boolean;
}

export const AgentMessage: React.FC<AgentMessageProps> = ({ message, agent, isStreaming }) => {
  return (
    <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100 animate-fadeIn">
      {/* Agent Avatar */}
      <div className="flex-shrink-0">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold shadow-md">
            {agent?.avatarUrl ? (
              <img
                src={agent.avatarUrl}
                alt={agent.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-lg">🤖</span>
            )}
          </div>
          {/* Online indicator */}
          {agent?.status === 'online' && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
          )}
          {agent?.status === 'busy' && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-orange-500 rounded-full border-2 border-white animate-pulse"></div>
          )}
        </div>
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        {/* Agent Name and Badge */}
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-blue-900">
            {agent?.name || message.username}
          </span>
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
            AI Assistant
          </span>
          {isStreaming && (
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1 animate-pulse">
              <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              Responding...
            </span>
          )}
          <span className="text-xs text-gray-500 ml-auto">
            {new Date(message.createdAt).toLocaleTimeString()}
          </span>
        </div>

        {/* Message Text */}
        <div className="text-gray-800 leading-relaxed">
          {message.content}
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-blue-500 ml-1 animate-blink"></span>
          )}
        </div>

        {/* Powered by Claude Badge (Optional) */}
        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
          <span>Powered by Claude AI</span>
        </div>
      </div>
    </div>
  );
};

// Streaming Message Component (for real-time updates)
interface StreamingMessageProps {
  content: string;
  agentName: string;
  agentAvatar?: string;
}

export const StreamingMessage: React.FC<StreamingMessageProps> = ({
  content,
  agentName,
  agentAvatar,
}) => {
  return (
    <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200 animate-fadeIn">
      {/* Agent Avatar */}
      <div className="flex-shrink-0">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold shadow-md animate-pulse">
            {agentAvatar ? (
              <img
                src={agentAvatar}
                alt={agentName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-lg">🤖</span>
            )}
          </div>
          {/* Busy indicator */}
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-orange-500 rounded-full border-2 border-white animate-pulse"></div>
        </div>
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        {/* Agent Name and Streaming Badge */}
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-blue-900">{agentName}</span>
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
            AI Assistant
          </span>
          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1 animate-pulse">
            <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span>
            Typing...
          </span>
        </div>

        {/* Streaming Text */}
        <div className="text-gray-800 leading-relaxed">
          {content}
          <span className="inline-block w-2 h-4 bg-blue-500 ml-1 animate-blink"></span>
        </div>
      </div>
    </div>
  );
};

// Add these animations to your CSS/Tailwind config:
// @keyframes fadeIn {
//   from { opacity: 0; transform: translateY(10px); }
//   to { opacity: 1; transform: translateY(0); }
// }
// @keyframes blink {
//   0%, 100% { opacity: 1; }
//   50% { opacity: 0; }
// }
// .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
// .animate-blink { animation: blink 1s infinite; }
