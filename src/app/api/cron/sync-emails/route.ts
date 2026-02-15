/**
 * Email Sync Cron Job
 * Runs every 5 minutes to sync all connected email accounts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { performDeltaSync, performInitialSync } from '@/lib/sync/email-sync';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createServiceClient();

    // Get all email accounts that need syncing
    const { data: accounts, error } = await supabase
      .from('email_accounts')
      .select('id, sync_status, last_synced_at')
      .neq('sync_status', 'error')
      .neq('sync_status', 'paused');

    if (error || !accounts) {
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
    }

    let totalSynced = 0;
    let totalFailed = 0;
    const results: any[] = [];

    for (const account of accounts) {
      try {
        let result;

        if (account.sync_status === 'syncing') {
          // Perform initial sync for newly connected accounts
          result = await performInitialSync(account.id);
        } else {
          // Perform delta sync for existing accounts
          result = await performDeltaSync(account.id);
        }

        if (result.success) {
          totalSynced++;
          results.push({
            accountId: account.id,
            status: 'success',
            changes: (result as any).changesCount || 0,
          });
        } else {
          totalFailed++;
          results.push({
            accountId: account.id,
            status: 'failed',
            error: result.error,
          });
        }
      } catch (err: any) {
        totalFailed++;
        results.push({
          accountId: account.id,
          status: 'failed',
          error: err.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalAccounts: accounts.length,
      synced: totalSynced,
      failed: totalFailed,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Sync cron error:', error);
    return NextResponse.json(
      { error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
