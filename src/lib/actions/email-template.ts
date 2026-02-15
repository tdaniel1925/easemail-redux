/**
 * Server actions for email template management
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/permissions';
import {
  createEmailTemplateSchema,
  updateEmailTemplateSchema,
  deleteEmailTemplateSchema,
  type CreateEmailTemplateInput,
  type UpdateEmailTemplateInput,
  type DeleteEmailTemplateInput,
} from '@/lib/validations';
import type { EmailTemplate } from '@/types/database';

type ActionResult<T> = { data: T; error: null } | { data: null; error: string };

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================

export async function createEmailTemplate(input: CreateEmailTemplateInput): Promise<ActionResult<EmailTemplate>> {
  try {
    const perms = await requireAuth();
    const validated = createEmailTemplateSchema.parse(input);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('email_templates')
      .insert({
        user_id: perms.userId,
        ...validated,
      } as any)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to create email template' };
  }
}

export async function updateEmailTemplate(input: UpdateEmailTemplateInput): Promise<ActionResult<EmailTemplate>> {
  try {
    const perms = await requireAuth();
    const validated = updateEmailTemplateSchema.parse(input);

    const supabase = await createClient();

    // Verify ownership
    const { data: template } = await supabase.from('email_templates').select('user_id').eq('id', validated.id).single();

    if (!template || (template as any).user_id !== perms.userId) {
      throw new Error('Forbidden - email template not found or access denied');
    }

    const { id, ...updates } = validated;
    const { data, error } = await (supabase.from('email_templates') as any).update(updates).eq('id', id).select().single();

    if (error) throw new Error(error.message);

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to update email template' };
  }
}

export async function deleteEmailTemplate(input: DeleteEmailTemplateInput): Promise<ActionResult<{ success: true }>> {
  try {
    const perms = await requireAuth();
    const validated = deleteEmailTemplateSchema.parse(input);

    const supabase = await createClient();

    // Verify ownership
    const { data: template } = await supabase.from('email_templates').select('user_id').eq('id', validated.id).single();

    if (!template || (template as any).user_id !== perms.userId) {
      throw new Error('Forbidden - email template not found or access denied');
    }

    const { error } = await supabase.from('email_templates').delete().eq('id', validated.id);

    if (error) throw new Error(error.message);

    return { data: { success: true }, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to delete email template' };
  }
}

export async function getEmailTemplates(category?: string): Promise<ActionResult<EmailTemplate[]>> {
  try {
    const perms = await requireAuth();

    const supabase = await createClient();
    let query = supabase
      .from('email_templates')
      .select('*')
      .eq('user_id', perms.userId)
      .order('use_count', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to get email templates' };
  }
}
