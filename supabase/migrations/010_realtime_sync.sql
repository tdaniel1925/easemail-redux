-- Migration: Real-Time Sync Infrastructure
-- Purpose: Add webhook subscription tracking and realtime connection management
-- Created: 2026-02-15

-- Add webhook subscription columns to email_accounts table
ALTER TABLE email_accounts
ADD COLUMN IF NOT EXISTS webhook_subscription_id text,
ADD COLUMN IF NOT EXISTS webhook_expiry timestamptz;

-- Create realtime_connections table to track SSE connections
CREATE TABLE IF NOT EXISTS realtime_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id text NOT NULL,
  connected_at timestamptz NOT NULL DEFAULT now(),
  last_heartbeat timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_accounts_webhook_expiry
  ON email_accounts(webhook_expiry)
  WHERE webhook_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_realtime_connections_user_id
  ON realtime_connections(user_id);

CREATE INDEX IF NOT EXISTS idx_realtime_connections_connection_id
  ON realtime_connections(connection_id);

-- Add RLS policies for realtime_connections
ALTER TABLE realtime_connections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own connections
CREATE POLICY "Users can view own realtime connections"
  ON realtime_connections
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own connections
CREATE POLICY "Users can create own realtime connections"
  ON realtime_connections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own connections
CREATE POLICY "Users can update own realtime connections"
  ON realtime_connections
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own connections
CREATE POLICY "Users can delete own realtime connections"
  ON realtime_connections
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER set_realtime_connections_updated_at
  BEFORE UPDATE ON realtime_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE realtime_connections IS 'Tracks active SSE connections for real-time inbox updates';
COMMENT ON COLUMN email_accounts.webhook_subscription_id IS 'Provider-specific webhook subscription ID (Google watch ID or Microsoft subscription ID)';
COMMENT ON COLUMN email_accounts.webhook_expiry IS 'When the webhook subscription expires and needs renewal';
