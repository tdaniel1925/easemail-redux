/**
 * Validation schemas for email account entities
 */

import { z } from 'zod';

// =============================================================================
// EMAIL ACCOUNTS
// =============================================================================

export const createEmailAccountSchema = z.object({
  user_id: z.string().uuid(),
  provider: z.enum(['GOOGLE', 'MICROSOFT']),
  email: z.string().email('Invalid email address'),
  name: z.string().max(255).optional().or(z.literal('')),
  is_primary: z.boolean().default(false),
});

export const updateEmailAccountSchema = z.object({
  id: z.string().uuid(),
  name: z.string().max(255).optional(),
  is_primary: z.boolean().optional(),
  sync_status: z.enum(['idle', 'syncing', 'error', 'paused']).optional(),
  error_message: z.string().optional().or(z.literal('')),
});

export const deleteEmailAccountSchema = z.object({
  id: z.string().uuid(),
});

// =============================================================================
// OAUTH TOKENS (Read-only - managed by OAuth flow)
// =============================================================================

export const refreshTokenSchema = z.object({
  email_account_id: z.string().uuid(),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type CreateEmailAccountInput = z.infer<typeof createEmailAccountSchema>;
export type UpdateEmailAccountInput = z.infer<typeof updateEmailAccountSchema>;
export type DeleteEmailAccountInput = z.infer<typeof deleteEmailAccountSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
