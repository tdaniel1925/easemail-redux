'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateSmartCompose } from '@/lib/ai/client';
import { z } from 'zod';

const SmartComposeSchema = z.object({
  currentText: z.string(),
  subject: z.string().optional(),
  replyingToMessageId: z.string().uuid().optional(),
});

/**
 * POST /api/ai/smart-compose
 * Generate smart compose suggestions as user types
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
    const validation = SmartComposeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { currentText, subject, replyingToMessageId } = validation.data;

    // If replying to a message, get the original message body for context
    let replyingTo: string | undefined;
    if (replyingToMessageId) {
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .select('body_text')
        .eq('id', replyingToMessageId)
        .eq('user_id', user.id)
        .single();

      if (!messageError && message) {
        replyingTo = message.body_text || undefined;
      }
    }

    // Generate smart compose suggestion using AI
    const result = await generateSmartCompose(currentText, {
      subject,
      replyingTo,
    });

    // Log AI usage event (only if suggestion was generated)
    if (result.suggestion && result.confidence >= 0.5) {
      try {
        await supabase.from('events').insert({
          actor_id: user.id,
          event_type: 'ai.smart_compose' as any,
          entity_type: 'message',
          payload: {
            text_length: currentText.length,
            suggestion_length: result.suggestion.length,
            confidence: result.confidence,
          },
        });
      } catch (eventError) {
        console.error('Failed to log smart compose event:', eventError);
      }
    }

    return NextResponse.json({
      success: true,
      suggestion: result.suggestion,
      confidence: result.confidence,
    });
  } catch (error) {
    console.error('Smart compose error:', error);
    return NextResponse.json(
      { error: 'Failed to generate smart compose suggestion' },
      { status: 500 }
    );
  }
}
