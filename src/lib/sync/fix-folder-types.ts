/**
 * One-time migration script to fix folder_type on existing messages
 * All messages were incorrectly set to 'inbox' due to bug in Microsoft provider
 */

'use server';

import { createServiceClient } from '@/lib/supabase/server';

export async function fixFolderTypes(emailAccountId: string): Promise<{
  success: boolean;
  updated: number;
  error?: string;
}> {
  const supabase = await createServiceClient();

  try {
    console.warn('🔧 Fixing folder_type for account:', emailAccountId);

    // Get all folder mappings for this account
    const { data: folderMappings, error: folderError } = await supabase
      .from('folder_mappings')
      .select('provider_folder_id, folder_type')
      .eq('email_account_id', emailAccountId)
      .eq('is_active', true);

    if (folderError || !folderMappings) {
      console.error('❌ Failed to fetch folder mappings:', folderError);
      return { success: false, updated: 0, error: folderError?.message };
    }

    console.warn(`📁 Found ${folderMappings.length} folders`);

    let totalUpdated = 0;

    // Update messages for each folder
    for (const folder of folderMappings) {
      // First, count how many messages need updating
      const { count: matchCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('email_account_id', emailAccountId)
        .eq('folder_id', folder.provider_folder_id);

      console.warn(
        `📝 Folder ${folder.folder_type}: Found ${matchCount || 0} messages to update`
      );

      if (matchCount && matchCount > 0) {
        const { error: updateError } = await supabase
          .from('messages')
          .update({ folder_type: folder.folder_type })
          .eq('email_account_id', emailAccountId)
          .eq('folder_id', folder.provider_folder_id);

        if (updateError) {
          console.error(
            `❌ Failed to update messages for folder ${folder.provider_folder_id}:`,
            updateError
          );
        } else {
          console.warn(
            `✅ Updated ${matchCount} messages to folder_type: ${folder.folder_type}`
          );
          totalUpdated += matchCount;
        }
      }
    }

    console.warn(`✅ Fixed folder_type for ${totalUpdated} messages`);

    return { success: true, updated: totalUpdated };
  } catch (error: any) {
    console.error('💥 fixFolderTypes error:', error);
    return {
      success: false,
      updated: 0,
      error: error.message || 'Unknown error',
    };
  }
}
