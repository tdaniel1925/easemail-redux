/**
 * Validation schemas for contact and calendar entities
 */

import { z } from 'zod';

// =============================================================================
// CONTACTS
// =============================================================================

export const createContactSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  company: z.string().max(255).optional(),
  job_title: z.string().max(255).optional(),
  avatar_url: z.string().url('Invalid avatar URL').optional().or(z.literal('')),
  notes: z.string().optional(),
  is_favorite: z.boolean().default(false),
  is_priority_sender: z.boolean().default(false),
  source: z.enum(['manual', 'auto', 'import']).default('manual'),
  metadata: z.record(z.unknown()).default({}),
});

export const updateContactSchema = createContactSchema.partial().extend({
  id: z.string().uuid(),
});

export const deleteContactSchema = z.object({
  id: z.string().uuid(),
});

export const importContactsSchema = z.object({
  contacts: z.array(createContactSchema).min(1, 'At least one contact required'),
});

// =============================================================================
// PRIORITY SENDERS
// =============================================================================

export const createPrioritySenderSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().max(255).optional(),
  is_blocked: z.boolean().default(false),
});

export const updatePrioritySenderSchema = z.object({
  id: z.string().uuid(),
  is_blocked: z.boolean().optional(),
});

export const deletePrioritySenderSchema = z.object({
  id: z.string().uuid(),
});

// =============================================================================
// SENDER GROUPS
// =============================================================================

export const createSenderGroupSchema = z.object({
  sender_email: z.string().email('Invalid sender email'),
  group_name: z.string().max(255).optional(),
  is_grouped: z.boolean().default(true),
});

export const updateSenderGroupSchema = z.object({
  id: z.string().uuid(),
  is_grouped: z.boolean(),
});

export const deleteSenderGroupSchema = z.object({
  id: z.string().uuid(),
});

// =============================================================================
// CALENDAR EVENTS (Read-only - synced from providers, but can update RSVP)
// =============================================================================

export const updateCalendarEventRsvpSchema = z.object({
  id: z.string().uuid(),
  rsvp_status: z.enum(['accepted', 'declined', 'tentative', 'none']),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type DeleteContactInput = z.infer<typeof deleteContactSchema>;
export type ImportContactsInput = z.infer<typeof importContactsSchema>;
export type CreatePrioritySenderInput = z.infer<typeof createPrioritySenderSchema>;
export type UpdatePrioritySenderInput = z.infer<typeof updatePrioritySenderSchema>;
export type DeletePrioritySenderInput = z.infer<typeof deletePrioritySenderSchema>;
export type CreateSenderGroupInput = z.infer<typeof createSenderGroupSchema>;
export type UpdateSenderGroupInput = z.infer<typeof updateSenderGroupSchema>;
export type DeleteSenderGroupInput = z.infer<typeof deleteSenderGroupSchema>;
export type UpdateCalendarEventRsvpInput = z.infer<typeof updateCalendarEventRsvpSchema>;
