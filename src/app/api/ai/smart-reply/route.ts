'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateSmartReply } from '@/lib/ai/client';
import { z } from 'zod';

const SmartReplySchema = z.object({
  messageId: z.string().uuid(),
});

/**
 * POST /api/ai/smart-reply
 * Generate smart reply suggestions for an email
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
    const validation = SmartReplySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { messageId } = validation.data;

    // Get the message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('id, subject, body_text, from_email, from_name, user_id')
      .eq('id', messageId)
      .eq('user_id', user.id)
      .single();

    if (messageError || !message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Generate smart replies using AI
    const replies = await generateSmartReply(
      message.body_text || '',
      message.subject || '(no subject)',
      message.from_email
    );

    // Log AI usage event
    try {
      await supabase.from('events').insert({
        actor_id: user.id,
        event_type: 'ai.smart_reply' as any,
        entity_type: 'message',
        entity_id: messageId,
        payload: {
          message_id: messageId,
          reply_count: replies.length,
        },
      });
    } catch (eventError) {
      console.error('Failed to log smart reply event:', eventError);
    }

    return NextResponse.json({
      success: true,
      replies,
    });
  } catch (error) {
    console.error('Smart reply error:', error);
    return NextResponse.json(
      { error: 'Failed to generate smart replies' },
      { status: 500 }
    );
  }
}
