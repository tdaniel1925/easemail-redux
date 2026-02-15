/**
 * Server actions for draft management
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/permissions';
import { emitEvent } from '@/lib/events';
import {
  createDraftSchema,
  updateDraftSchema,
  deleteDraftSchema,
  type CreateDraftInput,
  type UpdateDraftInput,
  type DeleteDraftInput,
} from '@/lib/validations';
import type { Draft } from '@/types/database';

type ActionResult<T> = { data: T; error: null } | { data: null; error: string };

// =============================================================================
// DRAFTS
// =============================================================================

export async function createDraft(input: CreateDraftInput): Promise<ActionResult<Draft>> {
  try {
    const perms = await requireAuth();
    const validated = createDraftSchema.parse(input);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('drafts')
      .insert({
        user_id: perms.userId,
        ...validated,
      } as any)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Emit event
    await emitEvent({
      eventType: 'draft.created',
      entityType: 'draft',
      entityId: (data as any).id,
      actorId: perms.userId,
      payload: {
        subject: validated.subject,
        has_recipients: (validated.to_recipients as any)?.length > 0,
      },
      metadata: { source: 'ui' },
    });

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to create draft' };
  }
}

export async function updateDraft(input: UpdateDraftInput): Promise<ActionResult<Draft>> {
  try {
    const perms = await requireAuth();
    const validated = updateDraftSchema.parse(input);

    const supabase = await createClient();

    // Verify ownership
    const { data: draft } = await supabase.from('drafts').select('user_id').eq('id', validated.id).single();

    if (!draft || (draft as any).user_id !== perms.userId) {
      throw new Error('Forbidden - draft not found or access denied');
    }

    const { id, ...updates } = validated;
    const { data, error } = await (supabase.from('drafts') as any).update(updates).eq('id', id).select().single();

    if (error) throw new Error(error.message);

    // Emit event (auto_saved vs updated)
    const eventType = (data as any).auto_saved ? 'draft.auto_saved' : 'draft.updated';
    await emitEvent({
      eventType,
      entityType: 'draft',
      entityId: id,
      actorId: perms.userId,
      payload: {
        subject: (data as any).subject,
        has_recipients: (data as any).to_recipients?.length > 0,
      },
      metadata: { source: 'ui' },
    });

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to update draft' };
  }
}

export async function deleteDraft(input: DeleteDraftInput): Promise<ActionResult<{ success: true }>> {
  try {
    const perms = await requireAuth();
    const validated = deleteDraftSchema.parse(input);

    const supabase = await createClient();

    // Get draft details for event
    const { data: draft } = await supabase
      .from('drafts')
      .select('user_id, subject')
      .eq('id', validated.id)
      .single();

    if (!draft || (draft as any).user_id !== perms.userId) {
      throw new Error('Forbidden - draft not found or access denied');
    }

    const { error } = await supabase.from('drafts').delete().eq('id', validated.id);

    if (error) throw new Error(error.message);

    // Emit event
    await emitEvent({
      eventType: 'draft.deleted',
      entityType: 'draft',
      entityId: validated.id,
      actorId: perms.userId,
      payload: {
        subject: (draft as any).subject,
      },
      metadata: { source: 'ui' },
    });

    return { data: { success: true }, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to delete draft' };
  }
}

export async function getDrafts(): Promise<ActionResult<Draft[]>> {
  try {
    const perms = await requireAuth();

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('drafts')
      .select('*')
      .eq('user_id', perms.userId)
      .order('updated_at', { ascending: false });

    if (error) throw new Error(error.message);

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to get drafts' };
  }
}
