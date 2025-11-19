import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const WS_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface ActivityEvent {
  type: string;
  user?: string;
  content?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface DashboardStats {
  activeUsers: number;
  totalMessages: number;
  agentQueries: number;
  flaggedMessages: number;
}

export const useWebSocket = () => {
  const { token, cafe } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    activeUsers: 0,
    totalMessages: 0,
    agentQueries: 0,
    flaggedMessages: 0,
  });

  useEffect(() => {
    if (!token || !cafe) return;

    // Create socket connection
    const socket = io(WS_URL, {
      auth: { token },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      socket.emit('join:cafe', cafe.id);
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    socket.on('activity:new', (event: ActivityEvent) => {
      setActivities((prev) => [event, ...prev].slice(0, 100));
    });

    socket.on('stats:update', (newStats: DashboardStats) => {
      setStats(newStats);
    });

    socket.on('flag:message', (data: { messageId: string; reason: string }) => {
      console.log('Message flagged:', data);
      setStats((prev) => ({ ...prev, flaggedMessages: prev.flaggedMessages + 1 }));
    });

    return () => {
      socket.disconnect();
    };
  }, [token, cafe]);

  const moderateMessage = (messageId: string, action: string) => {
    if (socketRef.current) {
      socketRef.current.emit('moderate:message', { messageId, action });
    }
  };

  const moderateUser = (userId: string, action: string, duration?: number) => {
    if (socketRef.current) {
      socketRef.current.emit('moderate:user', { userId, action, duration });
    }
  };

  return {
    isConnected,
    activities,
    stats,
    moderateMessage,
    moderateUser,
  };
};
