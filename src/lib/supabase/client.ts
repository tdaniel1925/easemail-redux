import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

export function createClient(): SupabaseClient<Database, "public"> {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      realtime: {
        // Disable Supabase Realtime WebSocket connections
        // We use SSE (/api/realtime/stream) instead
        params: {
          eventsPerSecond: 0,
        },
      },
      global: {
        headers: {},
      },
    }
  ) as unknown as SupabaseClient<Database, "public">;
}
