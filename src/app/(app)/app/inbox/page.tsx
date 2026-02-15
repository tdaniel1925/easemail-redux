/**
 * Inbox Page - Smart Inbox with sections
 * Stage 6: Automation layer
 */

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { InboxContent } from './inbox-content';
import { fixFolderTypes } from '@/lib/sync/fix-folder-types';

export default async function InboxPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/signin');
  }

  // Get user's email accounts and fix folder types (one-time migration)
  console.warn('📧 Inbox page: Fetching email accounts for user:', user.id);
  const { data: accounts, error: accountsError } = await supabase
    .from('email_accounts')
    .select('id')
    .eq('user_id', user.id);

  console.warn('📧 Accounts query result:', { accounts, accountsError });

  if (accounts && accounts.length > 0) {
    console.warn(`✅ Found ${accounts.length} email account(s), running fixFolderTypes`);
    for (const account of accounts) {
      const result = await fixFolderTypes(account.id);
      console.warn('🔧 fixFolderTypes result:', result);
    }
  } else {
    console.warn('❌ No email accounts found');
  }

  return <InboxContent userId={user.id} />;
}
