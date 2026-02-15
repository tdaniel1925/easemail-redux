/**
 * Validation schemas for system and admin entities
 */

import { z } from 'zod';

// =============================================================================
// SYSTEM SETTINGS (Super admin only)
// =============================================================================

export const createSystemSettingSchema = z.object({
  key: z.string().min(1, 'Setting key is required').max(255),
  value: z.record(z.unknown()),
  description: z.string().optional(),
});

export const updateSystemSettingSchema = z.object({
  id: z.string().uuid(),
  value: z.record(z.unknown()),
  description: z.string().optional(),
});

export const deleteSystemSettingSchema = z.object({
  id: z.string().uuid(),
});

// =============================================================================
// IMPERSONATE SESSIONS (Super admin only)
// =============================================================================

export const startImpersonateSchema = z.object({
  target_user_id: z.string().uuid(),
  reason: z.string().min(1, 'Reason is required').max(500),
});

export const endImpersonateSchema = z.object({
  session_id: z.string().uuid(),
});

// =============================================================================
// AUDIT LOGS (Read-only - created by system)
// =============================================================================

export const queryAuditLogsSchema = z.object({
  user_id: z.string().uuid().optional(),
  organization_id: z.string().uuid().optional(),
  action: z
    .enum(['create', 'read', 'update', 'delete', 'login', 'logout', 'impersonate', 'export', 'bulk_action'])
    .optional(),
  entity_type: z.string().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(1000).default(100),
  offset: z.number().int().min(0).default(0),
});

// =============================================================================
// WEBHOOKS
// =============================================================================

export const createWebhookSchema = z.object({
  url: z.string().url('Invalid webhook URL'),
  events: z.array(z.string()).min(1, 'At least one event required'),
  secret: z.string().min(16, 'Secret must be at least 16 characters'),
  is_active: z.boolean().default(true),
});

export const updateWebhookSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url('Invalid webhook URL').optional(),
  events: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
});

export const deleteWebhookSchema = z.object({
  id: z.string().uuid(),
});

// =============================================================================
// API KEYS
// =============================================================================

export const createApiKeySchema = z.object({
  name: z.string().min(1, 'API key name is required').max(255),
  scopes: z.array(z.string()).default(['read']),
  expires_at: z.string().datetime().optional().or(z.literal('')),
});

export const updateApiKeySchema = z.object({
  id: z.string().uuid(),
  name: z.string().max(255).optional(),
  scopes: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
});

export const deleteApiKeySchema = z.object({
  id: z.string().uuid(),
});

// =============================================================================
// ENTERPRISE LEADS (Public form submission)
// =============================================================================

export const createEnterpriseLeadSchema = z.object({
  company_name: z.string().min(1, 'Company name is required').max(255),
  contact_name: z.string().min(1, 'Contact name is required').max(255),
  contact_email: z.string().email('Invalid email address'),
  phone: z.string().max(50).optional(),
  message: z.string().optional(),
  seats_needed: z.number().int().min(1).optional(),
});

export const updateEnterpriseLeadSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['new', 'contacted', 'qualified', 'closed']),
});

// =============================================================================
// NOTIFICATIONS
// =============================================================================

export const createNotificationSchema = z.object({
  user_id: z.string().uuid(),
  type: z.enum(['info', 'warning', 'error', 'success']),
  title: z.string().min(1, 'Title is required').max(255),
  message: z.string().min(1, 'Message is required'),
  link: z.string().url('Invalid link URL').optional().or(z.literal('')),
});

export const markNotificationReadSchema = z.object({
  id: z.string().uuid(),
});

export const deleteNotificationSchema = z.object({
  id: z.string().uuid(),
});

// =============================================================================
// SMS MESSAGES
// =============================================================================

export const sendSmsSchema = z.object({
  to_number: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format (E.164)'),
  body: z.string().min(1, 'Message body is required').max(1600),
});

// =============================================================================
// SPAM REPORTS
// =============================================================================

export const createSpamReportSchema = z.object({
  message_id: z.string().uuid().optional(),
  reported_email: z.string().email('Invalid email address'),
  reason: z.string().optional(),
  auto_detected: z.boolean().default(false),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type CreateSystemSettingInput = z.infer<typeof createSystemSettingSchema>;
export type UpdateSystemSettingInput = z.infer<typeof updateSystemSettingSchema>;
export type DeleteSystemSettingInput = z.infer<typeof deleteSystemSettingSchema>;
export type StartImpersonateInput = z.infer<typeof startImpersonateSchema>;
export type EndImpersonateInput = z.infer<typeof endImpersonateSchema>;
export type QueryAuditLogsInput = z.infer<typeof queryAuditLogsSchema>;
export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>;
export type DeleteWebhookInput = z.infer<typeof deleteWebhookSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type UpdateApiKeyInput = z.infer<typeof updateApiKeySchema>;
export type DeleteApiKeyInput = z.infer<typeof deleteApiKeySchema>;
export type CreateEnterpriseLeadInput = z.infer<typeof createEnterpriseLeadSchema>;
export type UpdateEnterpriseLeadInput = z.infer<typeof updateEnterpriseLeadSchema>;
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type MarkNotificationReadInput = z.infer<typeof markNotificationReadSchema>;
export type DeleteNotificationInput = z.infer<typeof deleteNotificationSchema>;
export type SendSmsInput = z.infer<typeof sendSmsSchema>;
export type CreateSpamReportInput = z.infer<typeof createSpamReportSchema>;
