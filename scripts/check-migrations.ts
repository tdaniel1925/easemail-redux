/**
 * Check if migrations 009-012 have been applied
 * Verifies tables and columns exist in the database
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMigrations() {
  console.log('\n🔍 Checking Migration Status...\n');

  let allApplied = true;

  // Check Migration 009: persistent_sessions
  console.log('📋 Migration 009: Persistent Sessions');
  try {
    const { data, error } = await supabase
      .from('users')
      .select('remember_me, session_expires_at')
      .limit(1);

    if (error && error.message.includes('column')) {
      console.log('   ❌ NOT APPLIED - Columns missing (remember_me, session_expires_at)');
      allApplied = false;
    } else {
      console.log('   ✅ APPLIED - Columns exist');
    }
  } catch (err: any) {
    console.log('   ❌ ERROR:', err.message);
    allApplied = false;
  }

  // Check Migration 010: realtime_sync
  console.log('\n📋 Migration 010: Realtime Sync');
  try {
    const { data, error } = await supabase
      .from('email_accounts')
      .select('webhook_subscription_id, webhook_expiry')
      .limit(1);

    if (error && error.message.includes('column')) {
      console.log('   ❌ NOT APPLIED - Columns missing (webhook_subscription_id, webhook_expiry)');
      allApplied = false;
    } else {
      console.log('   ✅ APPLIED - Columns exist');
    }
  } catch (err: any) {
    console.log('   ❌ ERROR:', err.message);
    allApplied = false;
  }

  // Check Migration 011: undo_send
  console.log('\n📋 Migration 011: Undo Send');
  try {
    const { data, error } = await supabase
      .from('queued_sends')
      .select('id')
      .limit(1);

    if (error && error.message.includes('does not exist')) {
      console.log('   ❌ NOT APPLIED - Table queued_sends does not exist');
      allApplied = false;
    } else {
      console.log('   ✅ APPLIED - Table queued_sends exists');
    }
  } catch (err: any) {
    console.log('   ❌ ERROR:', err.message);
    allApplied = false;
  }

  // Check Migration 012: vacation_responder
  console.log('\n📋 Migration 012: Vacation Responder');
  try {
    const { data, error } = await supabase
      .from('vacation_responders')
      .select('id')
      .limit(1);

    if (error && error.message.includes('does not exist')) {
      console.log('   ❌ NOT APPLIED - Table vacation_responders does not exist');
      allApplied = false;
    } else {
      console.log('   ✅ APPLIED - Table vacation_responders exists');
    }
  } catch (err: any) {
    console.log('   ❌ ERROR:', err.message);
    allApplied = false;
  }

  console.log('\n' + '='.repeat(60));
  if (allApplied) {
    console.log('✅ ALL MIGRATIONS APPLIED - Ready for deployment!');
  } else {
    console.log('❌ SOME MIGRATIONS MISSING - Apply migrations before deployment');
    console.log('\nTo apply migrations:');
    console.log('  npx supabase db push');
    console.log('\nOr apply manually via Supabase dashboard SQL editor');
  }
  console.log('='.repeat(60) + '\n');
}

checkMigrations().catch(console.error);
