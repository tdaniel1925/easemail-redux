/**
 * Server actions for webhook management
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/permissions';
import {
  createWebhookSchema,
  updateWebhookSchema,
  deleteWebhookSchema,
  type CreateWebhookInput,
  type UpdateWebhookInput,
  type DeleteWebhookInput,
} from '@/lib/validations';
import type { Webhook } from '@/types/database';

type ActionResult<T> = { data: T; error: null } | { data: null; error: string };

// =============================================================================
// WEBHOOKS
// =============================================================================

export async function createWebhook(input: CreateWebhookInput): Promise<ActionResult<Webhook>> {
  try {
    const perms = await requireAuth();
    const validated = createWebhookSchema.parse(input);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('webhooks')
      .insert({
        user_id: perms.userId,
        ...validated,
      } as any)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to create webhook' };
  }
}

export async function updateWebhook(input: UpdateWebhookInput): Promise<ActionResult<Webhook>> {
  try {
    const perms = await requireAuth();
    const validated = updateWebhookSchema.parse(input);

    const supabase = await createClient();

    // Verify ownership
    const { data: webhook } = await supabase.from('webhooks').select('user_id').eq('id', validated.id).single();

    if (!webhook || (webhook as any).user_id !== perms.userId) {
      throw new Error('Forbidden - webhook not found or access denied');
    }

    const { id, ...updates } = validated;
    const { data, error } = await (supabase.from('webhooks') as any).update(updates).eq('id', id).select().single();

    if (error) throw new Error(error.message);

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to update webhook' };
  }
}

export async function deleteWebhook(input: DeleteWebhookInput): Promise<ActionResult<{ success: true }>> {
  try {
    const perms = await requireAuth();
    const validated = deleteWebhookSchema.parse(input);

    const supabase = await createClient();

    // Verify ownership
    const { data: webhook } = await supabase.from('webhooks').select('user_id').eq('id', validated.id).single();

    if (!webhook || (webhook as any).user_id !== perms.userId) {
      throw new Error('Forbidden - webhook not found or access denied');
    }

    const { error } = await supabase.from('webhooks').delete().eq('id', validated.id);

    if (error) throw new Error(error.message);

    return { data: { success: true }, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to delete webhook' };
  }
}

export async function getWebhooks(): Promise<ActionResult<Webhook[]>> {
  try {
    const perms = await requireAuth();

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('user_id', perms.userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to get webhooks' };
  }
}
