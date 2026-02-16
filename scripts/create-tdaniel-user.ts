#!/usr/bin/env tsx
/**
 * Create tdaniel@botmakers.ai super admin user
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/types/database';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createUser() {
  console.log('🔐 Creating tdaniel@botmakers.ai super admin...\n');

  try {
    // Create auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: 'tdaniel@botmakers.ai',
      password: '4Xkilla1@',
      email_confirm: true,
      user_metadata: {
        name: 'Thomas Daniel',
      },
    });

    if (authError) {
      if (authError.message.includes('already been registered')) {
        console.log('⚠️  User already exists in auth, updating database record...');

        // Get existing user
        const { data: existingAuth } = await supabase.auth.admin.listUsers();
        const existingUser = existingAuth?.users.find(u => u.email === 'tdaniel@botmakers.ai');

        if (existingUser) {
          // Update database record
          const { error: updateError } = await supabase
            .from('users')
            .update({
              name: 'Thomas Daniel',
              role: 'SUPER_ADMIN',
              is_super_admin: true,
              onboarding_completed: true,
            })
            .eq('id', existingUser.id);

          if (updateError) throw updateError;

          console.log('✅ Updated existing user to super admin');
          console.log('   Email: tdaniel@botmakers.ai');
          console.log('   Password: 4Xkilla1@\n');
          return;
        }
      }
      throw authError;
    }

    if (!authUser.user) throw new Error('Failed to create auth user');

    // Create database record
    const { error: userError } = await supabase.from('users').insert({
      id: authUser.user.id,
      email: 'tdaniel@botmakers.ai',
      name: 'Thomas Daniel',
      nickname: 'Thomas',
      role: 'SUPER_ADMIN',
      is_super_admin: true,
      onboarding_completed: true,
      timezone: 'America/New_York',
      locale: 'en',
      created_by: authUser.user.id,
    });

    if (userError) throw userError;

    console.log('✅ Super admin created successfully!');
    console.log('   Email: tdaniel@botmakers.ai');
    console.log('   Password: 4Xkilla1@\n');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createUser();
