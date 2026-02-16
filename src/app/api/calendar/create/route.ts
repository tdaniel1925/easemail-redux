/**
 * POST /api/calendar/create
 * Phase 6, Task 115: Create calendar event
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProvider } from '@/lib/providers';
import { getValidToken } from '@/lib/providers/token-manager';
import type { CreateEventParams } from '@/lib/providers/types';
import { z } from 'zod';

const CreateEventSchema = z.object({
  accountId: z.string().uuid(),
  calendarId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  all_day: z.boolean().optional().default(false),
  timezone: z.string().optional().default('UTC'),
  attendees: z.array(z.object({
    email: z.string().email(),
    name: z.string().optional().nullable(),
  })).optional(),
  is_online_meeting: z.boolean().optional().default(false),
  reminders: z.array(z.object({
    minutes_before: z.number(),
    method: z.string(),
  })).optional(),
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
    const validationResult = CreateEventSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { accountId, calendarId, ...eventData } = validationResult.data;

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

    // Create event params
    const createParams: CreateEventParams = {
      title: eventData.title,
      description: eventData.description || null,
      location: eventData.location || null,
      start_time: eventData.start_time,
      end_time: eventData.end_time,
      all_day: eventData.all_day,
      timezone: eventData.timezone,
      attendees: eventData.attendees,
      is_online_meeting: eventData.is_online_meeting,
      reminders: eventData.reminders,
    };

    // Create event via provider
    const event = await provider.createEvent(
      tokenResult.token,
      calendarId,
      createParams
    );

    // Log event for audit trail
    await supabase.from('events').insert({
      actor_id: user.id,
      event_type: 'calendar_event.created' as any,
      entity_type: 'calendar_event',
      entity_id: event.id,
      metadata: {
        calendar_id: calendarId,
        title: event.title,
        start_time: event.start_time,
        end_time: event.end_time,
      },
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create calendar event' },
      { status: 500 }
    );
  }
}
