#!/usr/bin/env tsx
/**
 * EaseMail v2 — Database Seed Script
 * Stage 1: Schema & Types
 *
 * Generates sample data for all entities.
 * Run with: npx tsx scripts/seed.ts
 *
 * Prerequisites:
 * - .env.local file with SUPABASE_SERVICE_ROLE_KEY
 * - Supabase project with migration 001_initial_schema.sql applied
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/types/database';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing environment variables:');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? 'Set' : 'Missing');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing');
  process.exit(1);
}

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function seed() {
  console.log('🌱 Starting seed...\n');

  try {
    // ============================================================================
    // SUPER ADMIN USER
    // ============================================================================
    console.log('Creating super admin user...');
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: 'admin@easemail.ai',
      password: 'admin123456',
      email_confirm: true,
      user_metadata: {
        name: 'Super Admin',
      },
    });

    if (authError) throw authError;
    if (!authUser.user) throw new Error('Failed to create auth user');

    const { error: userError } = await supabase.from('users').insert({
      id: authUser.user.id,
      email: 'admin@easemail.ai',
      name: 'Super Admin',
      nickname: 'Admin',
      role: 'SUPER_ADMIN',
      is_super_admin: true,
      onboarding_completed: true,
      timezone: 'America/New_York',
      locale: 'en',
      created_by: authUser.user.id,
    });

    if (userError) throw userError;
    console.log('✅ Super admin created: admin@easemail.ai\n');

    // ============================================================================
    // ORGANIZATIONS
    // ============================================================================
    console.log('Creating organizations...');
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .insert([
        {
          name: 'Acme Corp',
          slug: 'acme-corp',
          domain: 'acme.com',
          billing_email: 'billing@acme.com',
          plan: 'BUSINESS',
          seats: 10,
          seats_used: 3,
          subscription_status: 'active',
          created_by: authUser.user.id,
        },
        {
          name: 'TechStart Inc',
          slug: 'techstart',
          billing_email: 'admin@techstart.io',
          plan: 'PRO',
          seats: 5,
          seats_used: 2,
          subscription_status: 'trialing',
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          created_by: authUser.user.id,
        },
      ])
      .select();

    if (orgError) throw orgError;
    console.log(`✅ Created ${orgs.length} organizations\n`);

    // ============================================================================
    // USERS (non-admin)
    // ============================================================================
    console.log('Creating regular users...');
    const users = [];

    for (let i = 1; i <= 3; i++) {
      const { data: newAuthUser, error: newAuthError } = await supabase.auth.admin.createUser({
        email: `user${i}@example.com`,
        password: 'password123',
        email_confirm: true,
        user_metadata: {
          name: `User ${i}`,
        },
      });

      if (newAuthError) throw newAuthError;
      if (!newAuthUser.user) continue;

      const { data: newUser, error: newUserError } = await supabase
        .from('users')
        .insert({
          id: newAuthUser.user.id,
          email: `user${i}@example.com`,
          name: `User ${i}`,
          role: i === 1 ? 'ORG_OWNER' : i === 2 ? 'ORG_MEMBER' : 'INDIVIDUAL',
          onboarding_completed: true,
          created_by: authUser.user.id,
        })
        .select()
        .single();

      if (newUserError) throw newUserError;
      users.push(newUser);
    }

    console.log(`✅ Created ${users.length} users\n`);

    // ============================================================================
    // USER PREFERENCES
    // ============================================================================
    console.log('Creating user preferences...');
    const { error: prefsError } = await supabase.from('user_preferences').insert(
      users.map((user) => ({
        user_id: user.id,
        theme: 'system',
        inbox_layout: 'split',
        created_by: authUser.user.id,
      }))
    );

    if (prefsError) throw prefsError;
    console.log(`✅ Created ${users.length} user preferences\n`);

    // ============================================================================
    // ORGANIZATION MEMBERS
    // ============================================================================
    console.log('Creating organization members...');
    const { error: membersError } = await supabase.from('organization_members').insert([
      {
        organization_id: orgs[0].id,
        user_id: users[0].id,
        role: 'owner',
        is_admin: true,
        created_by: authUser.user.id,
      },
      {
        organization_id: orgs[0].id,
        user_id: users[1].id,
        role: 'member',
        is_admin: false,
        created_by: authUser.user.id,
      },
      {
        organization_id: orgs[1].id,
        user_id: users[2].id,
        role: 'owner',
        is_admin: true,
        created_by: authUser.user.id,
      },
    ]);

    if (membersError) throw membersError;
    console.log('✅ Created 3 organization members\n');

    // ============================================================================
    // ORGANIZATION INVITES
    // ============================================================================
    console.log('Creating organization invites...');
    const { error: invitesError } = await supabase.from('organization_invites').insert([
      {
        organization_id: orgs[0].id,
        email: 'newmember@acme.com',
        role: 'member',
        invited_by: users[0].id,
        token: 'invite-token-1',
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: authUser.user.id,
      },
      {
        organization_id: orgs[1].id,
        email: 'dev@techstart.io',
        role: 'member',
        invited_by: users[2].id,
        token: 'invite-token-2',
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: authUser.user.id,
      },
    ]);

    if (invitesError) throw invitesError;
    console.log('✅ Created 2 organization invites\n');

    // ============================================================================
    // EMAIL ACCOUNTS
    // ============================================================================
    console.log('Creating email accounts...');
    const { data: emailAccounts, error: accountsError } = await supabase
      .from('email_accounts')
      .insert([
        {
          user_id: users[0].id,
          provider: 'MICROSOFT',
          email: 'user1@outlook.com',
          name: 'User 1 Outlook',
          is_primary: true,
          sync_status: 'idle',
          created_by: authUser.user.id,
        },
        {
          user_id: users[1].id,
          provider: 'GOOGLE',
          email: 'user2@gmail.com',
          name: 'User 2 Gmail',
          is_primary: true,
          sync_status: 'idle',
          created_by: authUser.user.id,
        },
        {
          user_id: users[2].id,
          provider: 'MICROSOFT',
          email: 'user3@techstart.io',
          name: 'User 3 Work',
          is_primary: true,
          sync_status: 'idle',
          created_by: authUser.user.id,
        },
      ])
      .select();

    if (accountsError) throw accountsError;
    console.log(`✅ Created ${emailAccounts.length} email accounts\n`);

    // ============================================================================
    // MESSAGES
    // ============================================================================
    console.log('Creating messages...');
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .insert([
        {
          user_id: users[0].id,
          email_account_id: emailAccounts[0].id,
          provider_message_id: 'msg-1',
          provider_thread_id: 'thread-1',
          subject: 'Welcome to EaseMail',
          from_email: 'welcome@easemail.ai',
          from_name: 'EaseMail Team',
          to_recipients: [{ email: 'user1@outlook.com', name: 'User 1' }],
          body_html: '<p>Welcome to EaseMail!</p>',
          body_text: 'Welcome to EaseMail!',
          snippet: 'Welcome to EaseMail!',
          folder_type: 'inbox',
          is_unread: true,
          message_date: new Date().toISOString(),
          created_by: authUser.user.id,
        },
        {
          user_id: users[0].id,
          email_account_id: emailAccounts[0].id,
          provider_message_id: 'msg-2',
          provider_thread_id: 'thread-2',
          subject: 'Meeting Tomorrow',
          from_email: 'boss@acme.com',
          from_name: 'Boss',
          to_recipients: [{ email: 'user1@outlook.com', name: 'User 1' }],
          body_html: '<p>Dont forget our meeting tomorrow at 10am</p>',
          body_text: 'Dont forget our meeting tomorrow at 10am',
          snippet: 'Dont forget our meeting tomorrow at 10am',
          folder_type: 'inbox',
          is_unread: false,
          is_starred: true,
          importance: 'high',
          message_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          created_by: authUser.user.id,
        },
      ])
      .select();

    if (messagesError) throw messagesError;
    console.log(`✅ Created ${messages.length} messages\n`);

    // ============================================================================
    // FOLDER MAPPINGS
    // ============================================================================
    console.log('Creating folder mappings...');
    const { error: foldersError } = await supabase.from('folder_mappings').insert([
      {
        user_id: users[0].id,
        email_account_id: emailAccounts[0].id,
        provider_folder_id: 'inbox-1',
        folder_name: 'Inbox',
        folder_type: 'inbox',
        is_system_folder: true,
        unread_count: 1,
        total_count: 2,
        created_by: authUser.user.id,
      },
      {
        user_id: users[0].id,
        email_account_id: emailAccounts[0].id,
        provider_folder_id: 'sent-1',
        folder_name: 'Sent',
        folder_type: 'sent',
        is_system_folder: true,
        unread_count: 0,
        total_count: 5,
        created_by: authUser.user.id,
      },
    ]);

    if (foldersError) throw foldersError;
    console.log('✅ Created 2 folder mappings\n');

    // ============================================================================
    // DRAFTS
    // ============================================================================
    console.log('Creating drafts...');
    const { error: draftsError } = await supabase.from('drafts').insert([
      {
        user_id: users[0].id,
        email_account_id: emailAccounts[0].id,
        to_recipients: [{ email: 'friend@example.com', name: 'Friend' }],
        subject: 'Quick Question',
        body_html: '<p>Hey, do you have a moment?</p>',
        body_text: 'Hey, do you have a moment?',
        auto_saved: true,
        created_by: authUser.user.id,
      },
    ]);

    if (draftsError) throw draftsError;
    console.log('✅ Created 1 draft\n');

    // ============================================================================
    // SIGNATURES
    // ============================================================================
    console.log('Creating signatures...');
    const { error: signaturesError } = await supabase.from('signatures').insert([
      {
        user_id: users[0].id,
        name: 'Default Signature',
        content_html: '<p>Best regards,<br>User 1</p>',
        content_text: 'Best regards,\nUser 1',
        is_default: true,
        email_account_id: emailAccounts[0].id,
        created_by: authUser.user.id,
      },
    ]);

    if (signaturesError) throw signaturesError;
    console.log('✅ Created 1 signature\n');

    // ============================================================================
    // EMAIL TEMPLATES
    // ============================================================================
    console.log('Creating email templates...');
    const { error: templatesError } = await supabase.from('email_templates').insert([
      {
        user_id: users[0].id,
        name: 'Follow-up Template',
        subject: 'Following up on {{topic}}',
        body_html: '<p>Hi {{name}},</p><p>Just following up on {{topic}}.</p>',
        body_text: 'Hi {{name}},\n\nJust following up on {{topic}}.',
        category: 'follow-up',
        variables: ['name', 'topic'],
        created_by: authUser.user.id,
      },
    ]);

    if (templatesError) throw templatesError;
    console.log('✅ Created 1 email template\n');

    // ============================================================================
    // CONTACTS
    // ============================================================================
    console.log('Creating contacts...');
    const { error: contactsError } = await supabase.from('contacts').insert([
      {
        user_id: users[0].id,
        email: 'boss@acme.com',
        name: 'Boss',
        company: 'Acme Corp',
        job_title: 'CEO',
        is_priority_sender: true,
        email_count: 15,
        last_emailed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        source: 'auto',
        created_by: authUser.user.id,
      },
      {
        user_id: users[0].id,
        email: 'friend@example.com',
        name: 'Friend',
        is_favorite: true,
        email_count: 42,
        last_emailed_at: new Date().toISOString(),
        source: 'manual',
        created_by: authUser.user.id,
      },
    ]);

    if (contactsError) throw contactsError;
    console.log('✅ Created 2 contacts\n');

    // ============================================================================
    // CUSTOM LABELS
    // ============================================================================
    console.log('Creating custom labels...');
    const { data: labels, error: labelsError } = await supabase
      .from('custom_labels')
      .insert([
        {
          user_id: users[0].id,
          name: 'Important',
          color: '#FF5722',
          sort_order: 0,
          created_by: authUser.user.id,
        },
        {
          user_id: users[0].id,
          name: 'Follow Up',
          color: '#2196F3',
          sort_order: 1,
          created_by: authUser.user.id,
        },
      ])
      .select();

    if (labelsError) throw labelsError;
    console.log(`✅ Created ${labels.length} custom labels\n`);

    // ============================================================================
    // MESSAGE LABELS
    // ============================================================================
    console.log('Creating message labels...');
    const { error: msgLabelsError } = await supabase.from('message_labels').insert([
      {
        message_id: messages[1].id,
        label_id: labels[0].id,
        created_by: authUser.user.id,
      },
    ]);

    if (msgLabelsError) throw msgLabelsError;
    console.log('✅ Created 1 message label\n');

    // ============================================================================
    // EMAIL RULES
    // ============================================================================
    console.log('Creating email rules...');
    const { error: rulesError } = await supabase.from('email_rules').insert([
      {
        user_id: users[0].id,
        name: 'Move newsletters to Archive',
        is_active: true,
        priority: 0,
        conditions: [{ field: 'from', operator: 'contains', value: 'newsletter' }],
        actions: [{ type: 'move', params: { folder: 'archive' } }],
        match_mode: 'all',
        created_by: authUser.user.id,
      },
    ]);

    if (rulesError) throw rulesError;
    console.log('✅ Created 1 email rule\n');

    // ============================================================================
    // SUBSCRIPTIONS
    // ============================================================================
    console.log('Creating subscriptions...');
    const { error: subscriptionsError } = await supabase.from('subscriptions').insert([
      {
        organization_id: orgs[0].id,
        stripe_subscription_id: 'sub_acme123',
        stripe_customer_id: 'cus_acme123',
        plan: 'BUSINESS',
        status: 'active',
        seats: 10,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: authUser.user.id,
      },
      {
        user_id: users[2].id,
        stripe_subscription_id: 'sub_user3',
        stripe_customer_id: 'cus_user3',
        plan: 'PRO',
        status: 'trialing',
        seats: 1,
        trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: authUser.user.id,
      },
    ]);

    if (subscriptionsError) throw subscriptionsError;
    console.log('✅ Created 2 subscriptions\n');

    // ============================================================================
    // PRIORITY SENDERS
    // ============================================================================
    console.log('Creating priority senders...');
    const { error: priorityError } = await supabase.from('priority_senders').insert([
      {
        user_id: users[0].id,
        email: 'boss@acme.com',
        name: 'Boss',
        is_blocked: false,
        created_by: authUser.user.id,
      },
    ]);

    if (priorityError) throw priorityError;
    console.log('✅ Created 1 priority sender\n');

    // ============================================================================
    // SYNC CHECKPOINTS
    // ============================================================================
    console.log('Creating sync checkpoints...');
    const { error: checkpointsError } = await supabase.from('sync_checkpoints').insert([
      {
        email_account_id: emailAccounts[0].id,
        sync_type: 'messages',
        cursor: 'delta_token_123',
        last_successful_at: new Date().toISOString(),
        error_count: 0,
        created_by: authUser.user.id,
      },
    ]);

    if (checkpointsError) throw checkpointsError;
    console.log('✅ Created 1 sync checkpoint\n');

    // ============================================================================
    // SYSTEM SETTINGS
    // ============================================================================
    console.log('Creating system settings...');
    const { error: settingsError } = await supabase.from('system_settings').insert([
      {
        key: 'maintenance_mode',
        value: { enabled: false },
        description: 'System-wide maintenance mode',
        updated_by: authUser.user.id,
        created_by: authUser.user.id,
      },
      {
        key: 'feature_flags',
        value: { ai_features: true, calendar_sync: true, sms_enabled: false },
        description: 'Feature flags for staged rollout',
        updated_by: authUser.user.id,
        created_by: authUser.user.id,
      },
    ]);

    if (settingsError) throw settingsError;
    console.log('✅ Created 2 system settings\n');

    console.log('✨ Seed complete!\n');
    console.log('Credentials:');
    console.log('- Super Admin: admin@easemail.ai / admin123456');
    console.log('- User 1 (Org Owner): user1@example.com / password123');
    console.log('- User 2 (Org Member): user2@example.com / password123');
    console.log('- User 3 (Individual): user3@example.com / password123');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seed();
