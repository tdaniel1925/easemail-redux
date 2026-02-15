/**
 * Seed Test Data Script
 * Creates deterministic test data for E2E testing
 *
 * Usage: npm run seed:test
 */

import { createServiceClient } from '../src/lib/supabase/server';

async function main() {
  console.log('🌱 Starting test data seed...\n');

  const supabase = await createServiceClient();

  try {
    // ========================================================================
    // PART 1: Create Test Users
    // ========================================================================
    console.log('📝 Creating test users...');

    const testUsers = [
      {
        email: 'test@example.com',
        password: 'TestPassword123!',
        name: '[TEST] Regular User',
        is_super_admin: false,
      },
      {
        email: 'admin@example.com',
        password: 'AdminPassword123!',
        name: '[TEST] Admin User',
        is_super_admin: true,
      },
    ];

    for (const user of testUsers) {
      // Create auth user via Supabase Admin API
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          name: user.name,
        },
      });

      if (authError) {
        console.warn(`  ⚠️  Auth user ${user.email} might already exist:`, authError.message);
      } else {
        console.log(`  ✅ Created auth user: ${user.email}`);
      }

      // Create/update user in users table
      if (authUser?.user) {
        const { error: userError } = await supabase
          .from('users')
          .upsert({
            id: authUser.user.id,
            email: user.email,
            name: user.name,
            is_super_admin: user.is_super_admin,
          }, { onConflict: 'id' });

        if (userError) {
          console.error(`  ❌ Failed to create user record:`, userError);
        } else {
          console.log(`  ✅ Created/updated user record: ${user.email}`);
        }
      }
    }

    // Get actual user IDs from database
    const { data: users } = await supabase
      .from('users')
      .select('id, email')
      .in('email', ['test@example.com', 'admin@example.com']);

    const testUser = users?.find(u => u.email === 'test@example.com');
    const adminUser = users?.find(u => u.email === 'admin@example.com');

    if (!testUser || !adminUser) {
      throw new Error('Failed to create test users');
    }

    console.log(`  📊 Test User ID: ${testUser.id}`);
    console.log(`  📊 Admin User ID: ${adminUser.id}\n`);

    // ========================================================================
    // PART 2: Create Email Accounts
    // ========================================================================
    console.log('📧 Creating email accounts...');

    const emailAccounts = [
      // Regular user accounts
      {
        user_id: testUser.id,
        provider: 'GOOGLE' as const,
        email: 'user1-google@gmail.com',
        name: '[TEST] User 1 Google',
        is_primary: true,
      },
      {
        user_id: testUser.id,
        provider: 'MICROSOFT' as const,
        email: 'user1-microsoft@outlook.com',
        name: '[TEST] User 1 Microsoft',
        is_primary: false,
      },
      {
        user_id: testUser.id,
        provider: 'GOOGLE' as const,
        email: 'user1-work@company.com',
        name: '[TEST] User 1 Work',
        is_primary: false,
      },
      // Admin user accounts
      {
        user_id: adminUser.id,
        provider: 'GOOGLE' as const,
        email: 'admin-google@gmail.com',
        name: '[TEST] Admin Google',
        is_primary: true,
      },
      {
        user_id: adminUser.id,
        provider: 'MICROSOFT' as const,
        email: 'admin-microsoft@outlook.com',
        name: '[TEST] Admin Microsoft',
        is_primary: false,
      },
      {
        user_id: adminUser.id,
        provider: 'GOOGLE' as const,
        email: 'admin-personal@gmail.com',
        name: '[TEST] Admin Personal',
        is_primary: false,
      },
    ];

    const createdAccounts = [];
    for (const account of emailAccounts) {
      const { data, error } = await supabase
        .from('email_accounts')
        .upsert({
          ...account,
          sync_status: 'idle',
          metadata: { is_test_data: true },
        }, { onConflict: 'user_id,email' })
        .select()
        .single();

      if (error) {
        console.error(`  ❌ Failed to create account ${account.email}:`, error);
      } else {
        console.log(`  ✅ Created email account: ${account.email}`);
        createdAccounts.push(data);
      }
    }

    console.log(`  📊 Total accounts created: ${createdAccounts.length}\n`);

    // ========================================================================
    // PART 3: Create OAuth Tokens
    // ========================================================================
    console.log('🔑 Creating OAuth tokens...');

    for (const account of createdAccounts) {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      const { error } = await supabase
        .from('oauth_tokens')
        .upsert({
          user_id: account.user_id,
          email_account_id: account.id,
          provider: account.provider,
          access_token: `TEST_ACCESS_TOKEN_${account.id}`,
          refresh_token: `TEST_REFRESH_TOKEN_${account.id}`,
          token_expires_at: expiresAt.toISOString(),
          scopes: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send'],
        }, { onConflict: 'email_account_id' });

      if (error) {
        console.error(`  ❌ Failed to create token for ${account.email}:`, error);
      } else {
        console.log(`  ✅ Created OAuth token for: ${account.email}`);
      }
    }

    console.log('');

    // ========================================================================
    // PART 4: Create Messages
    // ========================================================================
    console.log('✉️  Creating messages...');

    const categories = ['priority', 'people', 'newsletters', 'notifications', 'promotions', 'uncategorized'];
    const subjects = [
      'Important: Project Update',
      'Meeting Notes from Yesterday',
      'Weekly Newsletter - Tech News',
      'Your order has been shipped',
      'Special offer just for you!',
      'Re: Question about the proposal',
      'Fwd: Team sync next week',
      'Action Required: Verify your email',
      'Reminder: Event tomorrow',
      'Update on your request',
    ];

    const fromNames = [
      'John Doe',
      'Jane Smith',
      'Tech Weekly',
      'Amazon',
      'Marketing Team',
      'Support Team',
      'Sarah Johnson',
      'Mike Williams',
      'Newsletter Bot',
      'Notifications',
    ];

    const messageCounts: Record<string, number> = {
      inbox: 20,
      sent: 10,
      archive: 10,
      trash: 10,
    };

    let totalMessages = 0;

    for (const user of [testUser, adminUser]) {
      const userAccounts = createdAccounts.filter(acc => acc.user_id === user.id);

      for (const [folderType, count] of Object.entries(messageCounts)) {
        for (let i = 0; i < count; i++) {
          const account = userAccounts[i % userAccounts.length];

          const daysAgo = Math.floor(Math.random() * 30);
          const messageDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

          const fromIndex = i % fromNames.length;
          const subjectIndex = i % subjects.length;
          const categoryIndex = i % categories.length;

          const { error } = await supabase
            .from('messages')
            .insert({
              user_id: user.id,
              email_account_id: account.id,
              provider_message_id: `test-msg-${folderType}-${user.id}-${i}`,
              provider_thread_id: i % 5 === 0 ? `test-thread-${folderType}-${Math.floor(i / 5)}` : `test-thread-${folderType}-${i}`,
              folder_type: folderType as any,
              from_email: folderType === 'sent' ? account.email : `${fromNames[fromIndex].toLowerCase().replace(' ', '.')}@example.com`,
              from_name: folderType === 'sent' ? account.name : fromNames[fromIndex],
              to_recipients: folderType === 'sent'
                ? [{ email: 'recipient@example.com', name: 'Recipient' }]
                : [{ email: account.email, name: account.name }],
              subject: `${subjects[subjectIndex]} - ${folderType}`,
              snippet: `This is a test message for ${folderType} folder. Message ${i + 1} of ${count}.`,
              body_text: `This is the full body of test message ${i + 1}.\n\nThis message is in the ${folderType} folder.`,
              body_html: `<p>This is the full body of test message ${i + 1}.</p><p>This message is in the ${folderType} folder.</p>`,
              message_date: messageDate.toISOString(),
              is_unread: i % 3 === 0,
              is_starred: i % 7 === 0,
              has_attachments: i % 5 === 0,
              categories: folderType === 'inbox' ? [categories[categoryIndex]] : [],
              importance: i % 10 === 0 ? 'high' : 'normal',
            });

          if (error) {
            console.error(`  ❌ Failed to create message:`, error.message);
          } else {
            totalMessages++;
          }
        }
      }
    }

    console.log(`  ✅ Created ${totalMessages} messages\n`);

    // ========================================================================
    // PART 5: Create Notifications
    // ========================================================================
    console.log('🔔 Creating notifications...');

    const notificationTypes = ['success', 'error', 'warning', 'info'] as const;
    const notificationMessages = [
      { title: 'Sync Complete', message: 'Your emails have been synced successfully' },
      { title: 'Sync Error', message: 'Failed to sync emails. Please check your connection.' },
      { title: 'Token Expired', message: 'Your authentication token has expired. Please reconnect.' },
      { title: 'New Messages', message: 'You have 5 new messages in your inbox' },
      { title: 'Storage Warning', message: 'You are running low on storage space' },
    ];

    let totalNotifications = 0;

    for (const user of [testUser, adminUser]) {
      const userAccounts = createdAccounts.filter(acc => acc.user_id === user.id);

      for (let i = 0; i < 5; i++) {
        const account = userAccounts[i % userAccounts.length];
        const notif = notificationMessages[i];
        const notifType = notificationTypes[i % notificationTypes.length];

        // Try to insert with email_account_id first, fallback to without if column doesn't exist
        const { error } = await supabase
          .from('notification_queue')
          .insert({
            user_id: user.id,
            type: notifType,
            title: notif.title,
            message: notif.message,
            read: i % 2 === 0,
            link: '/app/inbox',
          });

        if (error) {
          console.error(`  ❌ Failed to create notification:`, error.message);
        } else {
          totalNotifications++;
        }
      }
    }

    console.log(`  ✅ Created ${totalNotifications} notifications\n`);

    // ========================================================================
    // PART 6: Create Custom Folders
    // ========================================================================
    console.log('📁 Creating custom folders...');

    const customFolders = [
      { name: 'Important Projects', provider_folder_id: 'test-folder-projects' },
      { name: 'Clients', provider_folder_id: 'test-folder-clients' },
    ];

    let totalFolders = 0;

    for (const user of [testUser, adminUser]) {
      const userAccounts = createdAccounts.filter(acc => acc.user_id === user.id);

      for (let i = 0; i < customFolders.length; i++) {
        const account = userAccounts[i % userAccounts.length];
        const folder = customFolders[i];

        const { error } = await supabase
          .from('folder_mappings')
          .insert({
            user_id: user.id,
            email_account_id: account.id,
            provider_folder_id: `${folder.provider_folder_id}-${account.id}`,
            folder_name: folder.name,
            folder_type: 'custom',
            is_system_folder: false,
          });

        if (error && !error.message.includes('duplicate')) {
          console.error(`  ❌ Failed to create folder:`, error.message);
        } else if (!error) {
          totalFolders++;
        }
      }
    }

    console.log(`  ✅ Created ${totalFolders} custom folders\n`);

    // ========================================================================
    // Summary
    // ========================================================================
    console.log('════════════════════════════════════════════════════');
    console.log('✅ TEST DATA SEED COMPLETE!\n');
    console.log('📊 Summary:');
    console.log(`  - Users: 2 (test@example.com, admin@example.com)`);
    console.log(`  - Email Accounts: ${createdAccounts.length}`);
    console.log(`  - OAuth Tokens: ${createdAccounts.length}`);
    console.log(`  - Messages: ${totalMessages}`);
    console.log(`  - Notifications: ${totalNotifications}`);
    console.log(`  - Custom Folders: ${totalFolders}\n`);
    console.log('🔑 Test Credentials:');
    console.log('  Regular User: test@example.com / TestPassword123!');
    console.log('  Admin User: admin@example.com / AdminPassword123!\n');
    console.log('🧹 To clear test data: npm run seed:clear');
    console.log('════════════════════════════════════════════════════');

  } catch (error) {
    console.error('\n❌ Error seeding test data:', error);
    process.exit(1);
  }
}

main();
