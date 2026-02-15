'use server';

import { createClient } from '@supabase/supabase-js';
import type { EventType, EventMetadata } from '@/types/events';

// Service role client for event emission (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export interface EmitEventParams {
  eventType: EventType;
  entityType: string;
  entityId?: string | null;
  actorId?: string | null;
  organizationId?: string | null;
  payload?: Record<string, unknown>;
  metadata?: EventMetadata;
}

/**
 * Emit an event to the events table
 *
 * CRITICAL: This function uses service role client to bypass RLS.
 * Events are append-only. Never update or delete.
 *
 * @param params Event parameters
 * @returns Event ID or null on error
 */
export async function emitEvent(params: EmitEventParams): Promise<string | null> {
  const {
    eventType,
    entityType,
    entityId = null,
    actorId = null,
    organizationId = null,
    payload = {},
    metadata = {},
  } = params;

  try {
    const { data, error } = await supabaseAdmin
      .from('events')
      .insert({
        event_type: eventType,
        entity_type: entityType,
        entity_id: entityId,
        actor_id: actorId,
        organization_id: organizationId,
        payload,
        metadata: {
          ...metadata,
          emitted_at: new Date().toISOString(),
        },
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to emit event:', error);
      return null;
    }

    return data.id;
  } catch (err) {
    console.error('Exception emitting event:', err);
    return null;
  }
}

/**
 * Batch emit multiple events
 * Useful for bulk operations
 */
export async function emitEvents(events: EmitEventParams[]): Promise<string[]> {
  const eventIds: string[] = [];

  for (const event of events) {
    const id = await emitEvent(event);
    if (id) {
      eventIds.push(id);
    }
  }

  return eventIds;
}
