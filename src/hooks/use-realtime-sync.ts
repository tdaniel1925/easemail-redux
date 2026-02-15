'use client';

/**
 * Hook for managing Server-Sent Events (SSE) real-time email sync
 * Connects to /api/realtime/stream and listens for email updates
 */

import { useEffect, useState, useCallback, useRef } from 'react';

export interface RealtimeSyncState {
  // Whether the SSE connection is active
  connected: boolean;
  // Timestamp of last received event
  lastSync: Date | null;
  // Number of events received in this session
  eventCount: number;
  // Connection error if any
  error: string | null;
}

export interface RealtimeEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  message: any;
  old?: any;
  timestamp: string;
}

/**
 * Hook to manage real-time email sync via Server-Sent Events
 *
 * @param onMessage - Callback when a message event is received
 * @param autoConnect - Whether to connect automatically on mount (default: true)
 * @returns State object and control functions
 *
 * @example
 * ```tsx
 * const { connected, lastSync, connect, disconnect } = useRealtimeSync(
 *   (event) => {
 *     console.log('New message:', event.message);
 *     // Refresh inbox data
 *     mutate('/api/emails');
 *   }
 * );
 * ```
 */
export function useRealtimeSync(
  onMessage?: (event: RealtimeEvent) => void,
  autoConnect: boolean = true
) {
  const [state, setState] = useState<RealtimeSyncState>({
    connected: false,
    lastSync: null,
    eventCount: 0,
    error: null,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000; // 3 seconds

  /**
   * Connect to SSE stream
   */
  const connect = useCallback(() => {
    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const eventSource = new EventSource('/api/realtime/stream');

      // Connection established
      eventSource.addEventListener('connected', (event) => {
        const data = JSON.parse(event.data);
        console.log('[SSE] Connected:', data);
        setState((prev) => ({
          ...prev,
          connected: true,
          error: null,
          lastSync: new Date(data.timestamp),
        }));
        reconnectAttempts.current = 0;
      });

      // Message event (new email or update)
      eventSource.addEventListener('message', (event) => {
        const realtimeEvent = JSON.parse(event.data) as RealtimeEvent;
        console.log('[SSE] Message event:', realtimeEvent);

        setState((prev) => ({
          ...prev,
          lastSync: new Date(realtimeEvent.timestamp),
          eventCount: prev.eventCount + 1,
        }));

        // Call user callback
        if (onMessage) {
          onMessage(realtimeEvent);
        }
      });

      // Heartbeat (keep-alive)
      eventSource.addEventListener('heartbeat', (event) => {
        const data = JSON.parse(event.data);
        setState((prev) => ({
          ...prev,
          lastSync: new Date(data.timestamp),
        }));
      });

      // Error handling
      eventSource.onerror = (error) => {
        console.error('[SSE] Connection error:', error);
        setState((prev) => ({
          ...prev,
          connected: false,
          error: 'Connection lost',
        }));

        // Attempt reconnection with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const delay = reconnectDelay * reconnectAttempts.current;
          console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          console.error('[SSE] Max reconnect attempts reached');
          setState((prev) => ({
            ...prev,
            error: 'Failed to reconnect after multiple attempts',
          }));
        }

        eventSource.close();
      };

      eventSourceRef.current = eventSource;
    } catch (error) {
      console.error('[SSE] Failed to create EventSource:', error);
      setState((prev) => ({
        ...prev,
        connected: false,
        error: error instanceof Error ? error.message : 'Failed to connect',
      }));
    }
  }, [onMessage]);

  /**
   * Disconnect from SSE stream
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      connected: false,
    }));
  }, []);

  /**
   * Reset reconnect attempts (useful after user action)
   */
  const resetReconnect = useCallback(() => {
    reconnectAttempts.current = 0;
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    resetReconnect,
  };
}
