# PATTERN: Real-Time Features (Supabase Realtime)

## When to Use
Any feature requiring live updates without page refresh: chat, notifications, dashboards, collaborative editing, presence indicators.

## Architecture

### Channel Types
- **Postgres Changes:** Subscribe to INSERT/UPDATE/DELETE on tables. Best for: live feeds, dashboard updates.
- **Broadcast:** Send messages to all connected clients. Best for: typing indicators, cursor positions, notifications.
- **Presence:** Track who's online and their state. Best for: "3 users viewing this page", online/offline status.

### Client Setup
```typescript
// lib/realtime.ts
import { createBrowserClient } from '@supabase/ssr';

export function subscribeToTable(table: string, filter: string, callback: (payload: any) => void) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  return supabase
    .channel(`${table}-changes`)
    .on('postgres_changes', { event: '*', schema: 'public', table, filter }, callback)
    .subscribe();
}

export function subscribeToBroadcast(channel: string, event: string, callback: (payload: any) => void) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  return supabase.channel(channel)
    .on('broadcast', { event }, callback)
    .subscribe();
}
```

### React Hook Pattern
```typescript
// hooks/use-realtime.ts
'use client';
import { useEffect, useState } from 'react';

export function useRealtimeTable<T>(table: string, filter?: string) {
  const [data, setData] = useState<T[]>([]);

  useEffect(() => {
    const channel = subscribeToTable(table, filter || '', (payload) => {
      if (payload.eventType === 'INSERT') setData(prev => [...prev, payload.new]);
      if (payload.eventType === 'UPDATE') setData(prev => prev.map(item => 
        (item as any).id === payload.new.id ? payload.new : item));
      if (payload.eventType === 'DELETE') setData(prev => prev.filter(item => 
        (item as any).id !== payload.old.id));
    });

    return () => { channel.unsubscribe(); };
  }, [table, filter]);

  return data;
}
```

### Presence Pattern
```typescript
export function usePresence(roomId: string, userId: string, userName: string) {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const channel = supabase.channel(`room:${roomId}`)
      .on('presence', { event: 'sync' }, () => {
        setUsers(Object.values(channel.presenceState()).flat());
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: userId, user_name: userName, online_at: new Date().toISOString() });
        }
      });

    return () => { channel.unsubscribe(); };
  }, [roomId]);

  return users;
}
```

## Rules
- Always unsubscribe on component unmount
- Use RLS — Realtime respects row-level security
- Don't subscribe to entire tables in production — always use filters
- Debounce broadcast messages (typing indicators: max 1 per 500ms)
- Handle reconnection — Supabase auto-reconnects but state may be stale
- Enable Realtime on tables: ALTER TABLE [table] REPLICA IDENTITY FULL;
