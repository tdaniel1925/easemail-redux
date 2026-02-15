'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { remixEmail } from '@/lib/ai/client';

/**
 * Rate limiting helper (uses Postgres rate_limits table)
 */
async function checkRateLimit(userId: string): Promise<boolean> {
  const supabase = await createClient();

  // Check rate limit: 10 requests per 60 seconds
  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_key: `ai_remix:${userId}`,
    p_max: 10,
    p_window_seconds: 60,
  });

  if (error) {
    console.error('Rate limit check failed:', error);
    return false;
  }

  return data === true;
}

/**
 * Track AI feature usage
 */
async function trackUsage(userId: string, feature: string) {
  const supabase = await createClient();

  await supabase.from('usage_tracking').insert({
    user_id: userId,
    feature,
    count: 1,
    timestamp: new Date().toISOString(),
  });
}

/**
 * POST /api/ai/remix
 * Rewrite email content with specified tone
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit check
    const allowed = await checkRateLimit(user.id);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse request
    const body = await request.json();
    const { content, tone } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    if (!tone || !['professional', 'friendly', 'brief', 'detailed'].includes(tone)) {
      return NextResponse.json(
        { error: 'Valid tone is required (professional, friendly, brief, detailed)' },
        { status: 400 }
      );
    }

    // Strip HTML to plain text for AI processing
    const plainText = content.replace(/<[^>]*>/g, '').trim();

    if (plainText.length === 0) {
      return NextResponse.json({ error: 'Content cannot be empty' }, { status: 400 });
    }

    // Call AI
    const result = await remixEmail({ content: plainText, tone });

    // Track usage
    await trackUsage(user.id, 'ai_remix');

    return NextResponse.json(result);
  } catch (error) {
    console.error('AI Remix error:', error);
    return NextResponse.json(
      { error: 'Failed to remix email. Please try again.' },
      { status: 500 }
    );
  }
}
