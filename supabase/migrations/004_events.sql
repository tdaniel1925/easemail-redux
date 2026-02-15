-- =====================================================
-- MIGRATION 004: EVENT SYSTEM
-- Stage 5: Add event tracking for all state changes
-- =====================================================

-- Create event type enum covering all state changes
CREATE TYPE event_type AS ENUM (
  -- User lifecycle
  'user.created',
  'user.onboarding_completed',
  'user.profile_updated',
  'user.login',
  'user.logout',

  -- Email account
  'email_account.connected',
  'email_account.disconnected',
  'email_account.sync_started',
  'email_account.sync_completed',
  'email_account.sync_error',

  -- Token management
  'token.refreshed',
  'token.refresh_failed',
  'token.near_expiry',

  -- Messages
  'message.received',
  'message.sent',
  'message.deleted',
  'message.read',
  'message.unread',
  'message.starred',
  'message.unstarred',
  'message.moved',
  'message.labeled',
  'message.unlabeled',
  'message.archived',

  -- Drafts
  'draft.created',
  'draft.auto_saved',
  'draft.updated',
  'draft.deleted',

  -- Scheduled emails
  'scheduled_email.created',
  'scheduled_email.due',
  'scheduled_email.sent',
  'scheduled_email.failed',
  'scheduled_email.canceled',

  -- Snooze
  'snooze.created',
  'snooze.expired',
  'snooze.canceled',

  -- Organization
  'org.created',
  'org.updated',
  'org.deleted',
  'org.member_added',
  'org.member_removed',
  'org.ownership_transferred',

  -- Organization invites
  'invite.created',
  'invite.accepted',
  'invite.expired',
  'invite.revoked',

  -- Billing
  'subscription.created',
  'subscription.activated',
  'subscription.trial_ending',
  'subscription.payment_failed',
  'subscription.canceled',
  'subscription.updated',

  -- Contacts
  'contact.created',
  'contact.updated',
  'contact.deleted',
  'contact.imported',

  -- Labels
  'label.created',
  'label.updated',
  'label.deleted',
  'label.applied',
  'label.removed',

  -- Email rules
  'email_rule.created',
  'email_rule.updated',
  'email_rule.deleted',
  'email_rule.applied',

  -- Calendar
  'calendar_event.created',
  'calendar_event.updated',
  'calendar_event.deleted',
  'calendar_event.rsvp_changed',

  -- Signatures
  'signature.created',
  'signature.updated',
  'signature.deleted',

  -- Templates
  'email_template.created',
  'email_template.updated',
  'email_template.deleted',
  'email_template.used',

  -- Admin
  'impersonate.started',
  'impersonate.ended',

  -- Webhooks
  'webhook.created',
  'webhook.deleted',
  'webhook.triggered',
  'webhook.failed',

  -- API keys
  'api_key.created',
  'api_key.used',
  'api_key.deleted',

  -- System
  'system_setting.updated',
  'notification.created'
);

-- Create events table (append-only)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type event_type NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  payload JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for common queries
CREATE INDEX idx_events_type ON events(event_type, created_at DESC);
CREATE INDEX idx_events_entity ON events(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_events_actor ON events(actor_id, created_at DESC);
CREATE INDEX idx_events_org ON events(organization_id, created_at DESC);
CREATE INDEX idx_events_created_at ON events(created_at DESC);

-- Composite index for entity timeline queries
CREATE INDEX idx_events_entity_timeline ON events(entity_type, entity_id, event_type, created_at DESC);

-- RLS policies for events table
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Super admins can see all events
CREATE POLICY events_super_admin_all ON events
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

-- Users can see their own events
CREATE POLICY events_user_own ON events
  FOR SELECT
  TO authenticated
  USING (actor_id = auth.uid());

-- Org members can see org events
CREATE POLICY events_org_members ON events
  FOR SELECT
  TO authenticated
  USING (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = events.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Service role can insert events (server-side only)
CREATE POLICY events_service_insert ON events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Function to emit events (helper for server actions)
CREATE OR REPLACE FUNCTION emit_event(
  p_event_type event_type,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_actor_id UUID,
  p_organization_id UUID DEFAULT NULL,
  p_payload JSONB DEFAULT '{}',
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO events (
    event_type,
    entity_type,
    entity_id,
    actor_id,
    organization_id,
    payload,
    metadata
  ) VALUES (
    p_event_type,
    p_entity_type,
    p_entity_id,
    p_actor_id,
    p_organization_id,
    p_payload,
    p_metadata
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

-- Grant execute on emit_event to service role
GRANT EXECUTE ON FUNCTION emit_event TO service_role;

-- Add search_vector column to messages table for full-text search
-- (Referenced in SPEC-AUTOMATION.md AUTO-7)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(subject, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(from_name, '') || ' ' || coalesce(from_email, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(body_text, '')), 'C')
  ) STORED;

-- Create GIN index on search_vector if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_msg_search_vector'
  ) THEN
    CREATE INDEX idx_msg_search_vector ON messages USING gin(search_vector);
  END IF;
END
$$;

-- Comment
COMMENT ON TABLE events IS 'Append-only event log for all state changes. Layer 4. Read by automation (Layer 5) and AI (Layer 6).';
COMMENT ON COLUMN events.payload IS 'Event-specific data: previous state, new state, changed fields, etc.';
COMMENT ON COLUMN events.metadata IS 'Contextual data: IP address, user agent, source (api, ui, cron), etc.';
