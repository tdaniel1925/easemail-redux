/**
 * Fix test user database values
 * Sets correct names and admin flag
 */

import { createServiceClient } from '../src/lib/supabase/server';

async function main() {
  const supabase = await createServiceClient();

  console.log('🔧 Fixing test user database values...\n');

  // Fix admin user
  const { data: adminUser, error: adminError } = await supabase
    .from('users')
    .update({
      name: '[TEST] Admin User',
      is_super_admin: true,
    })
    .eq('email', 'admin@example.com')
    .select()
    .single();

  if (adminError) {
    console.error('❌ Failed to update admin user:', adminError);
  } else {
    console.log('✅ Updated admin user:');
    console.log(JSON.stringify(adminUser, null, 2));
  }

  // Fix regular user
  const { data: testUser, error: testError } = await supabase
    .from('users')
    .update({
      name: '[TEST] Regular User',
      is_super_admin: false,
    })
    .eq('email', 'test@example.com')
    .select()
    .single();

  if (testError) {
    console.error('\n❌ Failed to update test user:', testError);
  } else {
    console.log('\n✅ Updated test user:');
    console.log(JSON.stringify(testUser, null, 2));
  }

  console.log('\n✅ Test user database values fixed!');
}

main();
