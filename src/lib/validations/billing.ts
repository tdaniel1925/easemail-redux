/**
 * Validation schemas for billing and subscription entities
 */

import { z } from 'zod';

// =============================================================================
// SUBSCRIPTIONS (Managed by Stripe webhooks, but allow some updates)
// =============================================================================

export const updateSubscriptionSchema = z.object({
  id: z.string().uuid(),
  cancel_at: z.string().datetime().optional().or(z.literal('')),
});

export const createCheckoutSessionSchema = z.object({
  organization_id: z.string().uuid().optional(),
  plan: z.enum(['PRO', 'BUSINESS', 'ENTERPRISE']),
  billing_interval: z.enum(['monthly', 'annual']).default('monthly'),
  seats: z.number().int().min(1).default(1),
  success_url: z.string().url(),
  cancel_url: z.string().url(),
});

export const createPortalSessionSchema = z.object({
  organization_id: z.string().uuid().optional(),
  return_url: z.string().url(),
});

// =============================================================================
// PAYMENT METHODS (Managed by Stripe, read-only from our side)
// =============================================================================

export const deletePaymentMethodSchema = z.object({
  id: z.string().uuid(),
});

export const setDefaultPaymentMethodSchema = z.object({
  id: z.string().uuid(),
});

// =============================================================================
// INVOICES (Read-only - managed by Stripe)
// =============================================================================

// No create/update schemas - invoices are managed by Stripe

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
export type CreateCheckoutSessionInput = z.infer<typeof createCheckoutSessionSchema>;
export type CreatePortalSessionInput = z.infer<typeof createPortalSessionSchema>;
export type DeletePaymentMethodInput = z.infer<typeof deletePaymentMethodSchema>;
export type SetDefaultPaymentMethodInput = z.infer<typeof setDefaultPaymentMethodSchema>;
