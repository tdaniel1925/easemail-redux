/**
 * Server actions for organization management
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAuth, requireOrgOwner, requireOrgAdmin, requireSuperAdmin } from '@/lib/auth/permissions';
import { emitEvent } from '@/lib/events';
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  updateOrganizationSettingsSchema,
  updateOrganizationBillingSchema,
  createOrganizationMemberSchema,
  updateOrganizationMemberSchema,
  removeOrganizationMemberSchema,
  createOrganizationInviteSchema,
  acceptOrganizationInviteSchema,
  revokeOrganizationInviteSchema,
  type CreateOrganizationInput,
  type UpdateOrganizationInput,
  type UpdateOrganizationSettingsInput,
  type UpdateOrganizationBillingInput,
  type CreateOrganizationMemberInput,
  type UpdateOrganizationMemberInput,
  type RemoveOrganizationMemberInput,
  type CreateOrganizationInviteInput,
  type AcceptOrganizationInviteInput,
  type RevokeOrganizationInviteInput,
} from '@/lib/validations';
import type { Organization, OrganizationMember, OrganizationInvite } from '@/types/database';

type ActionResult<T> = { data: T; error: null } | { data: null; error: string };

// =============================================================================
// ORGANIZATIONS
// =============================================================================

export async function createOrganization(input: CreateOrganizationInput): Promise<ActionResult<Organization>> {
  try {
    const perms = await requireAuth();
    const validated = createOrganizationSchema.parse(input);

    const supabase = await createClient();

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        ...validated,
        seats_used: 1,
      } as any)
      .select()
      .single();

    if (orgError) throw new Error(orgError.message);

    // Add creator as owner
    const { error: memberError } = await supabase.from('organization_members').insert({
      organization_id: (org as any).id,
      user_id: perms.userId,
      role: 'owner',
      is_admin: true,
    } as any);

    if (memberError) throw new Error(memberError.message);

    // Update user role to ORG_OWNER
    const { error: roleError } = await (supabase.from('users') as any).update({ role: 'ORG_OWNER' }).eq('id', perms.userId);

    if (roleError) throw new Error(roleError.message);

    // Emit event
    await emitEvent({
      eventType: 'org.created',
      entityType: 'organization',
      entityId: (org as any).id,
      actorId: perms.userId,
      organizationId: (org as any).id,
      payload: {
        name: validated.name,
        slug: validated.slug,
        plan: (org as any).plan,
      },
      metadata: { source: 'ui' },
    });

    return { data: org, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to create organization' };
  }
}

export async function getOrganization(id: string): Promise<ActionResult<Organization>> {
  try {
    await requireAuth();

    const supabase = await createClient();
    const { data, error } = await supabase.from('organizations').select('*').eq('id', id).single();

    if (error) throw new Error(error.message);

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to get organization' };
  }
}

export async function getMyOrganization(): Promise<ActionResult<Organization>> {
  try {
    const perms = await requireAuth();
    if (!perms.organizationId) {
      throw new Error('Not a member of any organization');
    }

    const supabase = await createClient();
    const { data, error } = await supabase.from('organizations').select('*').eq('id', perms.organizationId).single();

    if (error) throw new Error(error.message);

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to get organization' };
  }
}

export async function updateOrganization(input: UpdateOrganizationInput): Promise<ActionResult<Organization>> {
  try {
    const perms = await requireAuth();
    const validated = updateOrganizationSchema.parse(input);
    await requireOrgOwner(validated.id);

    const supabase = await createClient();
    const { data, error } = await (supabase
      .from('organizations') as any)
      .update(validated)
      .eq('id', validated.id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Emit event
    await emitEvent({
      eventType: 'org.updated',
      entityType: 'organization',
      entityId: validated.id,
      actorId: perms.userId,
      organizationId: validated.id,
      payload: validated,
      metadata: { source: 'ui' },
    });

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to update organization' };
  }
}

export async function updateOrganizationSettings(
  input: UpdateOrganizationSettingsInput
): Promise<ActionResult<Organization>> {
  try {
    const validated = updateOrganizationSettingsSchema.parse(input);
    await requireOrgAdmin(validated.id);

    const supabase = await createClient();
    const { data, error } = await (supabase
      .from('organizations') as any)
      .update({ settings: validated.settings })
      .eq('id', validated.id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to update organization settings' };
  }
}

export async function updateOrganizationBilling(
  input: UpdateOrganizationBillingInput
): Promise<ActionResult<Organization>> {
  try {
    const validated = updateOrganizationBillingSchema.parse(input);
    await requireOrgOwner(validated.id);

    const supabase = await createClient();
    const { data, error } = await (supabase.from('organizations') as any).update(validated).eq('id', validated.id).select().single();

    if (error) throw new Error(error.message);

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to update organization billing' };
  }
}

export async function deleteOrganization(id: string): Promise<ActionResult<{ success: true }>> {
  try {
    const perms = await requireAuth();
    await requireOrgOwner(id);

    const supabase = await createClient();
    const { error } = await supabase.from('organizations').delete().eq('id', id);

    if (error) throw new Error(error.message);

    // Emit event
    await emitEvent({
      eventType: 'org.deleted',
      entityType: 'organization',
      entityId: id,
      actorId: perms.userId,
      organizationId: id,
      metadata: { source: 'ui' },
    });

    return { data: { success: true }, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to delete organization' };
  }
}

// =============================================================================
// ORGANIZATION MEMBERS
// =============================================================================

export async function getOrganizationMembers(organizationId: string): Promise<ActionResult<OrganizationMember[]>> {
  try {
    await requireAuth();

    const supabase = await createClient();
    const { data, error } = await supabase.from('organization_members').select('*').eq('organization_id', organizationId);

    if (error) throw new Error(error.message);

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to get organization members' };
  }
}

export async function addOrganizationMember(
  input: CreateOrganizationMemberInput
): Promise<ActionResult<OrganizationMember>> {
  try {
    const perms = await requireAuth();
    const validated = createOrganizationMemberSchema.parse(input);
    await requireOrgAdmin(validated.organization_id);

    const supabase = await createClient();

    // Check if organization has available seats
    const { data: org } = await supabase
      .from('organizations')
      .select('seats, seats_used')
      .eq('id', validated.organization_id)
      .single();

    if (org && (org as any).seats_used >= (org as any).seats) {
      throw new Error('No available seats in organization');
    }

    // Get user email for event payload
    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('id', validated.user_id)
      .single();

    // Add member
    const { data, error } = await supabase.from('organization_members').insert(validated as any).select().single();

    if (error) throw new Error(error.message);

    // Increment seats_used
    await (supabase
      .from('organizations') as any)
      .update({ seats_used: ((org as any)?.seats_used || 0) + 1 })
      .eq('id', validated.organization_id);

    // Update user role
    await (supabase.from('users') as any).update({ role: 'ORG_MEMBER' }).eq('id', validated.user_id);

    // Emit event
    await emitEvent({
      eventType: 'org.member_added',
      entityType: 'organization_member',
      entityId: (data as any).id,
      actorId: perms.userId,
      organizationId: validated.organization_id,
      payload: {
        user_id: validated.user_id,
        user_email: (user as any)?.email,
        role: validated.role,
        invited_by: perms.userId,
      },
      metadata: { source: 'ui' },
    });

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to add organization member' };
  }
}

export async function updateOrganizationMember(
  input: UpdateOrganizationMemberInput
): Promise<ActionResult<OrganizationMember>> {
  try {
    const validated = updateOrganizationMemberSchema.parse(input);

    const supabase = await createClient();

    // Get member to check org ID
    const { data: member } = await supabase.from('organization_members').select('*').eq('id', validated.id).single();

    if (!member) throw new Error('Member not found');

    await requireOrgAdmin((member as any).organization_id);

    const { data, error} = await (supabase
      .from('organization_members') as any)
      .update(validated)
      .eq('id', validated.id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to update organization member' };
  }
}

export async function removeOrganizationMember(
  input: RemoveOrganizationMemberInput
): Promise<ActionResult<{ success: true }>> {
  try {
    const perms = await requireAuth();
    const validated = removeOrganizationMemberSchema.parse(input);
    await requireOrgAdmin(validated.organization_id);

    const supabase = await createClient();

    // Cannot remove owner, get member details for event
    const { data: member } = await supabase.from('organization_members').select('role, user_id').eq('id', validated.id).single();

    if ((member as any)?.role === 'owner') {
      throw new Error('Cannot remove organization owner');
    }

    // Get user email for event payload
    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('id', (member as any)?.user_id)
      .single();

    const { error } = await supabase.from('organization_members').delete().eq('id', validated.id);

    if (error) throw new Error(error.message);

    // Decrement seats_used
    const { data: org } = await supabase
      .from('organizations')
      .select('seats_used')
      .eq('id', validated.organization_id)
      .single();

    await (supabase
      .from('organizations') as any)
      .update({ seats_used: Math.max(0, ((org as any)?.seats_used || 1) - 1) })
      .eq('id', validated.organization_id);

    // Emit event
    await emitEvent({
      eventType: 'org.member_removed',
      entityType: 'organization_member',
      entityId: validated.id,
      actorId: perms.userId,
      organizationId: validated.organization_id,
      payload: {
        user_id: (member as any)?.user_id,
        user_email: (user as any)?.email,
        removed_by: perms.userId,
      },
      metadata: { source: 'ui' },
    });

    return { data: { success: true }, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to remove organization member' };
  }
}

// =============================================================================
// ORGANIZATION INVITES
// =============================================================================

export async function getOrganizationInvites(organizationId: string): Promise<ActionResult<OrganizationInvite[]>> {
  try {
    await requireAuth();

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('organization_invites')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'pending');

    if (error) throw new Error(error.message);

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to get organization invites' };
  }
}

export async function createOrganizationInvite(
  input: CreateOrganizationInviteInput
): Promise<ActionResult<OrganizationInvite>> {
  try {
    const perms = await requireAuth();
    const validated = createOrganizationInviteSchema.parse(input);
    await requireOrgAdmin(validated.organization_id);

    const supabase = await createClient();

    // Generate token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const { data, error } = await supabase
      .from('organization_invites')
      .insert({
        ...validated,
        token,
        expires_at: expiresAt.toISOString(),
      } as any)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Emit event
    await emitEvent({
      eventType: 'invite.created',
      entityType: 'organization_invite',
      entityId: (data as any).id,
      actorId: perms.userId,
      organizationId: validated.organization_id,
      payload: {
        email: validated.email,
        role: validated.role,
        expires_at: expiresAt.toISOString(),
      },
      metadata: { source: 'ui' },
    });

    // TODO: Send invitation email via Resend (Stage 4)

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to create organization invite' };
  }
}

export async function acceptOrganizationInvite(
  input: AcceptOrganizationInviteInput
): Promise<ActionResult<{ success: true }>> {
  try {
    const validated = acceptOrganizationInviteSchema.parse(input);
    const perms = await requireAuth();

    const supabase = await createClient();

    // Get invite
    const { data: invite } = await supabase
      .from('organization_invites')
      .select('*')
      .eq('token', validated.token)
      .eq('status', 'pending')
      .single();

    if (!invite) throw new Error('Invalid or expired invite');

    // Check expiry
    if (new Date((invite as any).expires_at) < new Date()) {
      throw new Error('Invite has expired');
    }

    // Get user email for event
    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('id', perms.userId)
      .single();

    // Add user to organization
    const { error: memberError } = await supabase.from('organization_members').insert({
      organization_id: (invite as any).organization_id,
      user_id: perms.userId,
      role: (invite as any).role,
    } as any);

    if (memberError) throw new Error(memberError.message);

    // Update invite status
    await (supabase
      .from('organization_invites') as any)
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', (invite as any).id);

    // Update user role
    await (supabase.from('users') as any).update({ role: 'ORG_MEMBER' }).eq('id', perms.userId);

    // Emit invite accepted event
    await emitEvent({
      eventType: 'invite.accepted',
      entityType: 'organization_invite',
      entityId: (invite as any).id,
      actorId: perms.userId,
      organizationId: (invite as any).organization_id,
      payload: {
        email: (invite as any).email,
        role: (invite as any).role,
      },
      metadata: { source: 'ui' },
    });

    // Emit member added event
    await emitEvent({
      eventType: 'org.member_added',
      entityType: 'organization_member',
      entityId: perms.userId,
      actorId: perms.userId,
      organizationId: (invite as any).organization_id,
      payload: {
        user_id: perms.userId,
        user_email: (user as any)?.email,
        role: (invite as any).role,
        invited_by: (invite as any).invited_by,
      },
      metadata: { source: 'ui' },
    });

    return { data: { success: true }, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to accept organization invite' };
  }
}

export async function revokeOrganizationInvite(
  input: RevokeOrganizationInviteInput
): Promise<ActionResult<{ success: true }>> {
  try {
    const perms = await requireAuth();
    const validated = revokeOrganizationInviteSchema.parse(input);
    await requireOrgAdmin(validated.organization_id);

    const supabase = await createClient();

    // Get invite details for event
    const { data: invite } = await supabase
      .from('organization_invites')
      .select('email, role')
      .eq('id', validated.id)
      .single();

    const { error } = await (supabase
      .from('organization_invites') as any)
      .update({ status: 'revoked' })
      .eq('id', validated.id)
      .eq('organization_id', validated.organization_id);

    if (error) throw new Error(error.message);

    // Emit event
    await emitEvent({
      eventType: 'invite.revoked',
      entityType: 'organization_invite',
      entityId: validated.id,
      actorId: perms.userId,
      organizationId: validated.organization_id,
      payload: {
        email: (invite as any)?.email,
        role: (invite as any)?.role,
      },
      metadata: { source: 'ui' },
    });

    return { data: { success: true }, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to revoke organization invite' };
  }
}
