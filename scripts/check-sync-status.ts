/**
 * Check Sync Status - Diagnostic Tool
 * Checks if emails are syncing correctly
 *
 * Run with: npx tsx scripts/check-sync-status.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSyncStatus() {
  console.log('\n🔍 CHECKING SYNC STATUS...\n');

  try {
    // 1. Check email accounts
    console.log('📧 Email Accounts:');
    const { data: accounts, error: accountsError } = await supabase
      .from('email_accounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (accountsError) {
      console.error('❌ Error fetching accounts:', accountsError);
      return;
    }

    if (!accounts || accounts.length === 0) {
      console.log('⚠️  No email accounts found');
      console.log('   Solution: Connect an email account via Settings → Connected Accounts');
      return;
    }

    for (const account of accounts) {
      console.log(`\n   Email: ${account.email}`);
      console.log(`   Provider: ${account.provider}`);
      console.log(`   Sync Status: ${account.sync_status}`);
      console.log(`   Last Synced: ${account.last_synced_at || 'Never'}`);
      console.log(`   Error: ${account.error_message || 'None'}`);

      // 2. Check sync checkpoints
      const { data: checkpoints } = await supabase
        .from('sync_checkpoints')
        .select('*')
        .eq('email_account_id', account.id);

      if (checkpoints && checkpoints.length > 0) {
        console.log(`\n   Sync Checkpoints:`);
        for (const checkpoint of checkpoints) {
          console.log(`     - ${checkpoint.sync_type}: Last sync ${checkpoint.last_successful_at || 'Never'}`);
        }
      }

      // 3. Check message counts
      const { count: messageCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('email_account_id', account.id);

      console.log(`\n   Messages in Database: ${messageCount || 0}`);

      if (messageCount && messageCount > 0) {
        // Check folder distribution
        const { data: folderCounts } = await supabase
          .from('messages')
          .select('folder_type')
          .eq('email_account_id', account.id);

        if (folderCounts) {
          const distribution = folderCounts.reduce((acc: any, msg: any) => {
            acc[msg.folder_type] = (acc[msg.folder_type] || 0) + 1;
            return acc;
          }, {});

          console.log('   Folder Distribution:');
          Object.entries(distribution).forEach(([folder, count]) => {
            console.log(`     - ${folder}: ${count}`);
          });
        }
      }

      // 4. Check folder mappings
      const { data: folders } = await supabase
        .from('folder_mappings')
        .select('*')
        .eq('email_account_id', account.id)
        .eq('is_active', true);

      if (folders && folders.length > 0) {
        console.log(`\n   Folder Mappings: ${folders.length} folders`);
        for (const folder of folders) {
          console.log(`     - ${folder.folder_name} (${folder.folder_type})`);
        }
      } else {
        console.log(`   ⚠️  No folder mappings found`);
      }

      // 5. Check token status
      const { data: tokenData } = await supabase
        .from('oauth_tokens')
        .select('created_at, updated_at')
        .eq('email_account_id', account.id)
        .maybeSingle();

      if (tokenData) {
        console.log(`\n   Token Status: ✅ Stored`);
      } else {
        console.log(`\n   Token Status: ❌ Missing`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));

    const totalMessages = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true });

    console.log(`\nTotal Accounts: ${accounts.length}`);
    console.log(`Total Messages: ${totalMessages.count || 0}`);

    // Check for common issues
    console.log('\n🔍 DIAGNOSIS:');

    const syncingAccounts = accounts.filter(a => a.sync_status === 'syncing');
    const errorAccounts = accounts.filter(a => a.sync_status === 'error');
    const idleAccounts = accounts.filter(a => a.sync_status === 'idle');

    if (syncingAccounts.length > 0) {
      console.log(`✅ ${syncingAccounts.length} account(s) currently syncing`);
    }

    if (errorAccounts.length > 0) {
      console.log(`❌ ${errorAccounts.length} account(s) in error state:`);
      errorAccounts.forEach(acc => {
        console.log(`   - ${acc.email}: ${acc.error_message}`);
      });
    }

    if (idleAccounts.length > 0 && totalMessages.count === 0) {
      console.log(`⚠️  ${idleAccounts.length} account(s) idle but no messages synced`);
      console.log(`   Possible causes:`);
      console.log(`   1. Initial sync may have failed silently`);
      console.log(`   2. Token may be invalid`);
      console.log(`   3. Provider API may be down`);
      console.log(`\n   Solution: Trigger manual sync via /api/sync/manual (POST)`);
    }

    if (totalMessages.count && totalMessages.count > 0) {
      console.log(`✅ Messages are syncing successfully!`);

      // Check if messages are in inbox
      const { count: inboxCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('folder_type', 'inbox');

      if (inboxCount === 0) {
        console.log(`⚠️  No messages in inbox (all in other folders)`);
      } else {
        console.log(`✅ ${inboxCount} messages in inbox`);
      }
    }

    console.log('\n' + '='.repeat(60) + '\n');

  } catch (err: any) {
    console.error('❌ ERROR:', err.message);
  }
}

checkSyncStatus().catch(console.error);
