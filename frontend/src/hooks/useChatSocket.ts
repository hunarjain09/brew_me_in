import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  ChatMessage,
  ChatAgent,
  ClientToServerEvents,
  ServerToClientEvents,
  RateLimitInfo,
} from '../types/chat-agent.types';

const WS_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface UseChatSocketOptions {
  cafeId: string;
  userId: string;
  token: string;
}

export const useChatSocket = ({ cafeId, userId, token }: UseChatSocketOptions) => {
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [agents, setAgents] = useState<ChatAgent[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [typingAgents, setTypingAgents] = useState<Set<string>>(new Set());
  const [userCount, setUserCount] = useState(0);
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo>({ limited: false });
  const [streamingMessages, setStreamingMessages] = useState<Map<string, string>>(new Map());

  // Connect to socket
  useEffect(() => {
    if (!token || !cafeId || !userId) return;

    console.log('🔌 Connecting to chat socket...');

    const socket = io(WS_URL, {
      auth: { token },
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('✅ Chat socket connected');
      setIsConnected(true);

      // Join cafe room
      socket.emit('join:cafe', { cafeId, userId });
      // Request agent list
      socket.emit('agent:list', { cafeId });
    });

    socket.on('disconnect', () => {
      console.log('❌ Chat socket disconnected');
      setIsConnected(false);
    });

    socket.on('connected', (data) => {
      console.log('Connected to cafe:', data);
    });

    // Message events
    socket.on('message:new', (message) => {
      console.log('📩 New message:', message);
      setMessages((prev) => [...prev, message]);
    });

    // User events
    socket.on('users:update', (data) => {
      console.log('👥 Users update:', data);
      setUserCount(data.total);
    });

    // Typing indicators
    socket.on('typing:indicator', (data) => {
      console.log('⌨️ User typing:', data.username);
      setTypingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.add(data.username);
        // Auto-remove after 3 seconds
        setTimeout(() => {
          setTypingUsers((current) => {
            const updated = new Set(current);
            updated.delete(data.username);
            return updated;
          });
        }, 3000);
        return newSet;
      });
    });

    // Agent events
    socket.on('agents:list', (data) => {
      console.log('🤖 Agents list:', data.agents);
      setAgents(data.agents.map(agent => ({
        ...agent,
        isTyping: false,
        createdAt: typeof agent.createdAt === 'string' ? agent.createdAt : agent.createdAt,
        updatedAt: typeof agent.updatedAt === 'string' ? agent.updatedAt : agent.updatedAt,
      })));
    });

    socket.on('agent:typing', (data) => {
      console.log('🤖 Agent typing:', data.agentName, data.isTyping);

      if (data.isTyping) {
        setTypingAgents((prev) => {
          const newSet = new Set(prev);
          newSet.add(data.agentUsername);
          return newSet;
        });

        // Update agent isTyping state
        setAgents((prev) =>
          prev.map((agent) =>
            agent.username === data.agentUsername
              ? { ...agent, isTyping: true }
              : agent
          )
        );
      } else {
        setTypingAgents((prev) => {
          const newSet = new Set(prev);
          newSet.delete(data.agentUsername);
          return newSet;
        });

        // Update agent isTyping state
        setAgents((prev) =>
          prev.map((agent) =>
            agent.username === data.agentUsername
              ? { ...agent, isTyping: false }
              : agent
          )
        );
      }
    });

    socket.on('agent:response:start', (data) => {
      console.log('🚀 Agent response started:', data.messageId);
      // Initialize streaming message
      setStreamingMessages((prev) => {
        const newMap = new Map(prev);
        newMap.set(data.messageId, '');
        return newMap;
      });
    });

    socket.on('agent:response:chunk', (data) => {
      console.log('📝 Agent response chunk:', data.chunk);
      // Append chunk to streaming message
      setStreamingMessages((prev) => {
        const newMap = new Map(prev);
        const current = newMap.get(data.messageId) || '';
        newMap.set(data.messageId, current + data.chunk);
        return newMap;
      });

      // Update the message in the messages array if it exists
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.messageId
            ? { ...msg, content: (streamingMessages.get(data.messageId) || '') + data.chunk, isStreaming: true }
            : msg
        )
      );
    });

    socket.on('agent:response:complete', (data) => {
      console.log('✅ Agent response complete:', data.messageId);
      // Remove from streaming and update final message
      setStreamingMessages((prev) => {
        const newMap = new Map(prev);
        newMap.delete(data.messageId);
        return newMap;
      });

      // Update message as complete
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.messageId
            ? { ...msg, content: data.fullMessage, isStreaming: false }
            : msg
        )
      );
    });

    socket.on('agent:rate_limit', (data) => {
      console.log('⚠️ Agent rate limit:', data.message);
      setRateLimitInfo({
        limited: true,
        message: data.message,
        resetAt: data.resetAt,
        secondsUntilReset: data.secondsUntilReset,
      });

      // Auto-reset after the time period
      setTimeout(() => {
        setRateLimitInfo({ limited: false });
      }, data.secondsUntilReset * 1000);
    });

    // Topics update
    socket.on('topics:update', (data) => {
      console.log('📊 Topics update:', data.topics);
    });

    // Error handling
    socket.on('error', (data) => {
      console.error('❌ Socket error:', data);
    });

    // Cleanup on unmount
    return () => {
      console.log('🔌 Disconnecting chat socket...');
      socket.emit('leave:cafe', { cafeId });
      socket.disconnect();
    };
  }, [cafeId, userId, token]);

  // Send message
  const sendMessage = useCallback((content: string) => {
    if (!socketRef.current || !isConnected) {
      console.warn('Cannot send message: socket not connected');
      return;
    }

    if (rateLimitInfo.limited) {
      console.warn('Cannot send message: rate limited');
      return;
    }

    console.log('📤 Sending message:', content);
    socketRef.current.emit('message:send', { content, cafeId });
  }, [isConnected, cafeId, rateLimitInfo.limited]);

  // Mention agent
  const mentionAgent = useCallback((agentUsername: string, message: string) => {
    if (!socketRef.current || !isConnected) {
      console.warn('Cannot mention agent: socket not connected');
      return;
    }

    if (rateLimitInfo.limited) {
      console.warn('Cannot mention agent: rate limited');
      return;
    }

    console.log('🤖 Mentioning agent:', agentUsername);
    socketRef.current.emit('agent:mention', { agentUsername, message, cafeId });
  }, [isConnected, cafeId, rateLimitInfo.limited]);

  // Start typing indicator
  const startTyping = useCallback(() => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('typing:start', { cafeId });
    }
  }, [isConnected, cafeId]);

  // Stop typing indicator
  const stopTyping = useCallback(() => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('typing:stop', { cafeId });
    }
  }, [isConnected, cafeId]);

  // Update presence
  const updatePresence = useCallback((inCafe: boolean) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('presence:update', { inCafe, cafeId });
    }
  }, [isConnected, cafeId]);

  return {
    // Connection state
    isConnected,

    // Messages
    messages,
    streamingMessages,

    // Agents
    agents,
    typingAgents: Array.from(typingAgents),

    // Users
    userCount,
    typingUsers: Array.from(typingUsers),

    // Rate limiting
    rateLimitInfo,

    // Actions
    sendMessage,
    mentionAgent,
    startTyping,
    stopTyping,
    updatePresence,
  };
};
