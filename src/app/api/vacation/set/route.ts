'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const VacationSchema = z.object({
  accountId: z.string().uuid(),
  enabled: z.boolean(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  message: z.string().min(1, 'Vacation message is required'),
});

/**
 * POST /api/vacation/set
 * Set or update vacation responder settings
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const validation = VacationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { accountId, enabled, startDate, endDate, message } = validation.data;

    // Verify the account belongs to the user
    const { data: account, error: accountError } = await supabase
      .from('email_accounts')
      .select('id')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Account not found or unauthorized' },
        { status: 404 }
      );
    }

    // Check if vacation responder already exists
    const { data: existing } = await supabase
      .from('vacation_responder' as any)
      .select('id')
      .eq('account_id', accountId)
      .maybeSingle();

    let result;

    if (existing) {
      // Update existing vacation responder
      const { data, error } = await supabase
        .from('vacation_responder' as any)
        .update({
          enabled,
          start_date: startDate,
          end_date: endDate,
          message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', (existing as any).id)
        .select()
        .single();

      if (error) {
        console.error('Failed to update vacation responder:', error);
        return NextResponse.json(
          { error: 'Failed to update vacation responder' },
          { status: 500 }
        );
      }

      result = data;

      // If disabled, clear the vacation replies history
      if (!enabled) {
        await supabase
          .from('vacation_replies' as any)
          .delete()
          .eq('vacation_responder_id', (existing as any).id);
      }
    } else {
      // Create new vacation responder
      const { data, error } = await supabase
        .from('vacation_responder' as any)
        .insert({
          user_id: user.id,
          account_id: accountId,
          enabled,
          start_date: startDate,
          end_date: endDate,
          message,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create vacation responder:', error);
        return NextResponse.json(
          { error: 'Failed to create vacation responder' },
          { status: 500 }
        );
      }

      result = data;
    }

    // Log event
    try {
      await supabase.from('events').insert({
        actor_id: user.id,
        event_type: 'email.vacation_auto_reply' as any,
        entity_type: 'message',
        payload: {
          account_id: accountId,
          enabled,
          start_date: startDate,
          end_date: endDate,
          action: existing ? 'updated' : 'created',
        },
      });
    } catch (eventError) {
      console.error('Failed to log vacation event:', eventError);
    }

    return NextResponse.json({
      success: true,
      vacationResponder: result,
    });
  } catch (error) {
    console.error('Vacation set error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/vacation/set
 * Get vacation responder settings for an account
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get accountId from query params
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId is required' },
        { status: 400 }
      );
    }

    // Get vacation responder
    const { data, error } = await supabase
      .from('vacation_responder' as any)
      .select('*')
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Failed to get vacation responder:', error);
      return NextResponse.json(
        { error: 'Failed to get vacation responder' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      vacationResponder: data,
    });
  } catch (error) {
    console.error('Vacation get error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
