/**
 * Server actions for contact management
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/permissions';
import { emitEvent } from '@/lib/events';
import {
  createContactSchema,
  updateContactSchema,
  deleteContactSchema,
  importContactsSchema,
  type CreateContactInput,
  type UpdateContactInput,
  type DeleteContactInput,
  type ImportContactsInput,
} from '@/lib/validations';
import type { Contact } from '@/types/database';

type ActionResult<T> = { data: T; error: null } | { data: null; error: string };

// =============================================================================
// CONTACTS
// =============================================================================

export async function createContact(input: CreateContactInput): Promise<ActionResult<Contact>> {
  try {
    const perms = await requireAuth();
    const validated = createContactSchema.parse(input);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('contacts')
      .insert({
        user_id: perms.userId,
        ...validated,
      } as any)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Emit event
    await emitEvent({
      eventType: 'contact.created',
      entityType: 'contact',
      entityId: (data as any).id,
      actorId: perms.userId,
      payload: {
        email: validated.email,
        name: validated.name,
        source: (data as any).source || 'manual',
      },
      metadata: { source: 'ui' },
    });

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to create contact' };
  }
}

export async function updateContact(input: UpdateContactInput): Promise<ActionResult<Contact>> {
  try {
    const perms = await requireAuth();
    const validated = updateContactSchema.parse(input);

    const supabase = await createClient();

    // Verify ownership
    const { data: contact } = await supabase.from('contacts').select('user_id').eq('id', validated.id).single();

    if (!contact || (contact as any).user_id !== perms.userId) {
      throw new Error('Forbidden - contact not found or access denied');
    }

    const { id, ...updates } = validated;
    const { data, error } = await (supabase.from('contacts') as any).update(updates).eq('id', id).select().single();

    if (error) throw new Error(error.message);

    // Emit event
    await emitEvent({
      eventType: 'contact.updated',
      entityType: 'contact',
      entityId: id,
      actorId: perms.userId,
      payload: {
        email: (data as any).email,
        name: (data as any).name,
      },
      metadata: { source: 'ui' },
    });

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to update contact' };
  }
}

export async function deleteContact(input: DeleteContactInput): Promise<ActionResult<{ success: true }>> {
  try {
    const perms = await requireAuth();
    const validated = deleteContactSchema.parse(input);

    const supabase = await createClient();

    // Get contact details for event
    const { data: contact } = await supabase
      .from('contacts')
      .select('user_id, email, name')
      .eq('id', validated.id)
      .single();

    if (!contact || (contact as any).user_id !== perms.userId) {
      throw new Error('Forbidden - contact not found or access denied');
    }

    const { error } = await supabase.from('contacts').delete().eq('id', validated.id);

    if (error) throw new Error(error.message);

    // Emit event
    await emitEvent({
      eventType: 'contact.deleted',
      entityType: 'contact',
      entityId: validated.id,
      actorId: perms.userId,
      payload: {
        email: (contact as any).email,
        name: (contact as any).name,
      },
      metadata: { source: 'ui' },
    });

    return { data: { success: true }, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to delete contact' };
  }
}

export async function getContacts(params?: {
  is_favorite?: boolean;
  is_priority_sender?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<ActionResult<Contact[]>> {
  try {
    const perms = await requireAuth();

    const supabase = await createClient();
    let query = supabase.from('contacts').select('*').eq('user_id', perms.userId);

    if (params?.is_favorite !== undefined) {
      query = query.eq('is_favorite', params.is_favorite);
    }

    if (params?.is_priority_sender !== undefined) {
      query = query.eq('is_priority_sender', params.is_priority_sender);
    }

    if (params?.search) {
      query = query.textSearch('fts', params.search, { type: 'websearch' });
    }

    query = query.order('email_count', { ascending: false });

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
    return { data: null, error: error instanceof Error ? error.message : 'Failed to get contacts' };
  }
}

export async function importContacts(input: ImportContactsInput): Promise<ActionResult<{ imported: number; skipped: number }>> {
  try {
    const perms = await requireAuth();
    const validated = importContactsSchema.parse(input);

    const supabase = await createClient();

    const contactsToInsert = validated.contacts.map((contact) => ({
      user_id: perms.userId,
      ...contact,
      source: 'import' as const,
    }));

    // Use upsert to avoid duplicates based on email
    const { data, error } = await (supabase.from('contacts') as any).upsert(contactsToInsert, {
      onConflict: 'user_id,email',
      ignoreDuplicates: false,
    }).select();

    if (error) throw new Error(error.message);

    // Emit event
    await emitEvent({
      eventType: 'contact.imported',
      entityType: 'contact',
      actorId: perms.userId,
      payload: {
        imported_count: data.length,
        skipped_count: contactsToInsert.length - data.length,
        total_count: contactsToInsert.length,
      },
      metadata: { source: 'ui' },
    });

    return {
      data: {
        imported: data.length,
        skipped: contactsToInsert.length - data.length,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to import contacts' };
  }
}
