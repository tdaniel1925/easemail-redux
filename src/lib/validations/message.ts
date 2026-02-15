/**
 * Validation schemas for message-related entities
 */

import { z } from 'zod';

// Recipient schema (reusable)
const recipientSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});

// =============================================================================
// MESSAGES (Read-only - synced from providers)
// =============================================================================

export const updateMessageSchema = z.object({
  id: z.string().uuid(),
  is_unread: z.boolean().optional(),
  is_starred: z.boolean().optional(),
  folder_type: z
    .enum(['inbox', 'sent', 'drafts', 'trash', 'spam', 'archive', 'starred', 'important', 'snoozed', 'custom'])
    .optional(),
});

export const deleteMessageSchema = z.object({
  id: z.string().uuid(),
});

export const bulkUpdateMessagesSchema = z.object({
  message_ids: z.array(z.string().uuid()).min(1, 'At least one message required'),
  updates: z.object({
    is_unread: z.boolean().optional(),
    is_starred: z.boolean().optional(),
    folder_type: z
      .enum(['inbox', 'sent', 'drafts', 'trash', 'spam', 'archive', 'starred', 'important', 'snoozed', 'custom'])
      .optional(),
  }),
});

// =============================================================================
// DRAFTS
// =============================================================================

export const createDraftSchema = z.object({
  email_account_id: z.string().uuid().optional(),
  to_recipients: z.array(recipientSchema).default([]),
  cc_recipients: z.array(recipientSchema).default([]),
  bcc_recipients: z.array(recipientSchema).default([]),
  subject: z.string().max(998).optional().or(z.literal('')),
  body_html: z.string().optional(),
  body_text: z.string().optional(),
  reply_to_message_id: z.string().optional(),
  forward_from_id: z.string().optional(),
  attachments: z.array(z.record(z.unknown())).default([]),
  auto_saved: z.boolean().default(true),
});

export const updateDraftSchema = createDraftSchema.partial().extend({
  id: z.string().uuid(),
});

export const deleteDraftSchema = z.object({
  id: z.string().uuid(),
});

// =============================================================================
// SIGNATURES
// =============================================================================

export const createSignatureSchema = z.object({
  name: z.string().min(1, 'Signature name is required').max(255),
  content_html: z.string().min(1, 'Signature content is required'),
  content_text: z.string().optional(),
  is_default: z.boolean().default(false),
  email_account_id: z.string().uuid().optional(),
  sort_order: z.number().int().default(0),
});

export const updateSignatureSchema = createSignatureSchema.partial().extend({
  id: z.string().uuid(),
});

export const deleteSignatureSchema = z.object({
  id: z.string().uuid(),
});

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================

export const createEmailTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(255),
  subject: z.string().max(998).optional(),
  body_html: z.string().min(1, 'Template body is required'),
  body_text: z.string().optional(),
  category: z.string().max(100).optional(),
  variables: z.array(z.string()).default([]),
});

export const updateEmailTemplateSchema = createEmailTemplateSchema.partial().extend({
  id: z.string().uuid(),
});

export const deleteEmailTemplateSchema = z.object({
  id: z.string().uuid(),
});

// =============================================================================
// SCHEDULED EMAILS
// =============================================================================

export const createScheduledEmailSchema = z.object({
  email_account_id: z.string().uuid(),
  to_recipients: z.array(recipientSchema).min(1, 'At least one recipient required'),
  cc_recipients: z.array(recipientSchema).default([]),
  bcc_recipients: z.array(recipientSchema).default([]),
  subject: z.string().max(998).optional(),
  body_html: z.string().min(1, 'Email body is required'),
  attachments: z.array(z.record(z.unknown())).default([]),
  scheduled_for: z.string().datetime('Invalid schedule date'),
});

export const updateScheduledEmailSchema = createScheduledEmailSchema.partial().extend({
  id: z.string().uuid(),
});

export const cancelScheduledEmailSchema = z.object({
  id: z.string().uuid(),
});

// =============================================================================
// SNOOZED EMAILS
// =============================================================================

export const snoozeEmailSchema = z.object({
  message_id: z.string().uuid(),
  snooze_until: z.string().datetime('Invalid snooze time'),
});

export const unsnoozeEmailSchema = z.object({
  id: z.string().uuid(),
});

// =============================================================================
// EMAIL RULES
// =============================================================================

const ruleConditionSchema = z.object({
  field: z.string(),
  operator: z.string(),
  value: z.unknown(),
});

const ruleActionSchema = z.object({
  type: z.string(),
  params: z.record(z.unknown()),
});

export const createEmailRuleSchema = z.object({
  name: z.string().min(1, 'Rule name is required').max(255),
  is_active: z.boolean().default(true),
  priority: z.number().int().default(0),
  conditions: z.array(ruleConditionSchema).min(1, 'At least one condition required'),
  actions: z.array(ruleActionSchema).min(1, 'At least one action required'),
  match_mode: z.enum(['all', 'any']).default('all'),
});

export const updateEmailRuleSchema = createEmailRuleSchema.partial().extend({
  id: z.string().uuid(),
});

export const deleteEmailRuleSchema = z.object({
  id: z.string().uuid(),
});

// =============================================================================
// CUSTOM LABELS
// =============================================================================

export const createCustomLabelSchema = z.object({
  name: z.string().min(1, 'Label name is required').max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').default('#6366F1'),
  sort_order: z.number().int().default(0),
});

export const updateCustomLabelSchema = createCustomLabelSchema.partial().extend({
  id: z.string().uuid(),
});

export const deleteCustomLabelSchema = z.object({
  id: z.string().uuid(),
});

export const addLabelToMessageSchema = z.object({
  message_id: z.string().uuid(),
  label_id: z.string().uuid(),
});

export const removeLabelFromMessageSchema = z.object({
  message_id: z.string().uuid(),
  label_id: z.string().uuid(),
});

// =============================================================================
// FOLDER MAPPINGS (Read-only - synced from providers)
// =============================================================================

export const updateFolderMappingSchema = z.object({
  id: z.string().uuid(),
  is_active: z.boolean().optional(),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type UpdateMessageInput = z.infer<typeof updateMessageSchema>;
export type DeleteMessageInput = z.infer<typeof deleteMessageSchema>;
export type BulkUpdateMessagesInput = z.infer<typeof bulkUpdateMessagesSchema>;
export type CreateDraftInput = z.infer<typeof createDraftSchema>;
export type UpdateDraftInput = z.infer<typeof updateDraftSchema>;
export type DeleteDraftInput = z.infer<typeof deleteDraftSchema>;
export type CreateSignatureInput = z.infer<typeof createSignatureSchema>;
export type UpdateSignatureInput = z.infer<typeof updateSignatureSchema>;
export type DeleteSignatureInput = z.infer<typeof deleteSignatureSchema>;
export type CreateEmailTemplateInput = z.infer<typeof createEmailTemplateSchema>;
export type UpdateEmailTemplateInput = z.infer<typeof updateEmailTemplateSchema>;
export type DeleteEmailTemplateInput = z.infer<typeof deleteEmailTemplateSchema>;
export type CreateScheduledEmailInput = z.infer<typeof createScheduledEmailSchema>;
export type UpdateScheduledEmailInput = z.infer<typeof updateScheduledEmailSchema>;
export type CancelScheduledEmailInput = z.infer<typeof cancelScheduledEmailSchema>;
export type SnoozeEmailInput = z.infer<typeof snoozeEmailSchema>;
export type UnsnoozeEmailInput = z.infer<typeof unsnoozeEmailSchema>;
export type CreateEmailRuleInput = z.infer<typeof createEmailRuleSchema>;
export type UpdateEmailRuleInput = z.infer<typeof updateEmailRuleSchema>;
export type DeleteEmailRuleInput = z.infer<typeof deleteEmailRuleSchema>;
export type CreateCustomLabelInput = z.infer<typeof createCustomLabelSchema>;
export type UpdateCustomLabelInput = z.infer<typeof updateCustomLabelSchema>;
export type DeleteCustomLabelInput = z.infer<typeof deleteCustomLabelSchema>;
export type AddLabelToMessageInput = z.infer<typeof addLabelToMessageSchema>;
export type RemoveLabelFromMessageInput = z.infer<typeof removeLabelFromMessageSchema>;
export type UpdateFolderMappingInput = z.infer<typeof updateFolderMappingSchema>;
