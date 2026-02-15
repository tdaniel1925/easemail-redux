/**
 * Validation schemas for user-related entities
 */

import { z } from 'zod';

// =============================================================================
// USERS
// =============================================================================

export const updateUserProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255).optional(),
  nickname: z.string().max(100).optional().or(z.literal('')),
  avatar_url: z.string().url('Invalid avatar URL').optional().or(z.literal('')),
  timezone: z.string().max(100).default('America/Chicago'),
  locale: z.string().max(10).default('en'),
});

export const updateUserRoleSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(['SUPER_ADMIN', 'ORG_OWNER', 'ORG_MEMBER', 'INDIVIDUAL']),
});

export const enableTwoFactorSchema = z.object({
  secret: z.string().min(1),
  code: z.string().length(6, 'Code must be 6 digits'),
});

export const verifyTwoFactorSchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits'),
});

// =============================================================================
// USER PREFERENCES
// =============================================================================

export const updateUserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  inbox_layout: z.enum(['split', 'full']).optional(),
  sidebar_mode: z.enum(['expanded', 'collapsed']).optional(),
  compose_font: z.string().max(100).optional(),
  compose_font_size: z.number().int().min(10).max(24).optional(),
  notifications_enabled: z.boolean().optional(),
  notification_sound: z.boolean().optional(),
  notification_schedule: z.record(z.unknown()).optional(),
  ai_features_enabled: z.boolean().optional(),
  auto_categorize: z.boolean().optional(),
  reading_pane_position: z.enum(['right', 'bottom', 'off']).optional(),
  conversations_enabled: z.boolean().optional(),
  keyboard_shortcuts: z.boolean().optional(),
  swipe_actions: z.record(z.string()).optional(),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type EnableTwoFactorInput = z.infer<typeof enableTwoFactorSchema>;
export type VerifyTwoFactorInput = z.infer<typeof verifyTwoFactorSchema>;
export type UpdateUserPreferencesInput = z.infer<typeof updateUserPreferencesSchema>;
