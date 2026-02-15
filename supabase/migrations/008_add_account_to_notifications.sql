-- Add email_account_id to notification_queue
-- Stage 4: Multi-Account Support - Search & Notifications

-- Add email_account_id column
ALTER TABLE notification_queue
ADD COLUMN email_account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE;

-- Add index for filtering by account
CREATE INDEX idx_notification_queue_account ON notification_queue(email_account_id);

-- Add composite index for common query pattern (user + account + unread)
CREATE INDEX idx_notification_queue_user_account_read ON notification_queue(user_id, email_account_id, read) WHERE read = false;

-- Update the existing index comment for clarity
COMMENT ON INDEX idx_notif_user_unread IS 'Index for querying unread notifications by user (legacy - use idx_notification_queue_user_account_read for account-aware queries)';

-- Backfill existing notifications (set to null - they are legacy notifications without account context)
-- No action needed - existing notifications will have NULL email_account_id
