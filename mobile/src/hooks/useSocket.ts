/**
 * Custom React hook for Socket.io connection and cafe presence
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { CafeAccessService } from '../services/cafeAccessService';

const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export interface SocketState {
  connected: boolean;
  error: string | null;
  inCafe: boolean;
  usersInCafe: number;
}

export const useSocket = (userId: string, cafeId?: string) => {
  const [state, setState] = useState<SocketState>({
    connected: false,
    error: null,
    inCafe: false,
    usersInCafe: 0,
  });

  const socketRef = useRef<Socket | null>(null);

  /**
   * Connect to Socket.io server
   */
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      console.log('[useSocket] Already connected');
      return;
    }

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('[useSocket] Connected to server');
      setState((prev) => ({ ...prev, connected: true, error: null }));
    });

    socket.on('disconnect', () => {
      console.log('[useSocket] Disconnected from server');
      setState((prev) => ({ ...prev, connected: false, inCafe: false }));
    });

    socket.on('connect_error', (error) => {
      console.error('[useSocket] Connection error:', error);
      setState((prev) => ({ ...prev, error: error.message }));
    });

    socketRef.current = socket;
  }, []);

  /**
   * Disconnect from Socket.io server
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  /**
   * Join a cafe room
   */
  const joinCafe = useCallback(
    async (targetCafeId: string) => {
      if (!socketRef.current?.connected) {
        console.warn('[useSocket] Not connected to server');
        return false;
      }

      try {
        // Get validation data
        const validationData = await CafeAccessService.getValidationData();

        // Emit join event
        socketRef.current.emit('cafe:join', {
          userId,
          cafeId: targetCafeId,
          ...validationData,
        });

        // Listen for join response
        return new Promise<boolean>((resolve) => {
          socketRef.current!.once('cafe:joined', (data) => {
            console.log('[useSocket] Successfully joined cafe:', data);
            setState((prev) => ({
              ...prev,
              inCafe: true,
              usersInCafe: data.usersInCafe || 0,
            }));
            resolve(true);
          });

          socketRef.current!.once('cafe:join-failed', (data) => {
            console.warn('[useSocket] Failed to join cafe:', data);
            setState((prev) => ({
              ...prev,
              error: data.reason || 'Failed to join cafe',
            }));
            resolve(false);
          });

          socketRef.current!.once('cafe:join-error', (data) => {
            console.error('[useSocket] Error joining cafe:', data);
            setState((prev) => ({
              ...prev,
              error: data.message || 'Error joining cafe',
            }));
            resolve(false);
          });
        });
      } catch (error) {
        console.error('[useSocket] Error in joinCafe:', error);
        return false;
      }
    },
    [userId]
  );

  /**
   * Leave a cafe room
   */
  const leaveCafe = useCallback(
    (targetCafeId: string) => {
      if (!socketRef.current?.connected) {
        return;
      }

      socketRef.current.emit('cafe:leave', {
        userId,
        cafeId: targetCafeId,
      });

      setState((prev) => ({ ...prev, inCafe: false, usersInCafe: 0 }));
    },
    [userId]
  );

  /**
   * Send location update to server
   */
  const sendLocationUpdate = useCallback(
    async (targetCafeId: string) => {
      if (!socketRef.current?.connected) {
        return;
      }

      try {
        const validationData = await CafeAccessService.getValidationData();

        socketRef.current.emit('location:update', {
          userId,
          cafeId: targetCafeId,
          ...validationData,
        });
      } catch (error) {
        console.error('[useSocket] Error sending location update:', error);
      }
    },
    [userId]
  );

  /**
   * Subscribe to cafe events
   */
  const subscribeToEvents = useCallback((callbacks: {
    onUserJoined?: (data: any) => void;
    onUserLeft?: (data: any) => void;
    onPresenceChanged?: (data: any) => void;
    onLocationUpdateAck?: (data: any) => void;
  }) => {
    if (!socketRef.current) {
      return;
    }

    if (callbacks.onUserJoined) {
      socketRef.current.on('presence:user-joined', callbacks.onUserJoined);
    }

    if (callbacks.onUserLeft) {
      socketRef.current.on('presence:user-left', callbacks.onUserLeft);
    }

    if (callbacks.onPresenceChanged) {
      socketRef.current.on('presence:changed', callbacks.onPresenceChanged);
    }

    if (callbacks.onLocationUpdateAck) {
      socketRef.current.on('location:update-ack', callbacks.onLocationUpdateAck);
    }

    // Return cleanup function
    return () => {
      if (socketRef.current) {
        if (callbacks.onUserJoined) {
          socketRef.current.off('presence:user-joined', callbacks.onUserJoined);
        }
        if (callbacks.onUserLeft) {
          socketRef.current.off('presence:user-left', callbacks.onUserLeft);
        }
        if (callbacks.onPresenceChanged) {
          socketRef.current.off('presence:changed', callbacks.onPresenceChanged);
        }
        if (callbacks.onLocationUpdateAck) {
          socketRef.current.off('location:update-ack', callbacks.onLocationUpdateAck);
        }
      }
    };
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Auto-join cafe if cafeId is provided
  useEffect(() => {
    if (state.connected && cafeId && !state.inCafe) {
      joinCafe(cafeId);
    }
  }, [state.connected, cafeId, state.inCafe, joinCafe]);

  return {
    ...state,
    connect,
    disconnect,
    joinCafe,
    leaveCafe,
    sendLocationUpdate,
    subscribeToEvents,
  };
};
