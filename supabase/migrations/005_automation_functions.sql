-- Migration 005: Automation Functions and Search Vector
-- Stage 6: Automation layer helper functions and full-text search

-- Function: Increment organization seats_used
CREATE OR REPLACE FUNCTION increment_org_seats_used(p_org_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE organizations
  SET seats_used = LEAST(seats_used + 1, seats)
  WHERE id = p_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Decrement organization seats_used
CREATE OR REPLACE FUNCTION decrement_org_seats_used(p_org_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE organizations
  SET seats_used = GREATEST(seats_used - 1, 0)
  WHERE id = p_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Increment contact email_count and update last_emailed_at
CREATE OR REPLACE FUNCTION increment_contact_email_count(
  p_user_id UUID,
  p_email TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE contacts
  SET
    email_count = email_count + 1,
    last_emailed_at = NOW()
  WHERE user_id = p_user_id AND email = p_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add search_vector column to messages table
-- Weighted full-text search: subject (A), sender (B), body (C)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(subject, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(from_name, '') || ' ' || coalesce(from_email, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(body_text, '')), 'C')
  ) STORED;

-- GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_msg_search_vector ON messages USING gin(search_vector);

-- Comment
COMMENT ON COLUMN messages.search_vector IS 'Generated full-text search vector: subject (A), sender (B), body (C)';
