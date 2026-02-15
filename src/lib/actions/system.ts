/**
 * Server actions for system settings and admin operations
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAuth, requireSuperAdmin } from '@/lib/auth/permissions';
import {
  createSystemSettingSchema,
  updateSystemSettingSchema,
  deleteSystemSettingSchema,
  startImpersonateSchema,
  endImpersonateSchema,
  queryAuditLogsSchema,
  type CreateSystemSettingInput,
  type UpdateSystemSettingInput,
  type DeleteSystemSettingInput,
  type StartImpersonateInput,
  type EndImpersonateInput,
  type QueryAuditLogsInput,
} from '@/lib/validations';
import type { SystemSetting, ImpersonateSession, AuditLog } from '@/types/database';

type ActionResult<T> = { data: T; error: null } | { data: null; error: string };

// =============================================================================
// SYSTEM SETTINGS (Super Admin Only)
// =============================================================================

export async function createSystemSetting(input: CreateSystemSettingInput): Promise<ActionResult<SystemSetting>> {
  try {
    const perms = await requireSuperAdmin();
    const validated = createSystemSettingSchema.parse(input);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('system_settings')
      .insert({
        ...validated,
        updated_by: perms.userId,
      } as any)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to create system setting' };
  }
}

export async function updateSystemSetting(input: UpdateSystemSettingInput): Promise<ActionResult<SystemSetting>> {
  try {
    const perms = await requireSuperAdmin();
    const validated = updateSystemSettingSchema.parse(input);

    const supabase = await createClient();
    const { data, error } = await (supabase
      .from('system_settings') as any)
      .update({
        value: validated.value,
        description: validated.description,
        updated_by: perms.userId,
      })
      .eq('id', validated.id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to update system setting' };
  }
}

export async function deleteSystemSetting(input: DeleteSystemSettingInput): Promise<ActionResult<{ success: true }>> {
  try {
    await requireSuperAdmin();
    const validated = deleteSystemSettingSchema.parse(input);

    const supabase = await createClient();
    const { error } = await supabase.from('system_settings').delete().eq('id', validated.id);

    if (error) throw new Error(error.message);

    return { data: { success: true }, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to delete system setting' };
  }
}

// =============================================================================
// IMPERSONATION (Super Admin Only)
// =============================================================================

export async function startImpersonate(input: StartImpersonateInput): Promise<ActionResult<ImpersonateSession>> {
  try {
    const perms = await requireSuperAdmin();
    const validated = startImpersonateSchema.parse(input);

    const supabase = await createClient();

    // Verify target user is not a super admin
    const { data: targetUser } = await supabase
      .from('users')
      .select('is_super_admin')
      .eq('id', validated.target_user_id)
      .single();

    if ((targetUser as any)?.is_super_admin) {
      throw new Error('Cannot impersonate another super admin');
    }

    // Create impersonation session
    const { data, error } = await supabase
      .from('impersonate_sessions')
      .insert({
        admin_user_id: perms.userId,
        target_user_id: validated.target_user_id,
        reason: validated.reason,
      } as any)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Create audit log
    await supabase.from('audit_logs').insert({
      user_id: perms.userId,
      target_user_id: validated.target_user_id,
      action: 'impersonate',
      entity_type: 'user',
      entity_id: validated.target_user_id,
      details: { reason: validated.reason },
    } as any);

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to start impersonation' };
  }
}

export async function endImpersonate(input: EndImpersonateInput): Promise<ActionResult<{ success: true }>> {
  try {
    const perms = await requireSuperAdmin();
    const validated = endImpersonateSchema.parse(input);

    const supabase = await createClient();

    // Verify session belongs to current admin
    const { data: session } = await supabase
      .from('impersonate_sessions')
      .select('admin_user_id')
      .eq('id', validated.session_id)
      .single();

    if (!session || (session as any).admin_user_id !== perms.userId) {
      throw new Error('Forbidden - impersonation session not found or access denied');
    }

    const { error } = await (supabase
      .from('impersonate_sessions') as any)
      .update({ ended_at: new Date().toISOString() })
      .eq('id', validated.session_id);

    if (error) throw new Error(error.message);

    return { data: { success: true }, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to end impersonation' };
  }
}

// =============================================================================
// AUDIT LOGS
// =============================================================================

export async function queryAuditLogs(input: QueryAuditLogsInput): Promise<ActionResult<AuditLog[]>> {
  try {
    const perms = await requireAuth();
    const validated = queryAuditLogsSchema.parse(input);

    // Super admins can query all logs, org owners can query their org logs
    if (!perms.isSuperAdmin && !perms.isOrgOwner) {
      throw new Error('Forbidden - insufficient permissions to view audit logs');
    }

    const supabase = await createClient();
    let query = supabase.from('audit_logs').select('*');

    // Org owners can only see their org's logs
    if (!perms.isSuperAdmin && perms.organizationId) {
      query = query.eq('organization_id', perms.organizationId);
    }

    if (validated.user_id) {
      query = query.eq('user_id', validated.user_id);
    }

    if (validated.organization_id) {
      query = query.eq('organization_id', validated.organization_id);
    }

    if (validated.action) {
      query = query.eq('action', validated.action);
    }

    if (validated.entity_type) {
      query = query.eq('entity_type', validated.entity_type);
    }

    if (validated.start_date) {
      query = query.gte('created_at', validated.start_date);
    }

    if (validated.end_date) {
      query = query.lte('created_at', validated.end_date);
    }

    query = query.order('created_at', { ascending: false });

    if (validated.limit) {
      query = query.limit(validated.limit);
    }

    if (validated.offset) {
      query = query.range(validated.offset, validated.offset + validated.limit - 1);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to query audit logs' };
  }
}
