/**
 * Permission checking utilities
 * Used by server actions to verify user permissions before executing operations
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

type UserRole = 'SUPER_ADMIN' | 'ORG_OWNER' | 'ORG_ADMIN' | 'ORG_MEMBER' | 'INDIVIDUAL';

export interface UserPermissions {
  userId: string;
  role: UserRole;
  isSuperAdmin: boolean;
  organizationId?: string;
  isOrgOwner: boolean;
  isOrgAdmin: boolean;
}

/**
 * Get current user's permissions
 * Returns null if not authenticated
 */
export async function getCurrentUserPermissions(): Promise<UserPermissions | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from('users')
    .select('*, organization_members(organization_id, role, is_admin)')
    .eq('id', user.id)
    .single();

  if (error || !profile) return null;

  const orgMembership = (profile as any).organization_members?.[0];

  return {
    userId: user.id,
    role: (profile as any).role,
    isSuperAdmin: (profile as any).is_super_admin === true,
    organizationId: orgMembership?.organization_id,
    isOrgOwner: orgMembership?.role === 'owner',
    isOrgAdmin: orgMembership?.is_admin === true || orgMembership?.role === 'owner',
  };
}

/**
 * Check if user has permission to perform an action
 */
export async function hasPermission(
  action: 'create' | 'read' | 'update' | 'delete',
  resource: string,
  resourceOwnerId?: string,
  resourceOrgId?: string
): Promise<boolean> {
  const perms = await getCurrentUserPermissions();
  if (!perms) return false;

  // Super admins can do everything
  if (perms.isSuperAdmin) return true;

  // Check resource-specific permissions
  switch (resource) {
    // Own data only
    case 'user_profile':
    case 'user_preferences':
    case 'email_account':
    case 'message':
    case 'draft':
    case 'signature':
    case 'email_template':
    case 'scheduled_email':
    case 'snoozed_email':
    case 'email_rule':
    case 'custom_label':
    case 'contact':
    case 'priority_sender':
    case 'sender_group':
    case 'webhook':
    case 'api_key':
      return resourceOwnerId === perms.userId;

    // Organization-scoped
    case 'organization':
      if (action === 'read') return perms.organizationId === resourceOrgId;
      if (action === 'update' || action === 'delete') return perms.isOrgOwner && perms.organizationId === resourceOrgId;
      return false;

    case 'organization_member':
      if (action === 'read') return perms.organizationId === resourceOrgId;
      if (action === 'create' || action === 'delete') return perms.isOrgAdmin && perms.organizationId === resourceOrgId;
      return false;

    case 'organization_invite':
      if (action === 'read') return perms.organizationId === resourceOrgId;
      if (action === 'create' || action === 'delete') return perms.isOrgAdmin && perms.organizationId === resourceOrgId;
      return false;

    // Billing (owner only)
    case 'subscription':
    case 'payment_method':
      if (action === 'read') return perms.isOrgOwner || resourceOwnerId === perms.userId;
      return perms.isOrgOwner && perms.organizationId === resourceOrgId;

    case 'invoice':
      return perms.isOrgOwner || resourceOwnerId === perms.userId;

    // System (super admin only)
    case 'system_setting':
    case 'impersonate_session':
      return perms.isSuperAdmin;

    case 'audit_log':
      if (action === 'read' && perms.isOrgOwner) return true;
      return perms.isSuperAdmin;

    // User management (super admin only for role changes)
    case 'user_role':
      return perms.isSuperAdmin;

    // Enterprise leads (anyone can create, only super admin can read/update)
    case 'enterprise_lead':
      if (action === 'create') return true;
      return perms.isSuperAdmin;

    // Notifications (own only)
    case 'notification':
      return resourceOwnerId === perms.userId;

    default:
      return false;
  }
}

/**
 * Require user to be authenticated
 * Throws error if not authenticated
 */
export async function requireAuth(): Promise<UserPermissions> {
  const perms = await getCurrentUserPermissions();
  if (!perms) {
    throw new Error('Unauthorized - authentication required');
  }
  return perms;
}

/**
 * Require user to be super admin
 * Throws error if not super admin
 */
export async function requireSuperAdmin(): Promise<UserPermissions> {
  const perms = await requireAuth();
  if (!perms.isSuperAdmin) {
    throw new Error('Forbidden - super admin access required');
  }
  return perms;
}

/**
 * Require user to be org owner
 * Throws error if not org owner
 */
export async function requireOrgOwner(organizationId: string): Promise<UserPermissions> {
  const perms = await requireAuth();
  if (!perms.isOrgOwner || perms.organizationId !== organizationId) {
    throw new Error('Forbidden - organization owner access required');
  }
  return perms;
}

/**
 * Require user to be org admin
 * Throws error if not org admin
 */
export async function requireOrgAdmin(organizationId: string): Promise<UserPermissions> {
  const perms = await requireAuth();
  if (!perms.isOrgAdmin || perms.organizationId !== organizationId) {
    throw new Error('Forbidden - organization admin access required');
  }
  return perms;
}
