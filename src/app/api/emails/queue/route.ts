/**
 * Queue Email for Sending API Route
 * Queues an email for delayed sending (undo send feature)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
    const {
      account_id,
      to_addresses,
      cc_addresses,
      bcc_addresses,
      subject,
      body_text,
      body_html,
      attachments,
      signature_id,
      in_reply_to,
      references,
      delay_seconds = 5, // Default 5 second delay
    } = body;

    // Validate required fields
    if (!account_id || !to_addresses || !subject || !body_text) {
      return NextResponse.json(
        { error: 'Missing required fields: account_id, to_addresses, subject, body_text' },
        { status: 400 }
      );
    }

    // Verify account belongs to user
    const { data: emailAccount, error: accountError } = await supabase
      .from('email_accounts')
      .select('id')
      .eq('id', account_id)
      .eq('user_id', user.id)
      .single();

    if (accountError || !emailAccount) {
      return NextResponse.json({ error: 'Email account not found' }, { status: 404 });
    }

    // Calculate send_at time
    const sendAt = new Date();
    sendAt.setSeconds(sendAt.getSeconds() + delay_seconds);

    // Insert queued send
    const { data: queuedSend, error: insertError } = await supabase
      .from('queued_sends')
      .insert({
        user_id: user.id,
        account_id,
        to_addresses,
        cc_addresses: cc_addresses || null,
        bcc_addresses: bcc_addresses || null,
        subject,
        body: body_text,
        body_html: body_html || null,
        attachments: attachments || null,
        signature_id: signature_id || null,
        in_reply_to: in_reply_to || null,
        references: references || null,
        send_at: sendAt.toISOString(),
        canceled: false,
        sent: false,
      })
      .select()
      .single();

    if (insertError || !queuedSend) {
      console.error('Error inserting queued send:', insertError);
      return NextResponse.json(
        { error: 'Failed to queue email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      id: queuedSend.id,
      send_at: queuedSend.send_at,
    });
  } catch (error: any) {
    console.error('Queue email error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to queue email' },
      { status: 500 }
    );
  }
}
