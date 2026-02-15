/**
 * Email Sync Orchestrator
 * Handles initial and delta synchronization of emails from providers
 */

'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { getProvider } from '@/lib/providers';
import { getValidToken } from '@/lib/providers/token-manager';
import type { NormalizedMessage } from '@/lib/providers/types';
import { sanitizeHtml } from '@/lib/providers/normalize';
import { handleMessageReceived } from '@/lib/automation/event-handlers';

/**
 * Perform initial sync for a newly connected email account
 * Syncs folders, messages (last 30 days), and contacts
 */
export async function performInitialSync(
  emailAccountId: string
): Promise<{ success: boolean; error?: string }> {
  console.warn('📧 performInitialSync called for:', emailAccountId);
  const supabase = await createServiceClient();

  try {
    // Get email account details
    console.warn('📊 Fetching email account details...');
    const { data: account, error: accountError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('id', emailAccountId)
      .single();

    if (accountError || !account) {
      console.error('❌ Account not found:', accountError);
      return { success: false, error: 'Account not found' };
    }

    console.warn('✅ Found account:', account.email, 'Status:', account.sync_status);

    // RACE CONDITION PROTECTION: Check if already syncing
    if (account.sync_status === 'syncing') {
      console.warn('⚠️ Sync already in progress');
      return { success: false, error: 'Sync already in progress' };
    }

    // Set status to syncing to prevent concurrent syncs
    console.warn('🔄 Setting sync_status to syncing...');
    await supabase
      .from('email_accounts')
      .update({
        sync_status: 'syncing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', emailAccountId);

    // Get valid token
    console.warn('🔑 Getting valid token...');
    const tokenResult = await getValidToken(emailAccountId);
    if (!tokenResult.token) {
      console.error('❌ Failed to get token:', tokenResult.error);
      return { success: false, error: tokenResult.error || 'Invalid token' };
    }
    console.warn('✅ Token retrieved successfully');

    const provider = getProvider(account.provider as any);

    // Step 1: Sync folders
    console.warn('Syncing folders for account:', emailAccountId);
    const folders = await provider.listFolders(tokenResult.token);

    for (const folder of folders) {
      await supabase.from('folder_mappings').upsert({
        user_id: account.user_id,
        email_account_id: emailAccountId,
        provider_folder_id: folder.id,
        folder_name: folder.name,
        folder_type: folder.folder_type,
        is_system_folder: folder.is_system_folder,
        unread_count: folder.unread_count,
        total_count: folder.total_count,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // Update folder sync checkpoint
    await supabase.from('sync_checkpoints').upsert({
      email_account_id: emailAccountId,
      sync_type: 'folders',
      cursor: null,
      last_successful_at: new Date().toISOString(),
      error_count: 0,
      updated_at: new Date().toISOString(),
    });

    // Step 2: Sync messages from ALL folders
    console.warn('Syncing messages from all folders for account:', emailAccountId);

    // Get all folders from folder_mappings
    const { data: folderMappings } = await supabase
      .from('folder_mappings')
      .select('*')
      .eq('email_account_id', emailAccountId)
      .eq('is_active', true);

    let totalSynced = 0;

    // Sync messages from each folder
    for (const folder of folderMappings || []) {
      console.warn(`Syncing messages from folder: ${folder.folder_name} (${folder.provider_folder_id})`);

      // Get checkpoint for this folder to resume if interrupted
      const { data: folderCheckpoint } = await supabase
        .from('sync_checkpoints')
        .select('*')
        .eq('email_account_id', emailAccountId)
        .eq('sync_type', `folder:${folder.provider_folder_id}`)
        .maybeSingle();

      let folderCursor: string | undefined = folderCheckpoint?.cursor || undefined;
      let folderMessageCount = 0;
      const maxMessagesPerFolder = 500;

      // Paginate through messages in this folder
      while (folderMessageCount < maxMessagesPerFolder) {
        const { messages, cursor } = await provider.listMessages(tokenResult.token, {
          folder_id: folder.provider_folder_id,
          limit: Math.min(50, maxMessagesPerFolder - folderMessageCount),
          cursor: folderCursor,
        });

        if (messages.length === 0) break;

        // Sync messages from this page
        for (const message of messages) {
          // Override folder_type from folder_mappings to ensure correctness
          // The provider may not always correctly determine folder_type from folder ID
          message.folder_type = folder.folder_type;
          message.folder_id = folder.provider_folder_id;

          await syncMessage(supabase, account, message);
          folderMessageCount++;
          totalSynced++;
        }

        // Save checkpoint after each page for resumability
        await supabase.from('sync_checkpoints').upsert({
          email_account_id: emailAccountId,
          sync_type: `folder:${folder.provider_folder_id}`,
          cursor: cursor || null,
          last_successful_at: new Date().toISOString(),
          error_count: 0,
          updated_at: new Date().toISOString(),
        });

        // If no cursor or reached limit, stop pagination for this folder
        if (!cursor || folderMessageCount >= maxMessagesPerFolder) {
          break;
        }

        folderCursor = cursor;
      }

      console.warn(`Synced ${folderMessageCount} messages from folder: ${folder.folder_name}`);
    }

    console.warn(`Synced ${totalSynced} total messages for account:`, emailAccountId);

    // Update message sync checkpoint (using delta cursor for future syncs)
    await supabase.from('sync_checkpoints').upsert({
      email_account_id: emailAccountId,
      sync_type: 'messages',
      cursor: null, // Will be set by first delta sync
      last_successful_at: new Date().toISOString(),
      error_count: 0,
      updated_at: new Date().toISOString(),
    });

    // Step 3: Sync contacts (top 100)
    console.warn('Syncing contacts for account:', emailAccountId);
    try {
      const contacts = await provider.listContacts(tokenResult.token, {
        limit: 100,
      });

      for (const contact of contacts) {
        if (contact.email) {
          await supabase.from('contacts').upsert(
            {
              user_id: account.user_id,
              email: contact.email,
              name: contact.name,
              phone: contact.phone,
              company: contact.company,
              job_title: contact.job_title,
              source: 'auto',
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: 'user_id,email',
            }
          );
        }
      }

      await supabase.from('sync_checkpoints').upsert({
        email_account_id: emailAccountId,
        sync_type: 'contacts',
        cursor: null,
        last_successful_at: new Date().toISOString(),
        error_count: 0,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Contact sync failed (non-critical):', err);
    }

    // Update account status
    await supabase
      .from('email_accounts')
      .update({
        sync_status: 'idle',
        last_synced_at: new Date().toISOString(),
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', emailAccountId);

    return { success: true };
  } catch (error: any) {
    console.error('Initial sync error:', error);

    // Update account with error
    await supabase
      .from('email_accounts')
      .update({
        sync_status: 'error',
        error_message: error.message || 'Unknown sync error',
        updated_at: new Date().toISOString(),
      })
      .eq('id', emailAccountId);

    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Perform delta (incremental) sync for an existing account
 */
export async function performDeltaSync(
  emailAccountId: string
): Promise<{ success: boolean; changesCount?: number; error?: string }> {
  const supabase = await createServiceClient();

  try {
    // Get email account details
    const { data: account, error: accountError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('id', emailAccountId)
      .single();

    if (accountError || !account) {
      return { success: false, error: 'Account not found' };
    }

    // RACE CONDITION PROTECTION: Check if already syncing
    if (account.sync_status === 'syncing') {
      return { success: false, error: 'Sync already in progress' };
    }

    // Skip if account has error status
    if (account.sync_status === 'error') {
      return { success: false, error: 'Account in error state' };
    }

    // Set status to syncing to prevent concurrent syncs
    await supabase
      .from('email_accounts')
      .update({
        sync_status: 'syncing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', emailAccountId);

    // Get valid token
    const tokenResult = await getValidToken(emailAccountId);
    if (!tokenResult.token) {
      return { success: false, error: tokenResult.error || 'Invalid token' };
    }

    // Get sync checkpoint
    const { data: checkpoint } = await supabase
      .from('sync_checkpoints')
      .select('*')
      .eq('email_account_id', emailAccountId)
      .eq('sync_type', 'messages')
      .single();

    const provider = getProvider(account.provider as any);

    // Perform delta sync
    const { changes, newCursor } = await provider.deltaSync(
      tokenResult.token,
      checkpoint?.cursor || undefined
    );

    let changesCount = 0;

    // Process changes
    for (const change of changes) {
      if (change.type === 'deleted' && change.message_id) {
        // Soft delete message
        await supabase
          .from('messages')
          .update({ archived_at: new Date().toISOString() })
          .eq('provider_message_id', change.message_id)
          .eq('email_account_id', emailAccountId);

        changesCount++;
      } else if (change.type === 'created' && change.message) {
        // New message - full sync with automation
        await syncMessage(supabase, account, change.message);
        changesCount++;
      } else if (change.type === 'updated' && change.message) {
        // Two-way sync: detect provider-side changes and apply them
        // without re-triggering automation (to avoid infinite loops)
        const { data: existingMessage } = await supabase
          .from('messages')
          .select('is_unread, is_starred, folder_id')
          .eq('provider_message_id', change.message.provider_message_id)
          .eq('email_account_id', emailAccountId)
          .maybeSingle();

        if (existingMessage) {
          // Build updates object with only changed fields
          const updates: Record<string, any> = {
            synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          // Detect read status change
          if (existingMessage.is_unread !== change.message.is_unread) {
            updates.is_unread = change.message.is_unread;
          }

          // Detect starred status change
          if (existingMessage.is_starred !== change.message.is_starred) {
            updates.is_starred = change.message.is_starred;
          }

          // Detect folder move
          if (existingMessage.folder_id !== change.message.folder_id) {
            updates.folder_id = change.message.folder_id;
            updates.folder_type = change.message.folder_type;
          }

          // Apply updates without triggering automation
          await supabase
            .from('messages')
            .update(updates)
            .eq('provider_message_id', change.message.provider_message_id)
            .eq('email_account_id', emailAccountId);

          changesCount++;
        } else {
          // Message doesn't exist locally, treat as created
          await syncMessage(supabase, account, change.message);
          changesCount++;
        }
      }
    }

    // Update sync checkpoint
    await supabase.from('sync_checkpoints').upsert({
      email_account_id: emailAccountId,
      sync_type: 'messages',
      cursor: newCursor,
      last_successful_at: new Date().toISOString(),
      error_count: 0,
      last_error: null,
      updated_at: new Date().toISOString(),
    });

    // Update account and reset sync status to idle
    await supabase
      .from('email_accounts')
      .update({
        sync_status: 'idle',
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', emailAccountId);

    return { success: true, changesCount };
  } catch (error: any) {
    console.error('Delta sync error:', error);

    // Increment error count
    const { data: checkpoint } = await supabase
      .from('sync_checkpoints')
      .select('error_count')
      .eq('email_account_id', emailAccountId)
      .eq('sync_type', 'messages')
      .single();

    const errorCount = (checkpoint?.error_count || 0) + 1;

    await supabase.from('sync_checkpoints').upsert({
      email_account_id: emailAccountId,
      sync_type: 'messages',
      error_count: errorCount,
      last_error: error.message || 'Unknown error',
      updated_at: new Date().toISOString(),
    });

    // If 3+ errors, set account to error status; otherwise reset to idle
    if (errorCount >= 3) {
      await supabase
        .from('email_accounts')
        .update({
          sync_status: 'error',
          error_message: 'Multiple sync failures. Please check your connection.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', emailAccountId);
    } else {
      // Reset to idle to allow retry on next sync
      await supabase
        .from('email_accounts')
        .update({
          sync_status: 'idle',
          updated_at: new Date().toISOString(),
        })
        .eq('id', emailAccountId);
    }

    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Sync a single message to the database
 * Handles deduplication via UNIQUE constraint
 */
async function syncMessage(
  supabase: any,
  account: any,
  message: NormalizedMessage
): Promise<void> {
  try {
    // Sanitize HTML body
    let sanitizedHtml = sanitizeHtml(message.body_html);

    // Process inline images (cid: references)
    if (sanitizedHtml && message.has_attachments && message.attachments) {
      sanitizedHtml = await embedInlineImages(
        account,
        message,
        sanitizedHtml
      );
    }

    const { data: syncedMessage } = await supabase.from('messages').upsert(
      {
        user_id: account.user_id,
        email_account_id: account.id,
        provider_message_id: message.provider_message_id,
        provider_thread_id: message.provider_thread_id,
        subject: message.subject,
        from_email: message.from_email,
        from_name: message.from_name,
        to_recipients: message.to_recipients,
        cc_recipients: message.cc_recipients,
        bcc_recipients: message.bcc_recipients,
        reply_to: message.reply_to,
        body_html: sanitizedHtml,
        body_text: message.body_text,
        snippet: message.snippet,
        folder_type: message.folder_type,
        folder_id: message.folder_id,
        is_unread: message.is_unread,
        is_starred: message.is_starred,
        is_draft: message.is_draft,
        has_attachments: message.has_attachments,
        attachments: message.attachments,
        importance: message.importance,
        message_date: message.message_date,
        synced_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'email_account_id,provider_message_id',
      }
    ).select().single();

    // Run automation: rules engine, gatekeeper, auto-create contact
    if (syncedMessage) {
      await handleMessageReceived(account.user_id, syncedMessage);
    }

    // Update folder counts
    await updateFolderCounts(supabase, account.id, message.folder_id);
  } catch (error) {
    console.error('Failed to sync message:', error);
    throw error;
  }
}

/**
 * Embed inline images in HTML by replacing cid: references with data URIs
 */
async function embedInlineImages(
  account: any,
  message: NormalizedMessage,
  html: string | null
): Promise<string | null> {
  if (!html) return html;

  try {
    // Find all img tags with cid: references
    const cidRegex = /<img[^>]+src=["']cid:([^"']+)["'][^>]*>/gi;
    const matches = html.matchAll(cidRegex);

    const tokenResult = await getValidToken(account.id);
    if (!tokenResult.token) {
      console.error('Cannot embed inline images: invalid token');
      return html;
    }

    const provider = getProvider(account.provider as any);

    // Process each cid reference
    for (const match of matches) {
      const contentId = match[1];

      // Find attachment with matching content_id
      const attachment = message.attachments?.find(
        (att: any) => att.content_id === contentId || att.content_id === `<${contentId}>`
      );

      if (attachment) {
        try {
          // Download attachment
          const attachmentData = await provider.getAttachment(
            tokenResult.token,
            message.provider_message_id,
            attachment.id
          );

          // Convert to base64 data URI
          const base64 = attachmentData.content.toString('base64');
          const dataUri = `data:${attachmentData.content_type};base64,${base64}`;

          // Replace cid: reference with data URI
          html = html.replace(
            new RegExp(`cid:${contentId}`, 'g'),
            dataUri
          );
        } catch (err) {
          console.error(`Failed to embed inline image ${contentId}:`, err);
        }
      }
    }

    return html;
  } catch (error) {
    console.error('Error embedding inline images:', error);
    return html;
  }
}

/**
 * Update folder unread and total counts
 */
async function updateFolderCounts(
  supabase: any,
  emailAccountId: string,
  folderId: string
): Promise<void> {
  try {
    // Get message counts for this folder
    const { count: totalCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('email_account_id', emailAccountId)
      .eq('folder_id', folderId)
      .is('archived_at', null);

    const { count: unreadCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('email_account_id', emailAccountId)
      .eq('folder_id', folderId)
      .eq('is_unread', true)
      .is('archived_at', null);

    // Update folder mapping
    await supabase
      .from('folder_mappings')
      .update({
        total_count: totalCount || 0,
        unread_count: unreadCount || 0,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('email_account_id', emailAccountId)
      .eq('provider_folder_id', folderId);
  } catch (error) {
    console.error('Failed to update folder counts:', error);
  }
}

/**
 * Perform folder sync for an email account
 * Re-fetches all folders and detects new, renamed, and deleted folders
 */
export async function performFolderSync(
  emailAccountId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServiceClient();

  try {
    // Get email account details
    const { data: account, error: accountError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('id', emailAccountId)
      .single();

    if (accountError || !account) {
      return { success: false, error: 'Account not found' };
    }

    // Get valid token
    const tokenResult = await getValidToken(emailAccountId);
    if (!tokenResult.token) {
      return { success: false, error: tokenResult.error || 'Invalid token' };
    }

    const provider = getProvider(account.provider as any);

    // Fetch current folders from provider
    const providerFolders = await provider.listFolders(tokenResult.token);

    // Get existing folder mappings from database
    const { data: existingFolders } = await supabase
      .from('folder_mappings')
      .select('*')
      .eq('email_account_id', emailAccountId);

    const existingFolderMap = new Map(
      existingFolders?.map((f) => [f.provider_folder_id, f]) || []
    );

    // Process each provider folder
    for (const folder of providerFolders) {
      const existing = existingFolderMap.get(folder.id);

      if (existing) {
        // Update existing folder (name might have changed)
        await supabase
          .from('folder_mappings')
          .update({
            folder_name: folder.name,
            folder_type: folder.folder_type,
            is_system_folder: folder.is_system_folder,
            unread_count: folder.unread_count,
            total_count: folder.total_count,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        existingFolderMap.delete(folder.id);
      } else {
        // New folder - insert
        await supabase.from('folder_mappings').insert({
          user_id: account.user_id,
          email_account_id: emailAccountId,
          provider_folder_id: folder.id,
          folder_name: folder.name,
          folder_type: folder.folder_type,
          is_system_folder: folder.is_system_folder,
          unread_count: folder.unread_count,
          total_count: folder.total_count,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }

    // Mark remaining folders as deleted (not in provider response)
    for (const [folderId, folder] of existingFolderMap) {
      await supabase
        .from('folder_mappings')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', folder.id);
    }

    // Update folder sync checkpoint
    await supabase.from('sync_checkpoints').upsert({
      email_account_id: emailAccountId,
      sync_type: 'folders',
      cursor: null,
      last_successful_at: new Date().toISOString(),
      error_count: 0,
      updated_at: new Date().toISOString(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('Folder sync error:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Sync all connected accounts for a user
 */
export async function syncAllUserAccounts(
  userId: string
): Promise<{ success: boolean; synced: number; failed: number }> {
  const supabase = await createServiceClient();

  try {
    // Get all active email accounts
    const { data: accounts } = await supabase
      .from('email_accounts')
      .select('id, sync_status')
      .eq('user_id', userId)
      .neq('sync_status', 'error');

    if (!accounts || accounts.length === 0) {
      return { success: true, synced: 0, failed: 0 };
    }

    let synced = 0;
    let failed = 0;

    // Sync each account
    for (const account of accounts) {
      if (account.sync_status === 'syncing') {
        // Perform initial sync
        const result = await performInitialSync(account.id);
        if (result.success) {
          synced++;
        } else {
          failed++;
        }
      } else {
        // Perform delta sync
        const result = await performDeltaSync(account.id);
        if (result.success) {
          synced++;
        } else {
          failed++;
        }
      }
    }

    return { success: true, synced, failed };
  } catch (error: any) {
    console.error('Sync all accounts error:', error);
    return { success: false, synced: 0, failed: 0 };
  }
}
