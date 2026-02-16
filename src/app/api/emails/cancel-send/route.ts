/**
 * Cancel Queued Send API Route
 * Cancels a queued email (undo send)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { emitEvent } from '@/lib/events';

export async function POST(request: NextRequest) {
  try {
    // Get current user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { queue_id } = body;

    if (!queue_id) {
      return NextResponse.json(
        { error: 'Missing required field: queue_id' },
        { status: 400 }
      );
    }

    // Get queued send
    const { data: queuedSend, error: fetchError } = await supabase
      .from('queued_sends')
      .select('*')
      .eq('id', queue_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !queuedSend) {
      return NextResponse.json(
        { error: 'Queued send not found' },
        { status: 404 }
      );
    }

    // Check if already sent or canceled
    if (queuedSend.sent) {
      return NextResponse.json(
        { error: 'Email has already been sent' },
        { status: 400 }
      );
    }

    if (queuedSend.canceled) {
      return NextResponse.json(
        { error: 'Email has already been canceled' },
        { status: 400 }
      );
    }

    // Check if send_at time has passed
    const sendAt = new Date(queuedSend.send_at);
    const now = new Date();
    if (now >= sendAt) {
      return NextResponse.json(
        { error: 'Undo window has expired' },
        { status: 400 }
      );
    }

    // Mark as canceled
    const { error: updateError } = await supabase
      .from('queued_sends')
      .update({
        canceled: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', queue_id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error canceling send:', updateError);
      return NextResponse.json(
        { error: 'Failed to cancel send' },
        { status: 500 }
      );
    }

    // Emit event
    await emitEvent({
      eventType: 'email.send_canceled',
      entityType: 'queued_send',
      entityId: queue_id,
      actorId: user.id,
      payload: {
        subject: queuedSend.subject,
        to_count: Array.isArray(queuedSend.to_addresses)
          ? queuedSend.to_addresses.length
          : 0,
      },
      metadata: { source: 'ui' },
    });

    return NextResponse.json({
      success: true,
      message: 'Send canceled successfully',
    });
  } catch (error: any) {
    console.error('Cancel send error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel send' },
      { status: 500 }
    );
  }
}
