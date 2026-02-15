/**
 * Check real account status
 */

import { createServiceClient } from '../src/lib/supabase/server';

async function main() {
  const supabase = await createServiceClient();

  console.log('Checking real account shall@botmakers.ai...\n');

  // Find the real account
  const { data: account, error: accountError } = await supabase
    .from('email_accounts')
    .select('*')
    .eq('email', 'shall@botmakers.ai')
    .single();

  if (accountError || !account) {
    console.log('❌ Account shall@botmakers.ai not found');
    console.log('Error:', accountError);
    return;
  }

  console.log('✅ Account details:');
  console.log(JSON.stringify({
    email: account.email,
    provider: account.provider,
    sync_status: account.sync_status,
    last_sync_at: account.last_sync_at,
    error_message: account.error_message,
    archived_at: account.archived_at
  }, null, 2));

  // Check OAuth token
  const { data: token, error: tokenError } = await supabase
    .from('oauth_tokens')
    .select('*')
    .eq('email_account_id', account.id)
    .single();

  if (tokenError || !token) {
    console.log('\n❌ No OAuth token found!');
    console.log('Error:', tokenError);
    return;
  }

  const expiresAt = new Date(token.token_expires_at);
  const now = new Date();
  const isExpired = expiresAt < now;

  console.log('\n🔑 OAuth Token:');
  console.log(JSON.stringify({
    provider: token.provider,
    token_expires_at: token.token_expires_at,
    is_expired: isExpired,
    minutes_until_expiry: isExpired ? 'EXPIRED' : Math.floor((expiresAt.getTime() - now.getTime()) / 60000)
  }, null, 2));

  if (isExpired) {
    console.log('\n⚠️  Token is EXPIRED - this will cause sync failures!');
    console.log('   User needs to reconnect their account.');
  }
}

main();
