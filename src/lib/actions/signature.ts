/**
 * Server actions for signature management
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/permissions';
import {
  createSignatureSchema,
  updateSignatureSchema,
  deleteSignatureSchema,
  type CreateSignatureInput,
  type UpdateSignatureInput,
  type DeleteSignatureInput,
} from '@/lib/validations';
import type { Signature } from '@/types/database';

type ActionResult<T> = { data: T; error: null } | { data: null; error: string };

// =============================================================================
// SIGNATURES
// =============================================================================

export async function createSignature(input: CreateSignatureInput): Promise<ActionResult<Signature>> {
  try {
    const perms = await requireAuth();
    const validated = createSignatureSchema.parse(input);

    const supabase = await createClient();

    // If this is marked as default, unset other default signatures
    if (validated.is_default) {
      await (supabase.from('signatures') as any).update({ is_default: false }).eq('user_id', perms.userId).eq('is_default', true);
    }

    const { data, error } = await supabase
      .from('signatures')
      .insert({
        user_id: perms.userId,
        ...validated,
      } as any)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to create signature' };
  }
}

export async function updateSignature(input: UpdateSignatureInput): Promise<ActionResult<Signature>> {
  try {
    const perms = await requireAuth();
    const validated = updateSignatureSchema.parse(input);

    const supabase = await createClient();

    // Verify ownership
    const { data: signature } = await supabase.from('signatures').select('user_id').eq('id', validated.id).single();

    if (!signature || (signature as any).user_id !== perms.userId) {
      throw new Error('Forbidden - signature not found or access denied');
    }

    // If setting as default, unset other default signatures
    if (validated.is_default) {
      await (supabase.from('signatures') as any).update({ is_default: false }).eq('user_id', perms.userId).eq('is_default', true);
    }

    const { id, ...updates } = validated;
    const { data, error } = await (supabase.from('signatures') as any).update(updates).eq('id', id).select().single();

    if (error) throw new Error(error.message);

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to update signature' };
  }
}

export async function deleteSignature(input: DeleteSignatureInput): Promise<ActionResult<{ success: true }>> {
  try {
    const perms = await requireAuth();
    const validated = deleteSignatureSchema.parse(input);

    const supabase = await createClient();

    // Verify ownership
    const { data: signature } = await supabase.from('signatures').select('user_id').eq('id', validated.id).single();

    if (!signature || (signature as any).user_id !== perms.userId) {
      throw new Error('Forbidden - signature not found or access denied');
    }

    const { error } = await supabase.from('signatures').delete().eq('id', validated.id);

    if (error) throw new Error(error.message);

    return { data: { success: true }, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to delete signature' };
  }
}

export async function getSignatures(): Promise<ActionResult<Signature[]>> {
  try {
    const perms = await requireAuth();

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('signatures')
      .select('*')
      .eq('user_id', perms.userId)
      .order('sort_order', { ascending: true });

    if (error) throw new Error(error.message);

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to get signatures' };
  }
}
