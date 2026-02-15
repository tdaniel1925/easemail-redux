/**
 * Fix account with expired OAuth token
 */

import { createServiceClient } from '../src/lib/supabase/server';

async function main() {
  const supabase = await createServiceClient();

  console.log('Fixing expired account shall@botmakers.ai...\n');

  // Reset sync status and set error message
  const { data, error } = await supabase
    .from('email_accounts')
    .update({
      sync_status: 'error',
      error_message: 'OAuth token expired. Please reconnect your account.',
      last_synced_at: new Date().toISOString()
    })
    .eq('email', 'shall@botmakers.ai')
    .select()
    .single();

  if (error) {
    console.error('❌ Failed to update account:', error);
    return;
  }

  console.log('✅ Account updated:');
  console.log(JSON.stringify({
    email: data.email,
    sync_status: data.sync_status,
    error_message: data.error_message,
    last_synced_at: data.last_synced_at
  }, null, 2));

  console.log('\n📝 Next steps:');
  console.log('   1. Go to Settings > Accounts');
  console.log('   2. Click "Reconnect" on shall@botmakers.ai');
  console.log('   3. Complete the Microsoft OAuth flow');
  console.log('   4. The account will automatically sync once reconnected');
}

main();
