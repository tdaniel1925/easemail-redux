/**
 * Manual Sync Trigger (Development Only)
 * Allows manually triggering sync for testing
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { performInitialSync } from '@/lib/sync/email-sync';

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

    // Get all email accounts for this user
    const { data: accounts } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('user_id', user.id);

    if (!accounts || accounts.length === 0) {
      return NextResponse.json(
        { error: 'No email accounts found' },
        { status: 404 }
      );
    }

    console.warn('🔄 Manual sync triggered for', accounts.length, 'accounts');

    const results = [];

    // Trigger sync for each account
    for (const account of accounts) {
      console.warn('📧 Syncing account:', account.email);
      const result = await performInitialSync(account.id);
      results.push({
        email: account.email,
        success: result.success,
        error: result.error,
      });
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('Manual sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
