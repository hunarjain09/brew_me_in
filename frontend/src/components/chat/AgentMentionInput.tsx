import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { ChatAgent } from '../../types/chat-agent.types';

interface AgentMentionInputProps {
  agents: ChatAgent[];
  onSend: (message: string, mentionedAgent?: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rateLimited?: boolean;
  rateLimitMessage?: string;
}

export const AgentMentionInput: React.FC<AgentMentionInputProps> = ({
  agents,
  onSend,
  placeholder = 'Type a message... Use @ to mention an agent',
  disabled = false,
  rateLimited = false,
  rateLimitMessage,
}) => {
  const [message, setMessage] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [filteredAgents, setFilteredAgents] = useState<ChatAgent[]>([]);
  const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Detect @ mentions and filter agents
  useEffect(() => {
    const cursorPosition = inputRef.current?.selectionStart || 0;
    const textBeforeCursor = message.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex >= 0) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      const hasSpace = textAfterAt.includes(' ');

      if (!hasSpace) {
        // Filter agents by the text after @
        const filtered = agents.filter((agent) =>
          agent.username.toLowerCase().startsWith(textAfterAt.toLowerCase()) ||
          agent.name.toLowerCase().includes(textAfterAt.toLowerCase())
        );

        if (filtered.length > 0) {
          setFilteredAgents(filtered);
          setShowSuggestions(true);
          setMentionStartIndex(lastAtIndex);
          setSelectedSuggestionIndex(0);
          return;
        }
      }
    }

    setShowSuggestions(false);
    setMentionStartIndex(-1);
  }, [message, agents]);

  // Handle agent selection
  const selectAgent = (agent: ChatAgent) => {
    if (mentionStartIndex >= 0) {
      const cursorPosition = inputRef.current?.selectionStart || 0;
      const beforeMention = message.substring(0, mentionStartIndex);
      const afterCursor = message.substring(cursorPosition);
      const newMessage = `${beforeMention}@${agent.username} ${afterCursor}`;

      setMessage(newMessage);
      setShowSuggestions(false);

      // Focus input and set cursor position
      setTimeout(() => {
        if (inputRef.current) {
          const newCursorPos = mentionStartIndex + agent.username.length + 2; // +2 for @ and space
          inputRef.current.focus();
          inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }
  };

  // Handle keyboard navigation in suggestions
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && filteredAgents.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedSuggestionIndex((prev) =>
            prev < filteredAgents.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedSuggestionIndex((prev) =>
            prev > 0 ? prev - 1 : filteredAgents.length - 1
          );
          break;
        case 'Enter':
          if (!e.shiftKey) {
            e.preventDefault();
            selectAgent(filteredAgents[selectedSuggestionIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowSuggestions(false);
          break;
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle send message
  const handleSend = () => {
    if (!message.trim() || disabled || rateLimited) return;

    // Extract mentioned agent if any
    const mentionMatch = message.match(/@(\w+)/);
    const mentionedAgent = mentionMatch ? mentionMatch[1] : undefined;

    onSend(message.trim(), mentionedAgent);
    setMessage('');
    setShowSuggestions(false);
  };

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 150)}px`;
    }
  }, [message]);

  return (
    <div className="relative">
      {/* Agent Suggestions Dropdown */}
      {showSuggestions && filteredAgents.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto z-50 animate-slideUp"
        >
          <div className="p-2 space-y-1">
            {filteredAgents.map((agent, index) => (
              <button
                key={agent.id}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  index === selectedSuggestionIndex
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => selectAgent(agent)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold">
                    {agent.avatarUrl ? (
                      <img
                        src={agent.avatarUrl}
                        alt={agent.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      '🤖'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">
                        {agent.name}
                      </span>
                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                        AI
                      </span>
                    </div>
                    <span className="text-sm text-gray-600">@{agent.username}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Rate Limit Warning */}
      {rateLimited && rateLimitMessage && (
        <div className="mb-2 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-2">
          <svg
            className="w-5 h-5 text-orange-500 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span className="text-sm text-orange-800">{rateLimitMessage}</span>
        </div>
      )}

      {/* Input Container */}
      <div className="flex items-end gap-2 bg-white border border-gray-300 rounded-lg p-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 transition-all">
        <textarea
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || rateLimited}
          className="flex-1 resize-none outline-none px-2 py-1 max-h-[150px] disabled:opacity-50 disabled:cursor-not-allowed"
          rows={1}
        />

        <button
          onClick={handleSend}
          disabled={!message.trim() || disabled || rateLimited}
          className="flex-shrink-0 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Send message (Enter)"
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
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>
      </div>

      {/* Hint Text */}
      <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
        <span>Press @ to mention an agent</span>
        <span>•</span>
        <span>Enter to send • Shift+Enter for new line</span>
      </div>
    </div>
  );
};

// Add this animation to your CSS:
// @keyframes slideUp {
//   from { transform: translateY(10px); opacity: 0; }
//   to { transform: translateY(0); opacity: 1; }
// }
// .animate-slideUp { animation: slideUp 0.2s ease-out; }
