'use client';

/**
 * Real-time connection status indicator
 * Shows green dot when SSE connection is active
 */

import { useRealtimeSync } from '@/hooks/use-realtime-sync';
import { Wifi, WifiOff } from 'lucide-react';

export interface RealtimeIndicatorProps {
  // Whether to show full status text or just icon
  showText?: boolean;
}

export function RealtimeIndicator({ showText = false }: RealtimeIndicatorProps) {
  const { connected, lastSync, error } = useRealtimeSync();

  // Don't show error state if real-time sync is unavailable (graceful degradation)
  // The app works fine with manual refresh
  const isGracefulError = error?.includes('unavailable') || error?.includes('use refresh button');

  if (error && !isGracefulError) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600">
        <WifiOff className="h-4 w-4" />
        {showText && <span>Offline</span>}
      </div>
    );
  }

  // If gracefully degraded or not connected but no hard error, just don't show anything
  if (error && isGracefulError) {
    return null; // App works fine, no need to alarm the user
  }

  if (!connected) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <div className="h-2 w-2 rounded-full bg-gray-400 animate-pulse" />
        {showText && <span>Connecting...</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-green-600">
      <div className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
      </div>
      {showText && (
        <span className="text-gray-600">
          Live
          {lastSync && (
            <span className="ml-1 text-xs text-gray-400">
              • {new Date(lastSync).toLocaleTimeString()}
            </span>
          )}
        </span>
      )}
    </div>
  );
}
