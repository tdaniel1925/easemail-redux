/**
 * Check admin user flag in database
 */

import { createServiceClient } from '../src/lib/supabase/server';

async function main() {
  const supabase = await createServiceClient();

  console.log('Checking admin user...\n');

  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, is_super_admin')
    .eq('email', 'admin@example.com')
    .single();

  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ Admin user data:');
    console.log(JSON.stringify(data, null, 2));

    if (data.is_super_admin) {
      console.log('\n✅ Admin flag is correctly set to TRUE');
    } else {
      console.log('\n❌ WARNING: Admin flag is FALSE - this will cause 307 redirects!');
    }
  }

  // Also check regular user
  console.log('\n---\n');
  const { data: testUser, error: testError } = await supabase
    .from('users')
    .select('id, email, name, is_super_admin')
    .eq('email', 'test@example.com')
    .single();

  if (testError) {
    console.error('❌ Error:', testError);
  } else {
    console.log('Regular test user data:');
    console.log(JSON.stringify(testUser, null, 2));
  }
}

main();
