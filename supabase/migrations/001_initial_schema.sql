-- EaseMail v2 — Initial Schema Migration
-- Generated: 2026-02-14
-- Stage 1: Schema & Types

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE plan_type AS ENUM ('FREE', 'PRO', 'BUSINESS', 'ENTERPRISE');
CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'ORG_OWNER', 'ORG_MEMBER', 'INDIVIDUAL');
CREATE TYPE provider_type AS ENUM ('GOOGLE', 'MICROSOFT');
CREATE TYPE folder_type AS ENUM ('inbox', 'sent', 'drafts', 'trash', 'spam', 'archive', 'starred', 'important', 'snoozed', 'custom');
CREATE TYPE sync_status AS ENUM ('idle', 'syncing', 'error', 'paused');
CREATE TYPE email_status AS ENUM ('draft', 'queued', 'sending', 'sent', 'failed', 'bounced');
CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'trialing', 'paused');
CREATE TYPE invoice_status AS ENUM ('draft', 'open', 'paid', 'void', 'uncollectible');
CREATE TYPE event_rsvp AS ENUM ('accepted', 'declined', 'tentative', 'none');
CREATE TYPE notification_type AS ENUM ('info', 'warning', 'error', 'success');
CREATE TYPE audit_action AS ENUM ('create', 'read', 'update', 'delete', 'login', 'logout', 'impersonate', 'export', 'bulk_action');

-- ============================================================================
-- TABLES
-- ============================================================================

-- Organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  domain TEXT,
  logo_url TEXT,
  plan plan_type DEFAULT 'FREE',
  seats INT DEFAULT 1 CHECK (seats >= 1),
  seats_used INT DEFAULT 0 CHECK (seats_used >= 0 AND seats_used <= seats),
  billing_email TEXT NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status subscription_status DEFAULT 'trialing',
  trial_ends_at TIMESTAMPTZ,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ
);

-- Users (extends auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  nickname TEXT,
  avatar_url TEXT,
  role user_role DEFAULT 'INDIVIDUAL',
  is_super_admin BOOLEAN DEFAULT FALSE,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_step INT DEFAULT 0,
  timezone TEXT DEFAULT 'America/Chicago',
  locale TEXT DEFAULT 'en',
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret TEXT,
  last_login_at TIMESTAMPTZ,
  login_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ
);

-- User Preferences
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'system',
  inbox_layout TEXT DEFAULT 'split',
  sidebar_mode TEXT DEFAULT 'expanded',
  compose_font TEXT DEFAULT 'sans-serif',
  compose_font_size INT DEFAULT 14,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  notification_sound BOOLEAN DEFAULT TRUE,
  notification_schedule JSONB DEFAULT '{"morning":{"enabled":true,"time":"09:00"},"afternoon":{"enabled":false,"time":"13:00"},"evening":{"enabled":true,"time":"18:00"}}',
  ai_features_enabled BOOLEAN DEFAULT TRUE,
  auto_categorize BOOLEAN DEFAULT TRUE,
  reading_pane_position TEXT DEFAULT 'right',
  conversations_enabled BOOLEAN DEFAULT TRUE,
  keyboard_shortcuts BOOLEAN DEFAULT TRUE,
  swipe_actions JSONB DEFAULT '{"left":"archive","right":"delete"}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ
);

-- Organization Members
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  is_admin BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ,
  UNIQUE(organization_id, user_id)
);

-- Organization Invites
CREATE TABLE organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  invited_by UUID NOT NULL REFERENCES users(id),
  token TEXT UNIQUE NOT NULL,
  status invite_status DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ
);

-- Email Accounts
CREATE TABLE email_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider provider_type NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  sync_status sync_status DEFAULT 'idle',
  sync_cursor TEXT,
  last_synced_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ,
  UNIQUE(user_id, email)
);

-- OAuth Tokens (encrypted at rest)
CREATE TABLE oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_account_id UUID NOT NULL UNIQUE REFERENCES email_accounts(id) ON DELETE CASCADE,
  provider provider_type NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  scopes TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_account_id UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
  provider_message_id TEXT NOT NULL,
  provider_thread_id TEXT,
  subject TEXT,
  from_email TEXT NOT NULL,
  from_name TEXT,
  to_recipients JSONB DEFAULT '[]',
  cc_recipients JSONB DEFAULT '[]',
  bcc_recipients JSONB DEFAULT '[]',
  reply_to JSONB DEFAULT '[]',
  body_html TEXT,
  body_text TEXT,
  snippet TEXT,
  folder_type folder_type DEFAULT 'inbox',
  folder_id TEXT,
  is_unread BOOLEAN DEFAULT TRUE,
  is_starred BOOLEAN DEFAULT FALSE,
  is_draft BOOLEAN DEFAULT FALSE,
  has_attachments BOOLEAN DEFAULT FALSE,
  attachments JSONB DEFAULT '[]',
  importance TEXT DEFAULT 'normal',
  categories TEXT[] DEFAULT ARRAY[]::TEXT[],
  message_date TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ,
  UNIQUE(email_account_id, provider_message_id)
);

-- Folder Mappings
CREATE TABLE folder_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_account_id UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
  provider_folder_id TEXT NOT NULL,
  folder_name TEXT NOT NULL,
  folder_type folder_type NOT NULL,
  is_system_folder BOOLEAN DEFAULT FALSE,
  unread_count INT DEFAULT 0,
  total_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ,
  UNIQUE(email_account_id, provider_folder_id)
);

-- Drafts
CREATE TABLE drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_account_id UUID REFERENCES email_accounts(id) ON DELETE SET NULL,
  to_recipients JSONB DEFAULT '[]',
  cc_recipients JSONB DEFAULT '[]',
  bcc_recipients JSONB DEFAULT '[]',
  subject TEXT,
  body_html TEXT,
  body_text TEXT,
  reply_to_message_id TEXT,
  forward_from_id TEXT,
  attachments JSONB DEFAULT '[]',
  auto_saved BOOLEAN DEFAULT TRUE,
  provider_draft_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ
);

-- Signatures
CREATE TABLE signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content_html TEXT NOT NULL,
  content_text TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  email_account_id UUID REFERENCES email_accounts(id),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ
);

-- Email Templates
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT,
  body_html TEXT NOT NULL,
  body_text TEXT,
  category TEXT,
  variables TEXT[] DEFAULT ARRAY[]::TEXT[],
  use_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ
);

-- Scheduled Emails
CREATE TABLE scheduled_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_account_id UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
  to_recipients JSONB NOT NULL,
  cc_recipients JSONB DEFAULT '[]',
  bcc_recipients JSONB DEFAULT '[]',
  subject TEXT,
  body_html TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  scheduled_for TIMESTAMPTZ NOT NULL,
  status email_status DEFAULT 'queued',
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ
);

-- Snoozed Emails
CREATE TABLE snoozed_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  snooze_until TIMESTAMPTZ NOT NULL,
  original_folder_type folder_type NOT NULL,
  unsnoozed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ
);

-- Email Rules
CREATE TABLE email_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  priority INT DEFAULT 0,
  conditions JSONB NOT NULL,
  actions JSONB NOT NULL,
  match_mode TEXT DEFAULT 'all',
  applied_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ
);

-- Custom Labels
CREATE TABLE custom_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366F1',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ,
  UNIQUE(user_id, name)
);

-- Message Labels (many-to-many)
CREATE TABLE message_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES custom_labels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ,
  UNIQUE(message_id, label_id)
);

-- Contacts
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  company TEXT,
  job_title TEXT,
  avatar_url TEXT,
  notes TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  is_priority_sender BOOLEAN DEFAULT FALSE,
  email_count INT DEFAULT 0,
  last_emailed_at TIMESTAMPTZ,
  source TEXT DEFAULT 'manual',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ,
  UNIQUE(user_id, email)
);

-- Calendar Events
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_account_id UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
  provider_event_id TEXT NOT NULL,
  provider_calendar_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  timezone TEXT DEFAULT 'UTC',
  recurrence JSONB,
  attendees JSONB DEFAULT '[]',
  organizer_email TEXT,
  rsvp_status event_rsvp DEFAULT 'none',
  is_online_meeting BOOLEAN DEFAULT FALSE,
  meeting_url TEXT,
  meeting_provider TEXT,
  reminders JSONB DEFAULT '[]',
  color TEXT,
  status TEXT DEFAULT 'confirmed',
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ,
  UNIQUE(email_account_id, provider_event_id)
);

-- Calendar Metadata
CREATE TABLE calendar_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_account_id UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
  provider_calendar_id TEXT NOT NULL,
  calendar_name TEXT NOT NULL,
  description TEXT,
  timezone TEXT DEFAULT 'UTC',
  is_primary BOOLEAN DEFAULT FALSE,
  read_only BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  color TEXT,
  sync_cursor TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ,
  UNIQUE(email_account_id, provider_calendar_id)
);

-- SMS Messages
CREATE TABLE sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  body TEXT NOT NULL,
  twilio_sid TEXT UNIQUE,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ
);

-- Spam Reports
CREATE TABLE spam_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  reported_email TEXT NOT NULL,
  reason TEXT,
  auto_detected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ
);

-- Subscriptions (Stripe)
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  plan plan_type NOT NULL,
  status subscription_status DEFAULT 'trialing',
  seats INT DEFAULT 1,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ
);

-- Invoices
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  stripe_invoice_id TEXT UNIQUE,
  amount_cents INT NOT NULL,
  currency TEXT DEFAULT 'usd',
  status invoice_status DEFAULT 'draft',
  description TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ
);

-- Payment Methods
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_payment_method_id TEXT UNIQUE NOT NULL,
  card_brand TEXT,
  card_last4 TEXT,
  card_exp_month INT,
  card_exp_year INT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ
);

-- Usage Tracking
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  count INT DEFAULT 1,
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ
);

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  action audit_action NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Impersonate Sessions
CREATE TABLE impersonate_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ
);

-- System Settings
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ
);

-- Webhooks
CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,
  secret TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMPTZ,
  failure_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ
);

-- Webhook Deliveries
CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INT,
  response_body TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ
);

-- API Keys
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  scopes TEXT[] DEFAULT ARRAY['read'],
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ
);

-- Enterprise Leads
CREATE TABLE enterprise_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  seats_needed INT,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ
);

-- Notification Queue
CREATE TABLE notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ
);

-- Backup Codes
CREATE TABLE backup_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ
);

-- User Login Tracking
CREATE TABLE user_login_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  login_at TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN DEFAULT TRUE,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ
);

-- Rate Limits (Postgres-based rate limiting, replaces Redis)
CREATE TABLE rate_limits (
  key TEXT NOT NULL,
  count INT DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (key, window_start)
);

-- Sync Checkpoints
CREATE TABLE sync_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_account_id UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL,
  cursor TEXT,
  last_successful_at TIMESTAMPTZ,
  error_count INT DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ,
  UNIQUE(email_account_id, sync_type)
);

-- Priority Senders
CREATE TABLE priority_senders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  is_blocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ,
  UNIQUE(user_id, email)
);

-- Sender Groups
CREATE TABLE sender_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_email TEXT NOT NULL,
  group_name TEXT,
  is_grouped BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ,
  UNIQUE(user_id, sender_email)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Organizations
CREATE INDEX idx_org_slug ON organizations(slug);
CREATE INDEX idx_org_domain ON organizations(domain);
CREATE INDEX idx_org_stripe ON organizations(stripe_customer_id);

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_super_admin ON users(is_super_admin) WHERE is_super_admin = true;

-- User Preferences
CREATE INDEX idx_user_prefs_user ON user_preferences(user_id);

-- Organization Members
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_org ON organization_members(organization_id);

-- Organization Invites
CREATE INDEX idx_invites_token ON organization_invites(token);
CREATE INDEX idx_invites_email ON organization_invites(email);
CREATE INDEX idx_invites_org ON organization_invites(organization_id);

-- Email Accounts
CREATE INDEX idx_accounts_user ON email_accounts(user_id);
CREATE INDEX idx_accounts_provider ON email_accounts(provider);
CREATE UNIQUE INDEX idx_accounts_primary ON email_accounts(user_id) WHERE is_primary = true;

-- OAuth Tokens
CREATE INDEX idx_tokens_user ON oauth_tokens(user_id);
CREATE INDEX idx_tokens_expires ON oauth_tokens(token_expires_at);

-- Messages
CREATE INDEX idx_msg_user_date ON messages(user_id, message_date DESC);
CREATE INDEX idx_msg_user_folder_date ON messages(user_id, folder_type, message_date DESC);
CREATE INDEX idx_msg_thread ON messages(user_id, provider_thread_id);
CREATE INDEX idx_msg_unread ON messages(user_id, is_unread) WHERE is_unread = true;
CREATE INDEX idx_msg_starred ON messages(user_id, is_starred) WHERE is_starred = true;
CREATE INDEX idx_msg_account_date ON messages(email_account_id, message_date DESC);
CREATE INDEX idx_msg_search ON messages USING gin(to_tsvector('english', coalesce(subject,'') || ' ' || coalesce(body_text,'')));

-- Folder Mappings
CREATE INDEX idx_folders_user_type ON folder_mappings(user_id, folder_type);
CREATE INDEX idx_folders_account ON folder_mappings(email_account_id);

-- Drafts
CREATE INDEX idx_drafts_user ON drafts(user_id, updated_at DESC);
CREATE INDEX idx_drafts_account ON drafts(email_account_id);

-- Signatures
CREATE INDEX idx_sig_user ON signatures(user_id);
CREATE INDEX idx_sig_default ON signatures(user_id) WHERE is_default = true;

-- Email Templates
CREATE INDEX idx_templates_user ON email_templates(user_id);
CREATE INDEX idx_templates_category ON email_templates(user_id, category);

-- Scheduled Emails
CREATE INDEX idx_scheduled_user ON scheduled_emails(user_id);
CREATE INDEX idx_scheduled_pending ON scheduled_emails(status, scheduled_for) WHERE status = 'queued';

-- Snoozed Emails
CREATE INDEX idx_snoozed_pending ON snoozed_emails(snooze_until) WHERE unsnoozed = false;
CREATE INDEX idx_snoozed_user ON snoozed_emails(user_id);

-- Email Rules
CREATE INDEX idx_rules_user ON email_rules(user_id, is_active, priority) WHERE is_active = true;

-- Custom Labels
CREATE INDEX idx_labels_user ON custom_labels(user_id);

-- Message Labels
CREATE INDEX idx_msg_labels_label ON message_labels(label_id);
CREATE INDEX idx_msg_labels_message ON message_labels(message_id);

-- Contacts
CREATE INDEX idx_contacts_user ON contacts(user_id);
CREATE INDEX idx_contacts_priority ON contacts(user_id) WHERE is_priority_sender = true;
CREATE INDEX idx_contacts_search ON contacts USING gin(to_tsvector('english', coalesce(name,'') || ' ' || coalesce(email,'') || ' ' || coalesce(company,'')));

-- Calendar Events
CREATE INDEX idx_events_user_time ON calendar_events(user_id, start_time, end_time);
CREATE INDEX idx_events_account ON calendar_events(email_account_id);
CREATE INDEX idx_events_online ON calendar_events(user_id) WHERE is_online_meeting = true;

-- Calendar Metadata
CREATE INDEX idx_cal_meta_user ON calendar_metadata(user_id);

-- SMS Messages
CREATE INDEX idx_sms_user ON sms_messages(user_id, created_at DESC);

-- Spam Reports
CREATE INDEX idx_spam_user ON spam_reports(user_id);
CREATE INDEX idx_spam_email ON spam_reports(reported_email);

-- Subscriptions
CREATE INDEX idx_sub_org ON subscriptions(organization_id);
CREATE INDEX idx_sub_user ON subscriptions(user_id);
CREATE INDEX idx_sub_stripe ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_sub_status ON subscriptions(status);

-- Invoices
CREATE INDEX idx_invoices_sub ON invoices(subscription_id);
CREATE INDEX idx_invoices_stripe ON invoices(stripe_invoice_id);

-- Payment Methods
CREATE INDEX idx_pm_user ON payment_methods(user_id);
CREATE INDEX idx_pm_org ON payment_methods(organization_id);

-- Usage Tracking
CREATE INDEX idx_usage_user_feature ON usage_tracking(user_id, feature, timestamp DESC);
CREATE INDEX idx_usage_org ON usage_tracking(organization_id, timestamp DESC);

-- Audit Logs
CREATE INDEX idx_audit_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_org ON audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_audit_action ON audit_logs(action, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);

-- Impersonate Sessions
CREATE INDEX idx_impersonate_admin ON impersonate_sessions(admin_user_id);
CREATE INDEX idx_impersonate_active ON impersonate_sessions(ended_at) WHERE ended_at IS NULL;

-- System Settings
CREATE INDEX idx_settings_key ON system_settings(key);

-- Webhooks
CREATE INDEX idx_webhooks_user ON webhooks(user_id);
CREATE INDEX idx_webhooks_active ON webhooks(is_active) WHERE is_active = true;

-- Webhook Deliveries
CREATE INDEX idx_deliveries_webhook ON webhook_deliveries(webhook_id, created_at DESC);

-- API Keys
CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);

-- Enterprise Leads
CREATE INDEX idx_leads_status ON enterprise_leads(status);

-- Notification Queue
CREATE INDEX idx_notif_user_unread ON notification_queue(user_id, read) WHERE read = false;
CREATE INDEX idx_notif_user ON notification_queue(user_id, created_at DESC);

-- Backup Codes
CREATE INDEX idx_backup_user ON backup_codes(user_id);

-- User Login Tracking
CREATE INDEX idx_login_user ON user_login_tracking(user_id, login_at DESC);
CREATE INDEX idx_login_ip ON user_login_tracking(ip_address, login_at DESC);

-- Rate Limits
CREATE INDEX idx_rate_limits_window ON rate_limits(window_start);

-- Sync Checkpoints
CREATE INDEX idx_checkpoint_account ON sync_checkpoints(email_account_id);

-- Priority Senders
CREATE INDEX idx_priority_user ON priority_senders(user_id);

-- Sender Groups
CREATE INDEX idx_sender_groups_user ON sender_groups(user_id);

-- ============================================================================
-- TRIGGERS (updated_at automation)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organization_members_updated_at BEFORE UPDATE ON organization_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organization_invites_updated_at BEFORE UPDATE ON organization_invites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_accounts_updated_at BEFORE UPDATE ON email_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_oauth_tokens_updated_at BEFORE UPDATE ON oauth_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_folder_mappings_updated_at BEFORE UPDATE ON folder_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_drafts_updated_at BEFORE UPDATE ON drafts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_signatures_updated_at BEFORE UPDATE ON signatures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scheduled_emails_updated_at BEFORE UPDATE ON scheduled_emails FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_snoozed_emails_updated_at BEFORE UPDATE ON snoozed_emails FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_rules_updated_at BEFORE UPDATE ON email_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_custom_labels_updated_at BEFORE UPDATE ON custom_labels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_message_labels_updated_at BEFORE UPDATE ON message_labels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_calendar_metadata_updated_at BEFORE UPDATE ON calendar_metadata FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sms_messages_updated_at BEFORE UPDATE ON sms_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_spam_reports_updated_at BEFORE UPDATE ON spam_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_usage_tracking_updated_at BEFORE UPDATE ON usage_tracking FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_impersonate_sessions_updated_at BEFORE UPDATE ON impersonate_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_webhooks_updated_at BEFORE UPDATE ON webhooks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_webhook_deliveries_updated_at BEFORE UPDATE ON webhook_deliveries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_enterprise_leads_updated_at BEFORE UPDATE ON enterprise_leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_queue_updated_at BEFORE UPDATE ON notification_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_backup_codes_updated_at BEFORE UPDATE ON backup_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_login_tracking_updated_at BEFORE UPDATE ON user_login_tracking FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sync_checkpoints_updated_at BEFORE UPDATE ON sync_checkpoints FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_priority_senders_updated_at BEFORE UPDATE ON priority_senders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sender_groups_updated_at BEFORE UPDATE ON sender_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE folder_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE snoozed_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE spam_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE impersonate_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_login_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE priority_senders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sender_groups ENABLE ROW LEVEL SECURITY;

-- Organizations: Members can view, owners can update
CREATE POLICY "Members view org" ON organizations
  FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners update org" ON organizations
  FOR UPDATE
  USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role = 'owner'
    )
  );

CREATE POLICY "Super admins manage all orgs" ON organizations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

-- Users: Own profile + super admin
CREATE POLICY "Users manage own profile" ON users
  FOR ALL
  USING (id = auth.uid());

CREATE POLICY "Super admins read all users" ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

CREATE POLICY "Super admins update user roles" ON users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

-- User Preferences: Own only
CREATE POLICY "Users manage own preferences" ON user_preferences
  FOR ALL
  USING (user_id = auth.uid());

-- Organization Members: View own org, owners/admins manage
CREATE POLICY "View org members" ON organization_members
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owner/admin add members" ON organization_members
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND (role = 'owner' OR is_admin = true)
    )
  );

CREATE POLICY "Owner remove members" ON organization_members
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role = 'owner'
    )
    AND role != 'owner'
  );

CREATE POLICY "Super admins manage org members" ON organization_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

-- Organization Invites: View own org, owner/admin create
CREATE POLICY "View org invites" ON organization_invites
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owner/admin create invites" ON organization_invites
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND (role = 'owner' OR is_admin = true)
    )
  );

CREATE POLICY "Super admins manage invites" ON organization_invites
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

-- Email Accounts: Own data only + super admin
CREATE POLICY "Users manage own email accounts" ON email_accounts
  FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Super admins read email accounts" ON email_accounts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

-- OAuth Tokens: Own data only + super admin (read-only for impersonate)
CREATE POLICY "Users manage own tokens" ON oauth_tokens
  FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Super admins read tokens" ON oauth_tokens
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

-- Messages: Own data only + super admin
CREATE POLICY "Users manage own messages" ON messages
  FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Super admins read messages" ON messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

-- Folder Mappings: Own data only
CREATE POLICY "Users manage own folders" ON folder_mappings
  FOR ALL
  USING (user_id = auth.uid());

-- Drafts: Own data only
CREATE POLICY "Users manage own drafts" ON drafts
  FOR ALL
  USING (user_id = auth.uid());

-- Signatures: Own data only
CREATE POLICY "Users manage own signatures" ON signatures
  FOR ALL
  USING (user_id = auth.uid());

-- Email Templates: Own data only
CREATE POLICY "Users manage own templates" ON email_templates
  FOR ALL
  USING (user_id = auth.uid());

-- Scheduled Emails: Own data only
CREATE POLICY "Users manage own scheduled" ON scheduled_emails
  FOR ALL
  USING (user_id = auth.uid());

-- Snoozed Emails: Own data only
CREATE POLICY "Users manage own snoozed" ON snoozed_emails
  FOR ALL
  USING (user_id = auth.uid());

-- Email Rules: Own data only
CREATE POLICY "Users manage own rules" ON email_rules
  FOR ALL
  USING (user_id = auth.uid());

-- Custom Labels: Own data only
CREATE POLICY "Users manage own labels" ON custom_labels
  FOR ALL
  USING (user_id = auth.uid());

-- Message Labels: Own data (via message ownership)
CREATE POLICY "Users manage own message labels" ON message_labels
  FOR ALL
  USING (
    message_id IN (
      SELECT id FROM messages WHERE user_id = auth.uid()
    )
  );

-- Contacts: Own data only
CREATE POLICY "Users manage own contacts" ON contacts
  FOR ALL
  USING (user_id = auth.uid());

-- Calendar Events: Own data only
CREATE POLICY "Users manage own events" ON calendar_events
  FOR ALL
  USING (user_id = auth.uid());

-- Calendar Metadata: Own data only
CREATE POLICY "Users manage own calendars" ON calendar_metadata
  FOR ALL
  USING (user_id = auth.uid());

-- SMS Messages: Own data only (create + read)
CREATE POLICY "Users manage own sms" ON sms_messages
  FOR ALL
  USING (user_id = auth.uid());

-- Spam Reports: Own data only
CREATE POLICY "Users manage own spam reports" ON spam_reports
  FOR ALL
  USING (user_id = auth.uid());

-- Subscriptions: Org members read org sub, individual users read own
CREATE POLICY "View org subscription" ON subscriptions
  FOR SELECT
  USING (
    (organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    ))
    OR (user_id = auth.uid())
  );

CREATE POLICY "Super admins manage subscriptions" ON subscriptions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

-- Invoices: Read via subscription relationship
CREATE POLICY "View invoices" ON invoices
  FOR SELECT
  USING (
    subscription_id IN (
      SELECT id FROM subscriptions
      WHERE (organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      ))
      OR (user_id = auth.uid())
    )
  );

CREATE POLICY "Super admins manage invoices" ON invoices
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

-- Payment Methods: Org owners manage org payment, individuals manage own
CREATE POLICY "Manage org payment methods" ON payment_methods
  FOR ALL
  USING (
    (organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role = 'owner'
    ))
    OR (user_id = auth.uid())
  );

CREATE POLICY "Super admins read payment methods" ON payment_methods
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

-- Usage Tracking: Own data only
CREATE POLICY "Users view own usage" ON usage_tracking
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Super admins view all usage" ON usage_tracking
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

-- Audit Logs: Super admin + org owners (org scope)
CREATE POLICY "Super admins read all audit logs" ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

CREATE POLICY "Org owners read org audit logs" ON audit_logs
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role = 'owner'
    )
  );

-- Impersonate Sessions: Super admin only
CREATE POLICY "Super admins manage impersonate sessions" ON impersonate_sessions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

-- System Settings: Super admin only
CREATE POLICY "Super admins manage system settings" ON system_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

-- Webhooks: Own data only
CREATE POLICY "Users manage own webhooks" ON webhooks
  FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Super admins manage all webhooks" ON webhooks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

-- Webhook Deliveries: Via webhook ownership
CREATE POLICY "Users view own webhook deliveries" ON webhook_deliveries
  FOR SELECT
  USING (
    webhook_id IN (
      SELECT id FROM webhooks WHERE user_id = auth.uid()
    )
  );

-- API Keys: Own data only
CREATE POLICY "Users manage own api keys" ON api_keys
  FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Super admins manage all api keys" ON api_keys
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

-- Enterprise Leads: Public create, super admin read
CREATE POLICY "Anyone can submit enterprise lead" ON enterprise_leads
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Super admins manage enterprise leads" ON enterprise_leads
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

-- Notification Queue: Own data only
CREATE POLICY "Users manage own notifications" ON notification_queue
  FOR ALL
  USING (user_id = auth.uid());

-- Backup Codes: Own data only
CREATE POLICY "Users manage own backup codes" ON backup_codes
  FOR ALL
  USING (user_id = auth.uid());

-- User Login Tracking: Own data only
CREATE POLICY "Users view own login history" ON user_login_tracking
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Super admins view all login tracking" ON user_login_tracking
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

-- Rate Limits: Service role only (no user-facing RLS needed - managed by functions)
CREATE POLICY "Service role manages rate limits" ON rate_limits
  FOR ALL
  USING (true);

-- Sync Checkpoints: Own data (via email account)
CREATE POLICY "Users manage own sync checkpoints" ON sync_checkpoints
  FOR ALL
  USING (
    email_account_id IN (
      SELECT id FROM email_accounts WHERE user_id = auth.uid()
    )
  );

-- Priority Senders: Own data only
CREATE POLICY "Users manage own priority senders" ON priority_senders
  FOR ALL
  USING (user_id = auth.uid());

-- Sender Groups: Own data only
CREATE POLICY "Users manage own sender groups" ON sender_groups
  FOR ALL
  USING (user_id = auth.uid());

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Rate limit check function (from SPEC-PERMISSIONS.md)
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key TEXT,
  p_max INT,
  p_window_seconds INT
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INT;
  v_window_start TIMESTAMPTZ;
BEGIN
  v_window_start := NOW() - (p_window_seconds || ' seconds')::INTERVAL;

  -- Clean old entries
  DELETE FROM rate_limits WHERE window_start < v_window_start;

  -- Count recent
  SELECT COALESCE(SUM(count), 0) INTO v_count
  FROM rate_limits
  WHERE key = p_key AND window_start >= v_window_start;

  IF v_count >= p_max THEN
    RETURN FALSE; -- rate limited
  END IF;

  -- Increment
  INSERT INTO rate_limits (key, count, window_start)
  VALUES (p_key, 1, date_trunc('second', NOW()))
  ON CONFLICT (key, window_start) DO UPDATE SET count = rate_limits.count + 1;

  RETURN TRUE; -- allowed
END;
$$ LANGUAGE plpgsql;
