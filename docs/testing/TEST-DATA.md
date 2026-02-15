# Test Data Documentation

## Overview

This document describes the test data structure, seeding process, and testing workflows for the EaseMail v2 multi-account email application.

## Quick Start

### Seeding Test Data

```bash
# Seed test data (creates users, accounts, messages, etc.)
npm run seed:test
```

### Clearing Test Data

Two methods:

1. **Via UI**: Settings > Developer tab > Click "Clear Test Data" button
2. **Via Script**: `npm run seed:clear` (if implemented)

## Test User Credentials

### Regular User
- **Email**: `test@example.com`
- **Password**: `TestPassword123!`
- **Role**: Individual user
- **Email Accounts**: 3 accounts
  - `user1-google@gmail.com` (Primary, Google)
  - `user1-microsoft@outlook.com` (Microsoft)
  - `user1-work@company.com` (Google)

### Admin User
- **Email**: `admin@example.com`
- **Password**: `AdminPassword123!`
- **Role**: Super Admin
- **Email Accounts**: 3 accounts
  - `admin-google@gmail.com` (Primary, Google)
  - `admin-microsoft@outlook.com` (Microsoft)
  - `admin-personal@gmail.com` (Google)

## Test Data Structure

### Created by Seed Script

The seed script (`scripts/seed-test-data.ts`) creates:

1. **Users**: 2 users (1 regular, 1 admin)
2. **Email Accounts**: 6 accounts total (3 per user)
3. **OAuth Tokens**: 6 tokens (1 per account)
4. **Messages**: ~100 messages distributed across:
   - Inbox (20 per user)
   - Sent (10 per user)
   - Archive (10 per user)
   - Trash (10 per user)
5. **Notifications**: 10 notifications (5 per user)
6. **Custom Folders**: 4 folders
   - Important Projects
   - Clients

### Message Distribution

Messages are distributed with realistic patterns:

- **Threads**: Some messages are grouped into threads (20% of messages)
- **Categories**: Messages in inbox are categorized:
  - Priority (from priority senders)
  - People
  - Newsletters
  - Notifications
  - Promotions
  - Uncategorized
- **Status**:
  - ~33% unread (`is_unread = true`)
  - ~14% starred (`is_starred = true`)
  - ~20% with attachments (`has_attachments = true`)
- **Importance**: ~10% marked as high importance
- **Date Range**: Messages distributed across last 30 days

## Running E2E Tests

### Prerequisites

1. **Seed test data first**:
   ```bash
   npm run seed:test
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **In a separate terminal, run Playwright tests**:
   ```bash
   npm run test:e2e
   ```

### Test Suites

#### Multi-Account Support Tests
- Account switcher visibility
- Multiple accounts display
- Account persistence after refresh
- Inbox filtering by account
- Sent/Archive/Trash page accessibility
- Composer account selector
- Navigation between folder pages

#### Admin Panel Tests
- Dashboard metrics display
- Account count metrics
- User list with account counts

### Test Screenshots

Tests automatically capture screenshots in `tests/screenshots/`:
- `inbox-with-account.png`
- `sent-page.png`
- `archive-page.png`
- `trash-page.png`
- `composer-with-account.png`
- `admin-dashboard.png`
- `admin-users-page.png`

## Inspecting Test Data

### Via Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Table Editor**
3. Inspect these tables:
   - `users` - Should show 2 users with `[TEST]` prefix
   - `email_accounts` - Should show 6 accounts
   - `oauth_tokens` - Should show 6 tokens
   - `messages` - Should show ~100 messages
   - `notification_queue` - Should show 10 notifications
   - `folder_mappings` - Should show 4 custom folders

### Via SQL Editor

```sql
-- Check users
SELECT id, email, name, is_super_admin
FROM users
WHERE email IN ('test@example.com', 'admin@example.com');

-- Check email accounts
SELECT id, user_id, email, provider, is_primary
FROM email_accounts
ORDER BY user_id, is_primary DESC;

-- Check messages by account
SELECT
  ea.email as account,
  m.folder_type,
  COUNT(*) as count
FROM messages m
JOIN email_accounts ea ON m.email_account_id = ea.id
GROUP BY ea.email, m.folder_type
ORDER BY ea.email, m.folder_type;

-- Check notifications
SELECT
  nq.type,
  nq.title,
  ea.email as account
FROM notification_queue nq
LEFT JOIN email_accounts ea ON nq.email_account_id = ea.id
ORDER BY nq.created_at DESC;
```

## Data Cleanup

### Clear All Test Data

**Warning**: This will delete ALL data for test users. Use with caution.

#### Method 1: Via UI
1. Sign in as `test@example.com` or `admin@example.com`
2. Navigate to **Settings > Developer**
3. Click **"Clear Test Data"** button
4. Confirm the action

#### Method 2: Via SQL (if needed)

```sql
-- Delete in correct order (respecting foreign keys)

-- 1. Delete messages
DELETE FROM messages
WHERE user_id IN (
  SELECT id FROM users WHERE email IN ('test@example.com', 'admin@example.com')
);

-- 2. Delete notifications
DELETE FROM notification_queue
WHERE user_id IN (
  SELECT id FROM users WHERE email IN ('test@example.com', 'admin@example.com')
);

-- 3. Delete folder mappings
DELETE FROM folder_mappings
WHERE user_id IN (
  SELECT id FROM users WHERE email IN ('test@example.com', 'admin@example.com')
);

-- 4. Delete OAuth tokens
DELETE FROM oauth_tokens
WHERE user_id IN (
  SELECT id FROM users WHERE email IN ('test@example.com', 'admin@example.com')
);

-- 5. Delete email accounts
DELETE FROM email_accounts
WHERE user_id IN (
  SELECT id FROM users WHERE email IN ('test@example.com', 'admin@example.com')
);

-- 6. Delete users (this will cascade to auth.users via RLS)
DELETE FROM users
WHERE email IN ('test@example.com', 'admin@example.com');

-- 7. Delete auth users (requires service role)
-- This must be done via Supabase Admin API or Dashboard
```

## Troubleshooting

### Issue: Seed script fails with "user already exists"

**Solution**: This is normal on subsequent runs. The script will skip creating users and continue with other data.

### Issue: Messages created = 0

**Solution**: Check for constraint violations. The messages table has a unique constraint on `(email_account_id, provider_message_id)`. If you run the script multiple times without clearing data, it will fail to insert duplicate messages.

**Fix**: Clear test data first, then re-run seed script.

### Issue: No email accounts visible in UI

**Possible causes**:
1. User not authenticated
2. Accounts have `archived_at` set
3. Account context not loading

**Solution**:
```sql
-- Check if accounts exist and are active
SELECT id, email, archived_at
FROM email_accounts
WHERE user_id = (SELECT id FROM users WHERE email = 'test@example.com');

-- Unarchive accounts if needed
UPDATE email_accounts
SET archived_at = NULL
WHERE user_id = (SELECT id FROM users WHERE email = 'test@example.com');
```

### Issue: Playwright tests fail with "waitForURL timeout"

**Possible causes**:
1. Dev server not running
2. Credentials incorrect
3. Database connection issues

**Solution**:
1. Ensure dev server is running: `npm run dev`
2. Verify credentials in test file match seed data
3. Check Supabase connection in `.env.local`

### Issue: Account switcher not showing accounts

**Possible causes**:
1. Account context not initialized
2. No accounts in database
3. RLS policy blocking access

**Solution**:
```sql
-- Verify RLS policies allow user access
SELECT * FROM email_accounts WHERE user_id = auth.uid();

-- Check if accounts exist
SELECT count(*) FROM email_accounts
WHERE user_id = (SELECT id FROM users WHERE email = 'test@example.com');
```

### Issue: Messages not filtering by account

**Check**:
1. Is `email_account_id` included in queries?
2. Is `selectedAccountId` from context being used?
3. Are messages associated with correct account?

**Verify**:
```sql
-- Check message distribution by account
SELECT
  ea.email,
  COUNT(*) as message_count
FROM messages m
JOIN email_accounts ea ON m.email_account_id = ea.id
GROUP BY ea.email;
```

## Development Workflow

### 1. Initial Setup

```bash
# 1. Set up database
npm run db:push  # or apply migrations

# 2. Seed test data
npm run seed:test

# 3. Start dev server
npm run dev
```

### 2. Testing Cycle

```bash
# After code changes:

# 1. Clear old data
# Via UI: Settings > Developer > Clear Test Data

# 2. Re-seed data
npm run seed:test

# 3. Run E2E tests
npm run test:e2e

# 4. Review screenshots in tests/screenshots/
```

### 3. Production Deployment

**Important**: DO NOT run `npm run seed:test` in production!

The seed script is for development and testing only. Production data should come from real user signups and OAuth flows.

## Schema Notes

### Required Columns

The seed script expects these columns to exist:

**users**:
- `id`, `email`, `name`, `is_super_admin`

**email_accounts**:
- `id`, `user_id`, `provider`, `email`, `name`, `is_primary`, `sync_status`, `archived_at`

**oauth_tokens**:
- `user_id`, `email_account_id`, `provider`, `access_token`, `refresh_token`, `token_expires_at`, `scopes`

**messages**:
- `user_id`, `email_account_id`, `provider_message_id`, `provider_thread_id`, `folder_type`, `from_email`, `from_name`, `to_recipients`, `subject`, `snippet`, `body_text`, `body_html`, `message_date`, `is_unread`, `is_starred`, `has_attachments`, `categories`, `importance`

**notification_queue**:
- `user_id`, `email_account_id` (nullable), `type`, `title`, `message`, `read`, `link`

**folder_mappings**:
- `user_id`, `email_account_id`, `provider_folder_id`, `folder_name`, `folder_type`, `is_system_folder`

### Schema Migrations

If you've applied migration `008_add_account_to_notifications.sql`, the `email_account_id` column should exist in `notification_queue`. If not, notifications will be created without account association (acceptable for testing).

## Next Steps

1. **Extend test data**: Add more realistic email content, attachments, etc.
2. **Add test helpers**: Create helper functions for common test scenarios
3. **Snapshot testing**: Capture visual regression tests
4. **Performance testing**: Test with larger datasets (1000+ messages)
5. **Cross-account testing**: Verify no data leakage between accounts

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Supabase Testing Guide](https://supabase.com/docs/guides/getting-started/testing)
- [Next.js Testing](https://nextjs.org/docs/testing)
