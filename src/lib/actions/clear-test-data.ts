'use server';

import { createServiceClient } from '@/lib/supabase/server';

interface ClearResult {
  success: boolean;
  message: string;
  deletedCounts?: {
    messages: number;
    notifications: number;
    folderMappings: number;
    oauthTokens: number;
    emailAccounts: number;
    users: number;
  };
  error?: string;
}

/**
 * Clear all test data from the database
 * Deletes all records where metadata->>'is_test_data' = 'true'
 */
export async function clearTestData(): Promise<ClearResult> {
  try {
    const supabase = await createServiceClient();

    const deletedCounts = {
      messages: 0,
      notifications: 0,
      folderMappings: 0,
      oauthTokens: 0,
      emailAccounts: 0,
      users: 0,
    };

    // Delete in correct order to respect foreign key constraints

    // 1. Delete messages (has FK to email_accounts)
    const { data: messages } = await supabase
      .from('messages')
      .select('id')
      .eq('metadata->>is_test_data', 'true');

    if (messages && messages.length > 0) {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('metadata->>is_test_data', 'true');

      if (error) {
        console.error('Error deleting messages:', error);
      } else {
        deletedCounts.messages = messages.length;
      }
    }

    // 2. Delete notifications (has FK to email_accounts)
    const { data: notifications } = await supabase
      .from('notification_queue')
      .select('id')
      .eq('metadata->>is_test_data', 'true');

    if (notifications && notifications.length > 0) {
      const { error } = await supabase
        .from('notification_queue')
        .delete()
        .eq('metadata->>is_test_data', 'true');

      if (error) {
        console.error('Error deleting notifications:', error);
      } else {
        deletedCounts.notifications = notifications.length;
      }
    }

    // 3. Delete folder mappings (has FK to email_accounts)
    const { data: folderMappings } = await supabase
      .from('folder_mappings')
      .select('id')
      .eq('metadata->>is_test_data', 'true');

    if (folderMappings && folderMappings.length > 0) {
      const { error } = await supabase
        .from('folder_mappings')
        .delete()
        .eq('metadata->>is_test_data', 'true');

      if (error) {
        console.error('Error deleting folder mappings:', error);
      } else {
        deletedCounts.folderMappings = folderMappings.length;
      }
    }

    // 4. Delete OAuth tokens (has FK to email_accounts)
    const { data: oauthTokens } = await supabase
      .from('oauth_tokens')
      .select('id')
      .eq('metadata->>is_test_data', 'true');

    if (oauthTokens && oauthTokens.length > 0) {
      const { error } = await supabase
        .from('oauth_tokens')
        .delete()
        .eq('metadata->>is_test_data', 'true');

      if (error) {
        console.error('Error deleting oauth tokens:', error);
      } else {
        deletedCounts.oauthTokens = oauthTokens.length;
      }
    }

    // 5. Delete email accounts (has FK to users)
    const { data: emailAccounts } = await supabase
      .from('email_accounts')
      .select('id')
      .eq('metadata->>is_test_data', 'true');

    if (emailAccounts && emailAccounts.length > 0) {
      const { error } = await supabase
        .from('email_accounts')
        .delete()
        .eq('metadata->>is_test_data', 'true');

      if (error) {
        console.error('Error deleting email accounts:', error);
      } else {
        deletedCounts.emailAccounts = emailAccounts.length;
      }
    }

    // 6. Delete users (marked as test data)
    const { data: users } = await supabase
      .from('users')
      .select('id, email')
      .eq('metadata->>is_test_data', 'true');

    if (users && users.length > 0) {
      // Delete from auth.users first
      for (const user of users) {
        try {
          await supabase.auth.admin.deleteUser(user.id);
        } catch (error) {
          console.error(`Error deleting auth user ${user.email}:`, error);
        }
      }

      // Delete from users table (CASCADE should handle this, but being explicit)
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('metadata->>is_test_data', 'true');

      if (error) {
        console.error('Error deleting users:', error);
      } else {
        deletedCounts.users = users.length;
      }
    }

    const totalDeleted = Object.values(deletedCounts).reduce((sum, count) => sum + count, 0);

    if (totalDeleted === 0) {
      return {
        success: true,
        message: 'No test data found to delete',
        deletedCounts,
      };
    }

    return {
      success: true,
      message: `Successfully deleted ${totalDeleted} test records`,
      deletedCounts,
    };

  } catch (error) {
    console.error('Error clearing test data:', error);
    return {
      success: false,
      message: 'Failed to clear test data',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
