/**
 * Check if Supabase Storage bucket "attachments" exists
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStorage() {
  console.log('\n🔍 Checking Storage Bucket Status...\n');

  try {
    // List all buckets
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      console.log('❌ ERROR listing buckets:', error.message);
      return;
    }

    console.log('📦 Found buckets:', buckets?.map(b => b.name).join(', ') || 'none');

    // Check if attachments bucket exists
    const attachmentsBucket = buckets?.find(b => b.name === 'attachments');

    console.log('\n' + '='.repeat(60));
    if (attachmentsBucket) {
      console.log('✅ ATTACHMENTS BUCKET EXISTS');
      console.log(`   ID: ${attachmentsBucket.id}`);
      console.log(`   Public: ${attachmentsBucket.public ? 'Yes' : 'No (Private)'}`);
      console.log(`   Created: ${new Date(attachmentsBucket.created_at).toLocaleString()}`);
      console.log('\n✅ Storage is ready for file uploads!');
    } else {
      console.log('❌ ATTACHMENTS BUCKET MISSING');
      console.log('\nYou need to create the "attachments" bucket:');
      console.log('  1. Go to Supabase Dashboard → Storage');
      console.log('  2. Click "New bucket"');
      console.log('  3. Name: attachments');
      console.log('  4. Public: No (keep private)');
      console.log('  5. Apply RLS policies (see SUPABASE-STORAGE-SETUP.md)');
    }
    console.log('='.repeat(60) + '\n');

  } catch (err: any) {
    console.log('❌ ERROR:', err.message);
  }
}

checkStorage().catch(console.error);
