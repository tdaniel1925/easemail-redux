'use server';

import { createClient } from '@/lib/supabase/server';
import { evaluateRules } from './rules-engine';
import type { Message } from '@/types/message';

/**
 * Event handlers for automation side effects
 * Called by event listeners or directly from state-changing operations
 * See SPEC-AUTOMATION.md AUTO-1 for complete list
 */

/**
 * Handle message.received event
 * - Run email rules engine
 * - Check gatekeeper (if enabled)
 * - Update folder counts
 * - Auto-create contact if new sender
 */
export async function handleMessageReceived(
  userId: string,
  message: Message
): Promise<void> {
  // Run email rules engine
  await evaluateRules(userId, message);

  // Auto-create contact from sender (if not exists)
  await autoCreateContact(userId, message.from_email, message.from_name);

  // Update folder counts
  await updateFolderCounts(userId, message.email_account_id);
}

/**
 * Handle message.sent event
 * - Auto-create contact if new recipient
 * - Increment email_count on contact
 * - Update folder counts
 */
export async function handleMessageSent(
  userId: string,
  message: Message
): Promise<void> {
  const supabase = await createClient();

  // Auto-create contacts for all recipients
  const recipients = (message.to_recipients as Array<{ email: string; name?: string }>) || [];
  for (const recipient of recipients) {
    await autoCreateContact(userId, recipient.email, recipient.name || null);

    // Increment email_count on contact
    await supabase.rpc('increment_contact_email_count', {
      p_user_id: userId,
      p_email: recipient.email,
    });
  }

  // Update folder counts
  await updateFolderCounts(userId, message.email_account_id);
}

/**
 * Handle message.deleted event
 * - Update folder counts
 * - Remove from snoozed if snoozed
 */
export async function handleMessageDeleted(
  userId: string,
  messageId: string,
  emailAccountId: string
): Promise<void> {
  const supabase = await createClient();

  // Remove from snoozed emails if exists
  await supabase
    .from('snoozed_emails')
    .delete()
    .eq('message_id', messageId)
    .eq('user_id', userId);

  // Update folder counts
  await updateFolderCounts(userId, emailAccountId);
}

/**
 * Handle snooze.expired event
 * - Move message back to original folder
 * - Mark unread
 * - Create notification
 */
export async function handleSnoozeExpired(
  userId: string,
  snoozedEmailId: string
): Promise<void> {
  const supabase = await createClient();

  // Get snoozed email record with message details
  const { data: snoozed } = await supabase
    .from('snoozed_emails')
    .select('message_id, original_folder_type')
    .eq('id', snoozedEmailId)
    .eq('user_id', userId)
    .single();

  if (!snoozed) return;

  // Get message to retrieve email_account_id
  const { data: message } = await supabase
    .from('messages')
    .select('email_account_id')
    .eq('id', snoozed.message_id)
    .eq('user_id', userId)
    .single();

  // Move back to original folder and mark unread
  await supabase
    .from('messages')
    .update({
      folder_type: snoozed.original_folder_type,
      is_unread: true,
    })
    .eq('id', snoozed.message_id)
    .eq('user_id', userId);

  // Mark snoozed as unsnoozed
  await supabase
    .from('snoozed_emails')
    .update({ unsnoozed: true })
    .eq('id', snoozedEmailId);

  // Create notification
  await supabase.from('notification_queue').insert({
    user_id: userId,
    email_account_id: message?.email_account_id || null,
    type: 'info',
    title: 'Snoozed Email Returned',
    message: 'A snoozed email has returned to your inbox',
    link: `/app/inbox?message=${snoozed.message_id}`,
    read: false,
  });
}

/**
 * Handle email_account.sync_error event
 * - Increment error count
 * - Notify user if 3+ errors
 */
export async function handleSyncError(
  userId: string,
  emailAccountId: string,
  errorMessage: string
): Promise<void> {
  const supabase = await createClient();

  // Get current error count
  const { data: checkpoint } = await supabase
    .from('sync_checkpoints')
    .select('error_count')
    .eq('email_account_id', emailAccountId)
    .eq('sync_type', 'messages')
    .maybeSingle();

  const errorCount = (checkpoint?.error_count || 0) + 1;

  // Update checkpoint with error
  await supabase
    .from('sync_checkpoints')
    .update({
      error_count: errorCount,
      last_error: errorMessage,
    })
    .eq('email_account_id', emailAccountId)
    .eq('sync_type', 'messages');

  // Notify if 3+ errors
  if (errorCount >= 3) {
    await supabase.from('notification_queue').insert({
      user_id: userId,
      email_account_id: emailAccountId,
      type: 'error',
      title: 'Email Sync Error',
      message: `Sync failed ${errorCount} times. Please check your email account connection.`,
      link: '/app/settings/accounts',
      read: false,
    });
  }
}

/**
 * Handle org.member_added event
 * - Increment seats_used
 * - Log audit
 */
export async function handleMemberAdded(
  organizationId: string,
  userId: string,
  addedBy: string
): Promise<void> {
  const supabase = await createClient();

  // Increment seats_used
  await supabase.rpc('increment_org_seats_used', {
    p_org_id: organizationId,
  });

  // Audit log (already handled by action - no-op here)
}

/**
 * Handle org.member_removed event
 * - Decrement seats_used
 * - Log audit
 */
export async function handleMemberRemoved(
  organizationId: string,
  userId: string,
  removedBy: string
): Promise<void> {
  const supabase = await createClient();

  // Decrement seats_used
  await supabase.rpc('decrement_org_seats_used', {
    p_org_id: organizationId,
  });

  // Audit log (already handled by action - no-op here)
}

/**
 * Handle token.refresh_failed event
 * - Set account to error state
 * - Notify user
 */
export async function handleTokenRefreshFailed(
  userId: string,
  emailAccountId: string,
  errorMessage: string
): Promise<void> {
  const supabase = await createClient();

  // Set account to error state
  await supabase
    .from('email_accounts')
    .update({
      sync_status: 'error',
      error_message: 'Token refresh failed. Please reconnect your account.',
    })
    .eq('id', emailAccountId)
    .eq('user_id', userId);

  // Notify user
  await supabase.from('notification_queue').insert({
    user_id: userId,
    email_account_id: emailAccountId,
    type: 'error',
    title: 'Email Account Error',
    message: 'Your email account connection expired. Please reconnect.',
    link: '/app/settings/accounts',
    read: false,
  });
}

// Helper functions

/**
 * Auto-create contact from email address if not exists
 */
async function autoCreateContact(
  userId: string,
  email: string,
  name: string | null
): Promise<void> {
  const supabase = await createClient();

  // Check if contact exists
  const { data: existing } = await supabase
    .from('contacts')
    .select('id')
    .eq('user_id', userId)
    .eq('email', email)
    .maybeSingle();

  if (existing) return;

  // Create contact
  await supabase.from('contacts').insert({
    user_id: userId,
    email,
    name: name || null,
    source: 'auto',
    email_count: 0,
    last_emailed_at: new Date().toISOString(),
  });
}

/**
 * Update folder counts for an email account
 */
async function updateFolderCounts(
  userId: string,
  emailAccountId: string
): Promise<void> {
  const supabase = await createClient();

  // Get all folders for this account
  const { data: folders } = await supabase
    .from('folder_mappings')
    .select('id, folder_type')
    .eq('email_account_id', emailAccountId)
    .eq('user_id', userId);

  if (!folders) return;

  // Update counts for each folder
  for (const folder of folders) {
    // Count total messages
    const { count: totalCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('email_account_id', emailAccountId)
      .eq('folder_type', folder.folder_type);

    // Count unread messages
    const { count: unreadCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('email_account_id', emailAccountId)
      .eq('folder_type', folder.folder_type)
      .eq('is_unread', true);

    // Update folder mapping
    await supabase
      .from('folder_mappings')
      .update({
        total_count: totalCount || 0,
        unread_count: unreadCount || 0,
      })
      .eq('id', folder.id);
  }
}
