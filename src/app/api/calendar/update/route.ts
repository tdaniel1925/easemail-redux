/**
 * POST /api/calendar/update
 * Phase 6, Task 116: Update calendar event
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProvider } from '@/lib/providers';
import { getValidToken } from '@/lib/providers/token-manager';
import type { UpdateEventParams } from '@/lib/providers/types';
import { z } from 'zod';

const UpdateEventSchema = z.object({
  accountId: z.string().uuid(),
  calendarId: z.string().min(1),
  eventId: z.string().min(1),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  start_time: z.string().datetime().optional(),
  end_time: z.string().datetime().optional(),
  all_day: z.boolean().optional(),
  timezone: z.string().optional(),
  attendees: z.array(z.object({
    email: z.string().email(),
    name: z.string().optional().nullable(),
  })).optional(),
  status: z.enum(['confirmed', 'tentative', 'cancelled']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = UpdateEventSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { accountId, calendarId, eventId, ...eventUpdates } = validationResult.data;

    // Get email account
    const { data: account, error: accountError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Email account not found' },
        { status: 404 }
      );
    }

    // Get valid access token
    const tokenResult = await getValidToken(account.id);

    if (tokenResult.error || !tokenResult.token) {
      return NextResponse.json(
        { error: tokenResult.error || 'Failed to get valid access token' },
        { status: 401 }
      );
    }

    // Get provider
    const provider = getProvider(account.provider);

    // Update event params
    const updateParams: UpdateEventParams = {
      title: eventUpdates.title,
      description: eventUpdates.description,
      location: eventUpdates.location,
      start_time: eventUpdates.start_time,
      end_time: eventUpdates.end_time,
      all_day: eventUpdates.all_day,
      timezone: eventUpdates.timezone,
      attendees: eventUpdates.attendees,
      status: eventUpdates.status,
    };

    // Update event via provider
    const event = await provider.updateEvent(
      tokenResult.token,
      calendarId,
      eventId,
      updateParams
    );

    // Log event for audit trail
    await supabase.from('events').insert({
      actor_id: user.id,
      event_type: 'calendar_event.updated' as any,
      entity_type: 'calendar_event',
      entity_id: event.id,
      metadata: {
        calendar_id: calendarId,
        title: event.title,
        updates: eventUpdates,
      },
    });

    return NextResponse.json({ event }, { status: 200 });
  } catch (error) {
    console.error('Error updating calendar event:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update calendar event' },
      { status: 500 }
    );
  }
}
