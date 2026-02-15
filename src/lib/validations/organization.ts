/**
 * Validation schemas for organization-related entities
 * Uses Zod for runtime validation + TypeScript type inference
 */

import { z } from 'zod';

// =============================================================================
// ORGANIZATIONS
// =============================================================================

export const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(255),
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  domain: z.string().email('Invalid domain format').optional().or(z.literal('')),
  logo_url: z.string().url('Invalid logo URL').optional().or(z.literal('')),
  plan: z.enum(['FREE', 'PRO', 'BUSINESS', 'ENTERPRISE']).default('FREE'),
  seats: z.number().int().min(1, 'Must have at least 1 seat').default(1),
  billing_email: z.string().email('Invalid billing email'),
});

export const updateOrganizationSchema = createOrganizationSchema.partial().extend({
  id: z.string().uuid(),
});

export const updateOrganizationSettingsSchema = z.object({
  id: z.string().uuid(),
  settings: z.record(z.unknown()),
});

export const updateOrganizationBillingSchema = z.object({
  id: z.string().uuid(),
  billing_email: z.string().email('Invalid billing email').optional(),
  plan: z.enum(['FREE', 'PRO', 'BUSINESS', 'ENTERPRISE']).optional(),
  seats: z.number().int().min(1).optional(),
  stripe_customer_id: z.string().optional(),
  stripe_subscription_id: z.string().optional(),
  subscription_status: z.enum(['active', 'past_due', 'canceled', 'trialing', 'paused']).optional(),
  trial_ends_at: z.string().datetime().optional().or(z.literal('')),
});

// =============================================================================
// ORGANIZATION MEMBERS
// =============================================================================

export const createOrganizationMemberSchema = z.object({
  organization_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: z.enum(['owner', 'admin', 'member']).default('member'),
  is_admin: z.boolean().default(false),
});

export const updateOrganizationMemberSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(['owner', 'admin', 'member']).optional(),
  is_admin: z.boolean().optional(),
});

export const removeOrganizationMemberSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
});

// =============================================================================
// ORGANIZATION INVITES
// =============================================================================

export const createOrganizationInviteSchema = z.object({
  organization_id: z.string().uuid(),
  email: z.string().email('Invalid email address'),
  role: z.enum(['owner', 'admin', 'member']).default('member'),
  invited_by: z.string().uuid(),
});

export const acceptOrganizationInviteSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export const revokeOrganizationInviteSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type UpdateOrganizationSettingsInput = z.infer<typeof updateOrganizationSettingsSchema>;
export type UpdateOrganizationBillingInput = z.infer<typeof updateOrganizationBillingSchema>;
export type CreateOrganizationMemberInput = z.infer<typeof createOrganizationMemberSchema>;
export type UpdateOrganizationMemberInput = z.infer<typeof updateOrganizationMemberSchema>;
export type RemoveOrganizationMemberInput = z.infer<typeof removeOrganizationMemberSchema>;
export type CreateOrganizationInviteInput = z.infer<typeof createOrganizationInviteSchema>;
export type AcceptOrganizationInviteInput = z.infer<typeof acceptOrganizationInviteSchema>;
export type RevokeOrganizationInviteInput = z.infer<typeof revokeOrganizationInviteSchema>;
