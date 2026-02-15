'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { dictateToEmail } from '@/lib/ai/client';

async function checkRateLimit(userId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_key: `ai_dictate:${userId}`,
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
 * POST /api/ai/dictate
 * Transcribe audio and convert to polished email
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

    // Parse multipart form data
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }

    // Validate file type
    const validTypes = ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg'];
    if (!validTypes.includes(audioFile.type)) {
      return NextResponse.json(
        { error: 'Invalid audio format. Supported: webm, wav, mp3, ogg' },
        { status: 400 }
      );
    }

    // Validate file size (max 25MB)
    const maxSize = 25 * 1024 * 1024;
    if (audioFile.size > maxSize) {
      return NextResponse.json(
        { error: 'Audio file too large. Maximum size: 25MB' },
        { status: 400 }
      );
    }

    // Call AI
    const result = await dictateToEmail(audioFile);

    // Track usage
    await trackUsage(user.id, 'ai_dictate');

    return NextResponse.json(result);
  } catch (error) {
    console.error('AI Dictate error:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio. Please try again.' },
      { status: 500 }
    );
  }
}
