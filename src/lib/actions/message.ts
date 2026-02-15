/**
 * Server actions for message management
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/permissions';
import { emitEvent } from '@/lib/events';
import {
  updateMessageSchema,
  deleteMessageSchema,
  bulkUpdateMessagesSchema,
  type UpdateMessageInput,
  type DeleteMessageInput,
  type BulkUpdateMessagesInput,
} from '@/lib/validations';
import type { Message } from '@/types/database';

type ActionResult<T> = { data: T; error: null } | { data: null; error: string };

// =============================================================================
// MESSAGES (Read-only from providers, but can update local flags)
// =============================================================================

export async function getMessages(params?: {
  folder_type?: import('@/types/database').FolderType;
  is_unread?: boolean;
  is_starred?: boolean;
  limit?: number;
  offset?: number;
}): Promise<ActionResult<Message[]>> {
  try {
    const perms = await requireAuth();

    const supabase = await createClient();
    let query = supabase.from('messages').select('*').eq('user_id', perms.userId);

    if (params?.folder_type) {
      query = query.eq('folder_type', params.folder_type);
    }

    if (params?.is_unread !== undefined) {
      query = query.eq('is_unread', params.is_unread);
    }

    if (params?.is_starred !== undefined) {
      query = query.eq('is_starred', params.is_starred);
    }

    query = query.order('message_date', { ascending: false });

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    if (params?.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to get messages' };
  }
}

export async function updateMessage(input: UpdateMessageInput): Promise<ActionResult<Message>> {
  try {
    const perms = await requireAuth();
    const validated = updateMessageSchema.parse(input);

    const supabase = await createClient();

    // Get previous state for event payload
    const { data: prevMessage } = await supabase
      .from('messages')
      .select('user_id, is_unread, is_starred, folder_type, from_email, subject')
      .eq('id', validated.id)
      .single();

    if (!prevMessage || (prevMessage as any).user_id !== perms.userId) {
      throw new Error('Forbidden - message not found or access denied');
    }

    const { data, error } = await (supabase.from('messages') as any).update(validated).eq('id', validated.id).select().single();

    if (error) throw new Error(error.message);

    // Emit events based on what changed
    if ('is_unread' in validated && validated.is_unread !== (prevMessage as any).is_unread) {
      await emitEvent({
        eventType: validated.is_unread ? 'message.unread' : 'message.read',
        entityType: 'message',
        entityId: validated.id,
        actorId: perms.userId,
        payload: {
          from_email: (prevMessage as any).from_email,
          subject: (prevMessage as any).subject,
        },
        metadata: { source: 'ui' },
      });
    }

    if ('is_starred' in validated && validated.is_starred !== (prevMessage as any).is_starred) {
      await emitEvent({
        eventType: validated.is_starred ? 'message.starred' : 'message.unstarred',
        entityType: 'message',
        entityId: validated.id,
        actorId: perms.userId,
        payload: {
          from_email: (prevMessage as any).from_email,
          subject: (prevMessage as any).subject,
        },
        metadata: { source: 'ui' },
      });
    }

    if ('folder_type' in validated && validated.folder_type !== (prevMessage as any).folder_type) {
      await emitEvent({
        eventType: validated.folder_type === 'archive' ? 'message.archived' : 'message.moved',
        entityType: 'message',
        entityId: validated.id,
        actorId: perms.userId,
        payload: {
          from_folder: (prevMessage as any).folder_type,
          to_folder: validated.folder_type,
          from_email: (prevMessage as any).from_email,
          subject: (prevMessage as any).subject,
        },
        metadata: { source: 'ui' },
      });
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to update message' };
  }
}

export async function deleteMessage(input: DeleteMessageInput): Promise<ActionResult<{ success: true }>> {
  try {
    const perms = await requireAuth();
    const validated = deleteMessageSchema.parse(input);

    const supabase = await createClient();

    // Get message details for event
    const { data: message } = await supabase
      .from('messages')
      .select('user_id, from_email, subject, folder_type')
      .eq('id', validated.id)
      .single();

    if (!message || (message as any).user_id !== perms.userId) {
      throw new Error('Forbidden - message not found or access denied');
    }

    // Soft delete - move to trash
    const { error } = await (supabase.from('messages') as any).update({ folder_type: 'trash' }).eq('id', validated.id);

    if (error) throw new Error(error.message);

    // Emit event
    await emitEvent({
      eventType: 'message.deleted',
      entityType: 'message',
      entityId: validated.id,
      actorId: perms.userId,
      payload: {
        from_email: (message as any).from_email,
        subject: (message as any).subject,
        previous_folder: (message as any).folder_type,
      },
      metadata: { source: 'ui' },
    });

    return { data: { success: true }, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to delete message' };
  }
}

export async function bulkUpdateMessages(input: BulkUpdateMessagesInput): Promise<ActionResult<{ count: number }>> {
  try {
    const perms = await requireAuth();
    const validated = bulkUpdateMessagesSchema.parse(input);

    const supabase = await createClient();

    // Verify ownership of all messages
    const { data: messages } = await supabase
      .from('messages')
      .select('id, user_id')
      .in('id', validated.message_ids);

    if (!messages || messages.length !== validated.message_ids.length) {
      throw new Error('Some messages not found');
    }

    const unauthorizedMessages = messages.filter((m: any) => m.user_id !== perms.userId);
    if (unauthorizedMessages.length > 0) {
      throw new Error('Forbidden - access denied to some messages');
    }

    const { data, error } = await (supabase
      .from('messages') as any)
      .update(validated.updates)
      .in('id', validated.message_ids)
      .select();

    if (error) throw new Error(error.message);

    return { data: { count: data.length }, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to bulk update messages' };
  }
}

export async function searchMessages(
  query: string,
  options?: {
    limit?: number;
    email_account_id?: string;
  }
): Promise<ActionResult<Message[]>> {
  try {
    const perms = await requireAuth();
    const limit = options?.limit || 50;

    const supabase = await createClient();
    let dbQuery = supabase
      .from('messages')
      .select('*')
      .eq('user_id', perms.userId);

    // Filter by email account if specified
    if (options?.email_account_id) {
      dbQuery = dbQuery.eq('email_account_id', options.email_account_id);
    }

    const { data, error } = await dbQuery
      .textSearch('fts', query, { type: 'websearch' })
      .order('message_date', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to search messages' };
  }
}

// =============================================================================
// SEND EMAIL (Stage 4 - Workflow)
// =============================================================================

export async function sendEmail(params: {
  email_account_id: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body_html: string;
  reply_to_message_id?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const perms = await requireAuth();
    const supabase = await createClient();

    // Validate recipients
    if (!params.to || params.to.length === 0) {
      return { data: null, error: 'At least one recipient required' };
    }

    // Get email account
    const { data: account, error: accountError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('id', params.email_account_id)
      .eq('user_id', perms.userId)
      .single();

    if (accountError || !account) {
      return { data: null, error: 'Email account not found' };
    }

    // Get valid token
    const { getValidToken } = await import('@/lib/providers/token-manager');
    const tokenResult = await getValidToken(params.email_account_id);

    if (!tokenResult.token) {
      return { data: null, error: tokenResult.error || 'Invalid token' };
    }

    // Send via provider
    const { getProvider } = await import('@/lib/providers');
    const provider = getProvider(account.provider as any);

    const result = await provider.sendMessage(tokenResult.token, {
      to: params.to.map((email) => ({ email })),
      cc: params.cc?.map((email) => ({ email })),
      bcc: params.bcc?.map((email) => ({ email })),
      subject: params.subject,
      body_html: params.body_html,
      reply_to_message_id: params.reply_to_message_id,
    });

    // Log usage
    await supabase.from('usage_tracking').insert({
      user_id: perms.userId,
      feature: 'email_send',
      count: 1,
      timestamp: new Date().toISOString(),
    });

    // Emit event
    await emitEvent({
      eventType: 'message.sent',
      entityType: 'message',
      entityId: result.id,
      actorId: perms.userId,
      payload: {
        to_recipients: params.to.map((email) => ({ email })),
        subject: params.subject,
        reply_to_message_id: params.reply_to_message_id,
      },
      metadata: { source: 'ui' },
    });

    return { data: { id: result.id }, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Failed to send email' };
  }
}
