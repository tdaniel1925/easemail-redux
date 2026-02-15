// Event system types - Layer 4
// Events are append-only. No updates. No deletes.

export type EventType =
  // User lifecycle
  | 'user.created'
  | 'user.onboarding_completed'
  | 'user.profile_updated'
  | 'user.login'
  | 'user.logout'

  // Email account
  | 'email_account.connected'
  | 'email_account.disconnected'
  | 'email_account.sync_started'
  | 'email_account.sync_completed'
  | 'email_account.sync_error'

  // Token management
  | 'token.refreshed'
  | 'token.refresh_failed'
  | 'token.near_expiry'

  // Messages
  | 'message.received'
  | 'message.sent'
  | 'message.deleted'
  | 'message.read'
  | 'message.unread'
  | 'message.starred'
  | 'message.unstarred'
  | 'message.moved'
  | 'message.labeled'
  | 'message.unlabeled'
  | 'message.archived'

  // Drafts
  | 'draft.created'
  | 'draft.auto_saved'
  | 'draft.updated'
  | 'draft.deleted'

  // Scheduled emails
  | 'scheduled_email.created'
  | 'scheduled_email.due'
  | 'scheduled_email.sent'
  | 'scheduled_email.failed'
  | 'scheduled_email.canceled'

  // Snooze
  | 'snooze.created'
  | 'snooze.expired'
  | 'snooze.canceled'

  // Organization
  | 'org.created'
  | 'org.updated'
  | 'org.deleted'
  | 'org.member_added'
  | 'org.member_removed'
  | 'org.ownership_transferred'

  // Organization invites
  | 'invite.created'
  | 'invite.accepted'
  | 'invite.expired'
  | 'invite.revoked'

  // Billing
  | 'subscription.created'
  | 'subscription.activated'
  | 'subscription.trial_ending'
  | 'subscription.payment_failed'
  | 'subscription.canceled'
  | 'subscription.updated'

  // Contacts
  | 'contact.created'
  | 'contact.updated'
  | 'contact.deleted'
  | 'contact.imported'

  // Labels
  | 'label.created'
  | 'label.updated'
  | 'label.deleted'
  | 'label.applied'
  | 'label.removed'

  // Email rules
  | 'email_rule.created'
  | 'email_rule.updated'
  | 'email_rule.deleted'
  | 'email_rule.applied'

  // Calendar
  | 'calendar_event.created'
  | 'calendar_event.updated'
  | 'calendar_event.deleted'
  | 'calendar_event.rsvp_changed'

  // Signatures
  | 'signature.created'
  | 'signature.updated'
  | 'signature.deleted'

  // Templates
  | 'email_template.created'
  | 'email_template.updated'
  | 'email_template.deleted'
  | 'email_template.used'

  // Admin
  | 'impersonate.started'
  | 'impersonate.ended'

  // Webhooks
  | 'webhook.created'
  | 'webhook.deleted'
  | 'webhook.triggered'
  | 'webhook.failed'

  // API keys
  | 'api_key.created'
  | 'api_key.used'
  | 'api_key.deleted'

  // System
  | 'system_setting.updated'
  | 'notification.created';

export interface Event {
  id: string;
  event_type: EventType;
  entity_type: string;
  entity_id: string | null;
  actor_id: string | null;
  organization_id: string | null;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Payload types for specific events
export interface UserCreatedPayload {
  email: string;
  name?: string;
  role: string;
}

export interface EmailAccountConnectedPayload {
  provider: 'GOOGLE' | 'MICROSOFT';
  email: string;
  is_primary: boolean;
}

export interface MessageReceivedPayload {
  from_email: string;
  subject?: string;
  folder_type: string;
  is_unread: boolean;
}

export interface MessageSentPayload {
  to_recipients: Array<{ email: string; name?: string }>;
  subject?: string;
}

export interface MessageMovedPayload {
  from_folder: string;
  to_folder: string;
}

export interface MessageLabeledPayload {
  label_id: string;
  label_name: string;
}

export interface DraftAutoSavedPayload {
  subject?: string;
  has_recipients: boolean;
}

export interface ScheduledEmailCreatedPayload {
  scheduled_for: string;
  to_recipients: Array<{ email: string; name?: string }>;
  subject?: string;
}

export interface SnoozeCreatedPayload {
  snooze_until: string;
  original_folder_type: string;
}

export interface OrgMemberAddedPayload {
  user_id: string;
  user_email: string;
  role: string;
  invited_by: string;
}

export interface OrgMemberRemovedPayload {
  user_id: string;
  user_email: string;
  removed_by: string;
}

export interface SubscriptionPaymentFailedPayload {
  subscription_id: string;
  amount_cents: number;
  currency: string;
}

export interface EmailRuleAppliedPayload {
  rule_id: string;
  rule_name: string;
  message_id: string;
  actions_executed: string[];
}

export interface CalendarEventCreatedPayload {
  title: string;
  start_time: string;
  end_time: string;
  attendees_count: number;
}

export interface ImpersonateStartedPayload {
  admin_user_id: string;
  target_user_id: string;
  target_user_email: string;
  reason: string;
}

// Metadata structure (contextual info)
export interface EventMetadata {
  source?: 'ui' | 'api' | 'cron' | 'webhook' | 'system';
  ip_address?: string;
  user_agent?: string;
  request_id?: string;
  [key: string]: unknown;
}

// Query filters for event retrieval
export interface EventFilters {
  event_type?: EventType | EventType[];
  entity_type?: string;
  entity_id?: string;
  actor_id?: string;
  organization_id?: string;
  after?: string; // ISO timestamp
  before?: string; // ISO timestamp
  limit?: number;
  cursor?: string; // For pagination
}

// Event query result
export interface EventQueryResult {
  events: Event[];
  nextCursor?: string;
  total?: number;
}
