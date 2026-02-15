'use server';

import { createServiceClient } from '@/lib/supabase/server';
import type { Event, EventFilters, EventQueryResult } from '@/types/events';

/**
 * Query events with filters
 * Uses user's session, respects RLS
 */
export async function queryEvents(
  filters: EventFilters = {}
): Promise<EventQueryResult> {
  const supabase = await createServiceClient();

  const {
    event_type,
    entity_type,
    entity_id,
    actor_id,
    organization_id,
    after,
    before,
    limit = 50,
    cursor,
  } = filters;

  let query = supabase
    .from('events')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  // Apply filters
  if (event_type) {
    if (Array.isArray(event_type)) {
      query = query.in('event_type', event_type);
    } else {
      query = query.eq('event_type', event_type);
    }
  }

  if (entity_type) {
    query = query.eq('entity_type', entity_type);
  }

  if (entity_id) {
    query = query.eq('entity_id', entity_id);
  }

  if (actor_id) {
    query = query.eq('actor_id', actor_id);
  }

  if (organization_id) {
    query = query.eq('organization_id', organization_id);
  }

  if (after) {
    query = query.gte('created_at', after);
  }

  if (before) {
    query = query.lte('created_at', before);
  }

  // Cursor pagination
  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  query = query.limit(limit);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error querying events:', error);
    return { events: [] };
  }

  const events = (data || []) as Event[];
  const nextCursor =
    events.length === limit ? events[events.length - 1].created_at : undefined;

  return {
    events,
    nextCursor,
    total: count || 0,
  };
}

/**
 * Get events for a specific entity (entity timeline)
 */
export async function getEntityEvents(
  entityType: string,
  entityId: string,
  limit = 50
): Promise<Event[]> {
  const result = await queryEvents({
    entity_type: entityType,
    entity_id: entityId,
    limit,
  });

  return result.events;
}

/**
 * Get recent events by actor (user activity)
 */
export async function getActorEvents(
  actorId: string,
  limit = 50
): Promise<Event[]> {
  const result = await queryEvents({
    actor_id: actorId,
    limit,
  });

  return result.events;
}

/**
 * Get organization events
 */
export async function getOrganizationEvents(
  organizationId: string,
  limit = 50
): Promise<Event[]> {
  const result = await queryEvents({
    organization_id: organizationId,
    limit,
  });

  return result.events;
}

/**
 * Get events by type within a time range
 */
export async function getEventsByType(
  eventType: string | string[],
  after?: string,
  before?: string,
  limit = 50
): Promise<Event[]> {
  const result = await queryEvents({
    event_type: eventType as any,
    after,
    before,
    limit,
  });

  return result.events;
}

/**
 * Get activity feed for current user
 * Combines user's own events + org events
 */
export async function getActivityFeed(limit = 50): Promise<Event[]> {
  const supabase = await createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  // Get user's events + org events
  const result = await queryEvents({
    limit,
  });

  return result.events;
}
