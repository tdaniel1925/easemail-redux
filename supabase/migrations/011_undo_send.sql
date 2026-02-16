-- Migration: Undo Send
-- Phase 5, Task 86
-- Adds queued_sends table for undo send functionality (5-second delay before actual send)

-- Create queued_sends table
CREATE TABLE IF NOT EXISTS queued_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,

  -- Email content
  to_addresses JSONB NOT NULL, -- Array of email addresses
  cc_addresses JSONB, -- Array of CC addresses (nullable)
  bcc_addresses JSONB, -- Array of BCC addresses (nullable)
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  body_html TEXT, -- HTML version of body (nullable)
  attachments JSONB, -- Array of attachment metadata (nullable)
  signature_id UUID REFERENCES signatures(id) ON DELETE SET NULL,

  -- Threading headers (for replies/forwards)
  in_reply_to TEXT, -- Message-ID being replied to
  references TEXT, -- References header for threading

  -- Scheduling
  send_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '5 seconds'), -- When to actually send

  -- State tracking
  canceled BOOLEAN NOT NULL DEFAULT FALSE, -- User clicked undo
  sent BOOLEAN NOT NULL DEFAULT FALSE, -- Email has been sent
  error TEXT, -- Error message if send failed

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS queued_sends_user_id_idx ON queued_sends(user_id);
CREATE INDEX IF NOT EXISTS queued_sends_account_id_idx ON queued_sends(account_id);
CREATE INDEX IF NOT EXISTS queued_sends_send_at_idx ON queued_sends(send_at) WHERE NOT sent AND NOT canceled;
CREATE INDEX IF NOT EXISTS queued_sends_created_at_idx ON queued_sends(created_at);

-- Add RLS policies
ALTER TABLE queued_sends ENABLE ROW LEVEL SECURITY;

-- Users can only see their own queued sends
CREATE POLICY "Users can view their own queued sends"
  ON queued_sends
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can only insert their own queued sends
CREATE POLICY "Users can insert their own queued sends"
  ON queued_sends
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can only update their own queued sends (for cancellation)
CREATE POLICY "Users can update their own queued sends"
  ON queued_sends
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own queued sends (cleanup after processing)
CREATE POLICY "Users can delete their own queued sends"
  ON queued_sends
  FOR DELETE
  USING (user_id = auth.uid());

-- Add comments for documentation
COMMENT ON TABLE queued_sends IS 'Stores emails queued for sending with undo window (5 seconds)';
COMMENT ON COLUMN queued_sends.send_at IS 'When to actually send the email (default: 5 seconds from queue time)';
COMMENT ON COLUMN queued_sends.canceled IS 'User clicked undo before send_at time';
COMMENT ON COLUMN queued_sends.sent IS 'Email has been successfully sent';
COMMENT ON COLUMN queued_sends.error IS 'Error message if send failed (for debugging)';
