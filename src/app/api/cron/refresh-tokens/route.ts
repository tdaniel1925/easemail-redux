/**
 * Token Refresh Cron Job
 * Runs every 3 minutes to proactively refresh tokens that are about to expire
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getValidToken } from '@/lib/providers/token-manager';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createServiceClient();

    // Get all tokens that expire in the next 10 minutes
    const tenMinutesFromNow = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { data: tokens, error } = await supabase
      .from('oauth_tokens')
      .select('email_account_id, token_expires_at')
      .lt('token_expires_at', tenMinutesFromNow);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch tokens' },
        { status: 500 }
      );
    }

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No tokens need refreshing',
        refreshed: 0,
        timestamp: new Date().toISOString(),
      });
    }

    let refreshed = 0;
    let failed = 0;

    // Refresh each token
    for (const token of tokens) {
      try {
        const result = await getValidToken(token.email_account_id);

        if (result.token) {
          refreshed++;
        } else {
          failed++;
        }
      } catch (err) {
        console.error('Token refresh failed:', err);
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      totalTokens: tokens.length,
      refreshed,
      failed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Token refresh cron error:', error);
    return NextResponse.json(
      { error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
