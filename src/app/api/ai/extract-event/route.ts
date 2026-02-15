'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractEvent } from '@/lib/ai/client';

async function checkRateLimit(userId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_key: `ai_extract_event:${userId}`,
    p_max: 10,
    p_window_seconds: 60,
  });

  if (error) {
    console.error('Rate limit check failed:', error);
    return false;
  }

  return data === true;
}

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
 * POST /api/ai/extract-event
 * Extract calendar event details from email
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
    const { email_body, email_subject, from_email } = body;

    if (!email_body || typeof email_body !== 'string') {
      return NextResponse.json({ error: 'Email body is required' }, { status: 400 });
    }

    // Strip HTML
    const plainBody = email_body.replace(/<[^>]*>/g, '').trim();

    if (plainBody.length === 0) {
      return NextResponse.json({ error: 'Email body cannot be empty' }, { status: 400 });
    }

    // Call AI
    const eventDetails = await extractEvent(
      plainBody,
      email_subject || '(no subject)',
      from_email || 'unknown'
    );

    // Track usage
    await trackUsage(user.id, 'ai_event_extract');

    return NextResponse.json(eventDetails);
  } catch (error) {
    console.error('AI Extract Event error:', error);
    return NextResponse.json(
      { error: 'Failed to extract event details. Please try again.' },
      { status: 500 }
    );
  }
}
