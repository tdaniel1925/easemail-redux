'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { categorizeMessages, MessageForCategorization } from '@/lib/ai/client';
import type { UsageTrackingInsert } from '@/types/usage-tracking';

/**
 * POST /api/ai/categorize
 * Categorize messages in batch
 * NOTE: This is typically called server-side during email sync, not from client
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request
    const body = await request.json();
    const { messages } = body as { messages: MessageForCategorization[] };

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    if (messages.length > 20) {
      return NextResponse.json(
        { error: 'Maximum 20 messages per batch' },
        { status: 400 }
      );
    }

    // Call AI
    const categorized = await categorizeMessages(messages);

    // Track usage
    const usageRecord: UsageTrackingInsert = {
      user_id: user.id,
      feature: 'ai_categorize',
      count: messages.length,
      timestamp: new Date().toISOString(),
      metadata: { batch_size: messages.length },
    };
    await supabase.from('usage_tracking').insert(usageRecord);

    return NextResponse.json({ results: categorized });
  } catch (error) {
    console.error('AI Categorize error:', error);
    return NextResponse.json(
      { error: 'Failed to categorize messages. Please try again.' },
      { status: 500 }
    );
  }
}
