/**
 * Server actions for email account management
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/permissions';
import {
  createEmailAccountSchema,
  updateEmailAccountSchema,
  deleteEmailAccountSchema,
  type CreateEmailAccountInput,
  type UpdateEmailAccountInput,
  type DeleteEmailAccountInput,
} from '@/lib/validations';
import type { EmailAccount } from '@/types/database';

type ActionResult<T> = { data: T; error: null } | { data: null; error: string };

// =============================================================================
// EMAIL ACCOUNTS
// =============================================================================

export async function createEmailAccount(input: CreateEmailAccountInput): Promise<ActionResult<EmailAccount>> {
  try {
    const perms = await requireAuth();
    const validated = createEmailAccountSchema.parse(input);

    // Ensure user can only create accounts for themselves
    if (validated.user_id !== perms.userId) {
      throw new Error('Forbidden - cannot create email accounts for other users');
    }

    const supabase = await createClient();

    // If this is marked as primary, unset other primary accounts
    if (validated.is_primary) {
      await (supabase.from('email_accounts') as any).update({ is_primary: false }).eq('user_id', perms.userId).eq('is_primary', true);
    }

    const { data, error } = await supabase.from('email_accounts').insert(validated as any).select().single();

    if (error) throw new Error(error.message);

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to create email account' };
  }
}

export async function updateEmailAccount(input: UpdateEmailAccountInput): Promise<ActionResult<EmailAccount>> {
  try {
    const perms = await requireAuth();
    const validated = updateEmailAccountSchema.parse(input);

    const supabase = await createClient();

    // Verify ownership
    const { data: account } = await supabase.from('email_accounts').select('user_id').eq('id', validated.id).single();

    if (!account || (account as any).user_id !== perms.userId) {
      throw new Error('Forbidden - email account not found or access denied');
    }

    // If setting as primary, unset other primary accounts
    if (validated.is_primary) {
      await (supabase.from('email_accounts') as any).update({ is_primary: false }).eq('user_id', perms.userId).eq('is_primary', true);
    }

    const { data, error } = await (supabase.from('email_accounts') as any).update(validated).eq('id', validated.id).select().single();

    if (error) throw new Error(error.message);

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to update email account' };
  }
}

export async function deleteEmailAccount(input: DeleteEmailAccountInput): Promise<ActionResult<{ success: true }>> {
  try {
    const perms = await requireAuth();
    const validated = deleteEmailAccountSchema.parse(input);

    const supabase = await createClient();

    // Verify ownership
    const { data: account } = await supabase.from('email_accounts').select('user_id').eq('id', validated.id).single();

    if (!account || (account as any).user_id !== perms.userId) {
      throw new Error('Forbidden - email account not found or access denied');
    }

    const { error } = await supabase.from('email_accounts').delete().eq('id', validated.id);

    if (error) throw new Error(error.message);

    return { data: { success: true }, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to delete email account' };
  }
}

export async function getEmailAccounts(): Promise<ActionResult<EmailAccount[]>> {
  try {
    const perms = await requireAuth();

    const supabase = await createClient();
    const { data, error } = await supabase.from('email_accounts').select('*').eq('user_id', perms.userId).order('is_primary', { ascending: false });

    if (error) throw new Error(error.message);

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to get email accounts' };
  }
}
