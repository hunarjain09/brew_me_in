import React, { useEffect, useRef } from 'react';
import { useChatSocket } from '../../hooks/useChatSocket';
import { AgentMessage } from './AgentMessage';
import { AgentList } from './AgentParticipant';
import { AgentMentionInput } from './AgentMentionInput';
import { ChatMessage } from '../../types/chat-agent.types';

interface CafeChatRoomProps {
  cafeId: string;
  userId: string;
  token: string;
  cafeName?: string;
}

export const CafeChatRoom: React.FC<CafeChatRoomProps> = ({
  cafeId,
  userId,
  token,
  cafeName = 'Cafe',
}) => {
  const {
    isConnected,
    messages,
    agents,
    userCount,
    typingUsers,
    typingAgents,
    rateLimitInfo,
    sendMessage,
    mentionAgent,
  } = useChatSocket({ cafeId, userId, token });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (message: string, mentionedAgent?: string) => {
    if (mentionedAgent) {
      // If an agent was mentioned, use the mention function
      const agentMatch = agents.find(a => a.username === mentionedAgent);
      if (agentMatch) {
        // Extract the message without the @mention
        const cleanMessage = message.replace(`@${mentionedAgent}`, '').trim();
        mentionAgent(mentionedAgent, cleanMessage);
        return;
      }
    }

    // Otherwise, send as regular message
    sendMessage(message);
  };

  const handleAgentClick = (agent: any) => {
    // When clicking an agent, we could scroll to their last message
    // or focus the input with their mention
    const input = document.querySelector('textarea');
    if (input) {
      const currentValue = input.value;
      input.value = `@${agent.username} `;
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{cafeName}</h1>
              <div className="flex items-center gap-2 mt-1">
                {isConnected ? (
                  <>
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-sm text-gray-600">Connected</span>
                  </>
                ) : (
                  <>
                    <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    <span className="text-sm text-gray-600">Connecting...</span>
                  </>
                )}
                <span className="text-sm text-gray-400">•</span>
                <span className="text-sm text-gray-600">{userCount} online</span>
              </div>
            </div>

            {/* Cafe Info */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
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
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <svg
                className="w-16 h-16 mb-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p className="text-lg font-medium">No messages yet</p>
              <p className="text-sm mt-1">
                Start the conversation or mention an agent with @
              </p>
            </div>
          )}

          {messages.map((message) => {
            const isAgentMessage = message.messageType === 'agent';
            const agent = agents.find(a => a.id === message.agentId);

            if (isAgentMessage) {
              return (
                <AgentMessage
                  key={message.id}
                  message={message}
                  agent={agent}
                  isStreaming={message.isStreaming}
                />
              );
            }

            return (
              <div
                key={message.id}
                className="flex items-start gap-3 p-4 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold">
                    {message.username.charAt(0).toUpperCase()}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">
                      {message.username}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing Indicators */}
          {(typingUsers.length > 0 || typingAgents.length > 0) && (
            <div className="flex items-center gap-2 text-sm text-gray-600 px-4">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
              <span>
                {[...typingUsers, ...typingAgents.map(a => `@${a}`)].join(', ')}{' '}
                {typingUsers.length + typingAgents.length === 1 ? 'is' : 'are'} typing...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 p-4">
          <AgentMentionInput
            agents={agents}
            onSend={handleSendMessage}
            disabled={!isConnected}
            rateLimited={rateLimitInfo.limited}
            rateLimitMessage={rateLimitInfo.message}
          />
        </div>
      </div>

      {/* Sidebar - Agents and Users */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">AI Assistants</h2>
          <p className="text-sm text-gray-600 mt-1">
            {agents.length} agent{agents.length !== 1 ? 's' : ''} available
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <AgentList agents={agents} onAgentClick={handleAgentClick} />

          {agents.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
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
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                How to interact
              </h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>• Type @ to mention an agent</li>
                <li>• Ask questions naturally</li>
                <li>• Click an agent to mention them</li>
                <li>• Agents respond in real-time</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
