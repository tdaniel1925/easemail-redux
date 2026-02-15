'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { performDeltaSync } from '@/lib/sync/email-sync';

export async function triggerManualSync(userId: string): Promise<{
  success: boolean;
  changesCount?: number;
  error?: string;
}> {
  const supabase = await createServiceClient();

  try {
    // Get user's primary email account
    const { data: emailAccount } = await supabase
      .from('email_accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('is_primary', true)
      .maybeSingle();

    if (!emailAccount) {
      // Try to get any active account
      const { data: anyAccount } = await supabase
        .from('email_accounts')
        .select('id')
        .eq('user_id', userId)
        .neq('sync_status', 'error')
        .limit(1)
        .maybeSingle();

      if (!anyAccount) {
        return {
          success: false,
          error: 'No email account found',
        };
      }

      return await performDeltaSync(anyAccount.id);
    }

    return await performDeltaSync(emailAccount.id);
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}
