-- Migration 012: Vacation Responder
-- Adds vacation responder functionality with auto-reply tracking

-- Create vacation_responder table
CREATE TABLE IF NOT EXISTS vacation_responder (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES connected_accounts(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One vacation responder per account
  UNIQUE(account_id)
);

-- Create vacation_replies table to track who we've auto-replied to
CREATE TABLE IF NOT EXISTS vacation_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vacation_responder_id UUID NOT NULL REFERENCES vacation_responder(id) ON DELETE CASCADE,
  sender_email TEXT NOT NULL,
  replied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Only reply once per sender per vacation period
  UNIQUE(vacation_responder_id, sender_email)
);

-- Add indexes
CREATE INDEX idx_vacation_responder_user_id ON vacation_responder(user_id);
CREATE INDEX idx_vacation_responder_account_id ON vacation_responder(account_id);
CREATE INDEX idx_vacation_responder_enabled ON vacation_responder(enabled) WHERE enabled = true;
CREATE INDEX idx_vacation_replies_responder_id ON vacation_replies(vacation_responder_id);
CREATE INDEX idx_vacation_replies_sender ON vacation_replies(vacation_responder_id, sender_email);

-- Add updated_at trigger
CREATE TRIGGER update_vacation_responder_updated_at
  BEFORE UPDATE ON vacation_responder
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for vacation_responder
ALTER TABLE vacation_responder ENABLE ROW LEVEL SECURITY;

-- Users can view their own vacation responders
CREATE POLICY "Users can view own vacation responders"
  ON vacation_responder
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert vacation responders for their own accounts
CREATE POLICY "Users can create vacation responders"
  ON vacation_responder
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM connected_accounts
      WHERE id = account_id AND user_id = auth.uid()
    )
  );

-- Users can update their own vacation responders
CREATE POLICY "Users can update own vacation responders"
  ON vacation_responder
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own vacation responders
CREATE POLICY "Users can delete own vacation responders"
  ON vacation_responder
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for vacation_replies
ALTER TABLE vacation_replies ENABLE ROW LEVEL SECURITY;

-- Users can view replies for their vacation responders
CREATE POLICY "Users can view own vacation replies"
  ON vacation_replies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vacation_responder
      WHERE id = vacation_responder_id AND user_id = auth.uid()
    )
  );

-- System can insert vacation replies (via service role)
CREATE POLICY "System can create vacation replies"
  ON vacation_replies
  FOR INSERT
  WITH CHECK (true);

-- Add columns to messages table for read receipt tracking
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS read_receipt_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS read_receipt_opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS read_receipt_ip TEXT,
  ADD COLUMN IF NOT EXISTS read_receipt_user_agent TEXT;

-- Add index for read receipts
CREATE INDEX idx_messages_read_receipt ON messages(read_receipt_enabled) WHERE read_receipt_enabled = true;

-- Add event types for vacation and read receipts
INSERT INTO event_types (name, description) VALUES
  ('email.vacation_auto_reply', 'Vacation auto-reply sent'),
  ('email.read_receipt_opened', 'Email read receipt tracked')
ON CONFLICT (name) DO NOTHING;

-- Grant permissions
GRANT ALL ON vacation_responder TO authenticated;
GRANT ALL ON vacation_replies TO authenticated;
GRANT ALL ON vacation_responder TO service_role;
GRANT ALL ON vacation_replies TO service_role;
