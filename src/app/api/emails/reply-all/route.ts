/**
 * Reply All to Email API Route
 * Handles replying to all recipients via provider APIs
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProvider } from '@/lib/providers';
import { getValidToken } from '@/lib/providers/token-manager';
import { emitEvent } from '@/lib/events';
import { quoteEmailBodyHtml } from '@/lib/utils/email-quote';
import { buildReplyHeaders, buildReplySubject } from '@/lib/utils/email-headers';

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
    const { messageId, body_html } = body;

    if (!messageId || !body_html) {
      return NextResponse.json(
        { error: 'Missing required fields: messageId, body_html' },
        { status: 400 }
      );
    }

    // Get original message from database
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('*, email_account:email_accounts(*)')
      .eq('id', messageId)
      .eq('user_id', user.id)
      .single();

    if (messageError || !message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const emailAccount = (message as any).email_account;
    if (!emailAccount) {
      return NextResponse.json({ error: 'Email account not found' }, { status: 404 });
    }

    // Get valid token
    const tokenResult = await getValidToken(emailAccount.id);
    if (!tokenResult.token) {
      return NextResponse.json(
        { error: tokenResult.error || 'Invalid token' },
        { status: 401 }
      );
    }

    // Prepare reply body with quoted original
    const quotedBody = quoteEmailBodyHtml(
      (message as any).body_html || (message as any).body_text || '',
      (message as any).from_name || (message as any).from_email,
      (message as any).message_date
    );

    const fullReplyBody = `${body_html}${quotedBody}`;

    // Get provider and send reply to all
    const provider = getProvider(emailAccount.provider as any);
    const result = await provider.replyToMessage(
      tokenResult.token,
      (message as any).provider_message_id,
      {
        body_html: fullReplyBody,
        to_all: true, // Always reply to all recipients
      }
    );

    // Log usage
    await supabase.from('usage_tracking').insert({
      user_id: user.id,
      feature: 'email_reply_all',
      count: 1,
      timestamp: new Date().toISOString(),
    });

    // Emit event
    await emitEvent({
      eventType: 'message.sent',
      entityType: 'message',
      entityId: result.id,
      actorId: user.id,
      payload: {
        original_message_id: messageId,
        reply_all: true,
      },
      metadata: { source: 'ui' },
    });

    return NextResponse.json({ success: true, id: result.id });
  } catch (error: any) {
    console.error('Reply all email error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reply to all recipients' },
      { status: 500 }
    );
  }
}
