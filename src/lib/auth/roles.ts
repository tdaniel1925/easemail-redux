import { createClient } from '@/lib/supabase/server';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export type UserRole = 'SUPER_ADMIN' | 'ORG_OWNER' | 'ORG_MEMBER' | 'INDIVIDUAL';

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  is_super_admin: boolean;
  organization_id: string | null;
  org_role: string | null;
  is_org_admin: boolean;
}

export async function getUserProfile(userId?: string): Promise<UserProfile | null> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && !userId) {
    return null;
  }

  const targetUserId = userId || user!.id;

  const { data: profile, error } = await supabase
    .from('users')
    .select('id, email, name, role, is_super_admin')
    .eq('id', targetUserId)
    .single();

  if (error || !profile) {
    return null;
  }

  // Get organization membership separately
  const { data: orgMembership } = await supabase
    .from('organization_members')
    .select('organization_id, role, is_admin')
    .eq('user_id', targetUserId)
    .limit(1)
    .maybeSingle();

  return {
    id: (profile as any).id,
    email: (profile as any).email,
    name: (profile as any).name,
    role: (profile as any).role as UserRole,
    is_super_admin: (profile as any).is_super_admin,
    organization_id: (orgMembership as any)?.organization_id || null,
    org_role: (orgMembership as any)?.role || null,
    is_org_admin: (orgMembership as any)?.is_admin || (orgMembership as any)?.role === 'owner' || false,
  };
}

export async function requireAuth(): Promise<UserProfile> {
  const profile = await getUserProfile();

  if (!profile) {
    throw new Error('Unauthorized');
  }

  return profile;
}

export async function requireSuperAdmin(): Promise<UserProfile> {
  const profile = await requireAuth();

  if (!profile.is_super_admin) {
    throw new Error('Forbidden: Super admin required');
  }

  return profile;
}

export async function requireOrgOwner(organizationId: string): Promise<UserProfile> {
  const profile = await requireAuth();

  if (!profile.is_super_admin) {
    if (profile.organization_id !== organizationId || profile.org_role !== 'owner') {
      throw new Error('Forbidden: Organization owner required');
    }
  }

  return profile;
}

export async function requireOrgAdmin(organizationId: string): Promise<UserProfile> {
  const profile = await requireAuth();

  if (!profile.is_super_admin) {
    if (profile.organization_id !== organizationId || !profile.is_org_admin) {
      throw new Error('Forbidden: Organization admin required');
    }
  }

  return profile;
}

export async function requireOrgMember(organizationId: string): Promise<UserProfile> {
  const profile = await requireAuth();

  if (!profile.is_super_admin) {
    if (profile.organization_id !== organizationId) {
      throw new Error('Forbidden: Organization member required');
    }
  }

  return profile;
}

export function isSuperAdmin(profile: UserProfile): boolean {
  return profile.is_super_admin;
}

export function isOrgOwner(profile: UserProfile, organizationId: string): boolean {
  return profile.is_super_admin || (
    profile.organization_id === organizationId &&
    profile.org_role === 'owner'
  );
}

export function isOrgAdmin(profile: UserProfile, organizationId: string): boolean {
  return profile.is_super_admin || (
    profile.organization_id === organizationId &&
    profile.is_org_admin
  );
}

export function isOrgMember(profile: UserProfile, organizationId: string): boolean {
  return profile.is_super_admin || profile.organization_id === organizationId;
}
