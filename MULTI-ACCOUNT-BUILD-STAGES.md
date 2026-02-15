# MULTI-ACCOUNT SUPPORT - BUILD STAGES

## Overview
This document breaks down the multi-account support implementation into 6 discrete build stages. Each stage can be completed in a separate Claude Code session to avoid context loss.

**Total Estimated Time**: ~5 hours across 6 stages
**Files to Create**: 3
**Files to Modify**: 15
**Database Migrations**: 1

---

## STAGE 1: Core Infrastructure (Context + Hook + Switcher)
**Estimated Time**: 45 minutes
**Dependencies**: None
**Files to Create**: 3
**Files to Modify**: 1

### Prompt for Stage 1

```
I'm implementing multi-account support for this email application. This is STAGE 1 of 6: Core Infrastructure.

CONTEXT:
- Database schema already supports multiple email accounts (email_accounts table with user_id FK)
- All messages, folder_mappings, and calendar_events have email_account_id FK
- Currently, queries filter by user_id only - we need to add email_account_id filtering
- User should be able to switch between connected accounts via a dropdown in the sidebar

STAGE 1 TASKS:
1. Create React Context for account selection state (src/contexts/account-context.tsx)
2. Create custom hook for accessing account context (src/hooks/use-account.ts)
3. Create account switcher dropdown component (src/components/app/account-switcher.tsx)
4. Wrap app layout with AccountProvider (src/app/(app)/layout.tsx)

REQUIREMENTS:
- Context should:
  - Store selectedAccountId (string | null)
  - Provide setSelectedAccount function
  - Persist selection to localStorage
  - Load all user's email accounts from database
  - Default to primary account, or first account if none marked primary
  - Expose accounts array and loading state

- Account switcher should:
  - Show current account email address
  - Dropdown to select from all connected accounts
  - Display account email and a checkmark for selected account
  - "Add Account" button that links to /app/settings/accounts
  - Use shadcn/ui Select or DropdownMenu component
  - Match existing sidebar styling

- Hook should:
  - Return { selectedAccountId, setSelectedAccount, accounts, loading }
  - Handle null/undefined states gracefully

ACCEPTANCE CRITERIA:
- AccountProvider wraps the app layout
- Account switcher appears in sidebar above navigation items
- Selecting an account persists to localStorage
- Refreshing page maintains selected account
- No console errors or warnings
- Component is client-side ('use client')

FILES TO CREATE:
1. src/contexts/account-context.tsx
2. src/hooks/use-account.ts
3. src/components/app/account-switcher.tsx

FILES TO MODIFY:
1. src/app/(app)/layout.tsx - wrap children with AccountProvider

When complete, update MULTI-ACCOUNT-BUILD-PROGRESS.md with Stage 1 status.
```

### Acceptance Criteria
- [ ] AccountProvider created with localStorage persistence
- [ ] useAccount hook exports selectedAccountId, setSelectedAccount, accounts, loading
- [ ] Account switcher component displays current account and dropdown
- [ ] Layout wraps children with AccountProvider
- [ ] Switching accounts updates localStorage
- [ ] Page refresh maintains selected account
- [ ] No TypeScript errors
- [ ] No console warnings

---

## STAGE 2: Core Filtering (Inbox, Folders, Nav)
**Estimated Time**: 1 hour
**Dependencies**: Stage 1 complete
**Files to Create**: 0
**Files to Modify**: 4

### Prompt for Stage 2

```
I'm implementing multi-account support for this email application. This is STAGE 2 of 6: Core Filtering.

CONTEXT:
- Stage 1 is complete: AccountProvider, useAccount hook, and account switcher are working
- Users can now switch between accounts, but all pages still show messages from ALL accounts
- Need to filter messages, folders, and navigation by selectedAccountId

STAGE 2 TASKS:
1. Update smart-inbox to filter by selectedAccountId (src/components/inbox/smart-inbox.tsx)
2. Update folder-view to filter by selectedAccountId (src/components/inbox/folder-view.tsx)
3. Update app-nav custom folders to filter by selectedAccountId (src/components/app/app-nav.tsx)
4. Update inbox page to filter message count by selectedAccountId (src/app/(app)/app/inbox/page.tsx)

REQUIREMENTS:
- All Supabase queries that fetch messages or folders MUST add:
  .eq('email_account_id', selectedAccountId)

- Handle loading state: if selectedAccountId is null/undefined, show loading or empty state

- In smart-inbox.tsx:
  - Import useAccount hook
  - Add selectedAccountId filter to ALL 6 category queries (priority, people, newsletters, updates, forums, other)
  - Add to unread count queries
  - Show loading state while selectedAccountId is null

- In folder-view.tsx:
  - Import useAccount hook
  - Add selectedAccountId filter to messages query
  - Handle null selectedAccountId gracefully

- In app-nav.tsx:
  - Import useAccount hook
  - Filter custom folders by selectedAccountId
  - Only show folders for the selected account

- In inbox page.tsx:
  - Filter message count query by selectedAccountId
  - This is a server component, so pass selectedAccountId from client wrapper if needed
    OR convert relevant parts to client component

ACCEPTANCE CRITERIA:
- Switching accounts updates inbox to show only that account's messages
- Custom folders in sidebar only show folders for selected account
- Message counts reflect selected account only
- No messages from other accounts visible
- Loading states handle null selectedAccountId
- No TypeScript errors
- No console warnings

FILES TO MODIFY:
1. src/components/inbox/smart-inbox.tsx
2. src/components/inbox/folder-view.tsx
3. src/components/app/app-nav.tsx
4. src/app/(app)/app/inbox/page.tsx

When complete, update MULTI-ACCOUNT-BUILD-PROGRESS.md with Stage 2 status.
```

### Acceptance Criteria
- [ ] Smart inbox filters all category queries by selectedAccountId
- [ ] Folder view filters messages by selectedAccountId
- [ ] App nav filters custom folders by selectedAccountId
- [ ] Inbox page message count filtered by selectedAccountId
- [ ] Switching accounts updates all views immediately
- [ ] No cross-account message leakage
- [ ] Loading states work correctly
- [ ] No TypeScript errors

---

## STAGE 3: Composer Account Selector
**Estimated Time**: 45 minutes
**Dependencies**: Stage 1 complete
**Files to Create**: 0
**Files to Modify**: 1

### Prompt for Stage 3

```
I'm implementing multi-account support for this email application. This is STAGE 3 of 6: Composer Account Selector.

CONTEXT:
- Stage 1 is complete: AccountProvider and useAccount hook are working
- Stage 2 is complete: Messages are filtered by selectedAccountId
- Users can now view messages for each account, but when composing, they can't choose which account to send from
- Need to add an account selector to the composer

STAGE 3 TASKS:
1. Update composer to include account selector (src/components/email/composer.tsx)
2. Default to currently selected account from useAccount
3. Allow user to override and select a different account for sending
4. Pass selected account to sendMessage action

REQUIREMENTS:
- Add account selector dropdown to composer UI
  - Place it near the "From:" field or as the "From:" field itself
  - Use shadcn/ui Select component
  - Show account email address as the option label
  - Default to selectedAccountId from useAccount hook

- Add state for fromAccountId (separate from global selectedAccountId)
  - Initialize to selectedAccountId on mount
  - Allow user to change it independently

- When sending email:
  - Pass fromAccountId to sendMessage server action
  - Ensure server action uses the correct email_account_id for the sent message
  - Ensure message is saved with correct email_account_id

- Handle edge cases:
  - If user has no accounts connected, show disabled state
  - If selectedAccountId changes while composing, keep fromAccountId unchanged (user's choice persists)

ACCEPTANCE CRITERIA:
- Composer shows account selector dropdown
- Default account matches currently selected account in sidebar
- User can choose different account for sending
- Sent message is saved with correct email_account_id
- Sent message appears in correct account's "Sent" folder
- No TypeScript errors
- No console warnings

FILES TO MODIFY:
1. src/components/email/composer.tsx

NOTES:
- You may also need to update src/lib/actions/message.ts if sendMessage doesn't accept email_account_id parameter yet
- Verify that Microsoft Graph API sends email from the correct account when multiple are connected

When complete, update MULTI-ACCOUNT-BUILD-PROGRESS.md with Stage 3 status.
```

### Acceptance Criteria
- [ ] Composer has account selector dropdown
- [ ] Defaults to currently selected account
- [ ] User can override to send from different account
- [ ] Sent messages saved with correct email_account_id
- [ ] Sent messages appear in correct account's sent folder
- [ ] No TypeScript errors

---

## STAGE 4: Search & Notifications
**Estimated Time**: 1 hour
**Dependencies**: Stage 1 complete
**Files to Create**: 0
**Files to Modify**: 3
**Database Migrations**: 1

### Prompt for Stage 4

```
I'm implementing multi-account support for this email application. This is STAGE 4 of 6: Search & Notifications.

CONTEXT:
- Stages 1-3 are complete: Account switching, filtering, and composer are working
- Search currently searches ALL user messages across all accounts
- Notifications currently don't specify which account triggered them
- Need to scope search to selected account and add account context to notifications

STAGE 4 TASKS:
1. Create database migration to add email_account_id to notification_queue table
2. Update message search to filter by selectedAccountId (src/lib/actions/message.ts)
3. Update notification creation to include email_account_id (src/lib/sync/event-handlers.ts)
4. Update notification display to show which account the notification is for (src/components/notifications/notification-panel.tsx)

REQUIREMENTS:

**Migration (supabase/migrations/XXX_add_account_to_notifications.sql):**
```sql
-- Add email_account_id to notification_queue
ALTER TABLE notification_queue
ADD COLUMN email_account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE;

-- Add index for filtering
CREATE INDEX idx_notification_queue_account ON notification_queue(email_account_id);

-- Backfill existing notifications (set to null or attempt to derive from related message_id)
-- For simplicity, we can leave existing notifications with NULL email_account_id
```

**Message Search:**
- In src/lib/actions/message.ts, update searchMessages() to:
  - Accept email_account_id parameter
  - Add .eq('email_account_id', accountId) to query
  - Return only messages from specified account

**Event Handlers:**
- In src/lib/sync/event-handlers.ts:
  - When creating notifications, include email_account_id from the message or event
  - Ensure all notification inserts include email_account_id

**Notification Panel:**
- In src/components/notifications/notification-panel.tsx:
  - Fetch account details for each notification
  - Display account email address in notification (e.g., "New email in account@example.com")
  - Group notifications by account or show account badge

ACCEPTANCE CRITERIA:
- Migration runs successfully
- Search only returns results from selected account
- New notifications include email_account_id
- Notification panel shows which account each notification is from
- Clicking notification switches to correct account (if not already selected)
- No TypeScript errors
- No console warnings

FILES TO CREATE:
1. supabase/migrations/XXX_add_account_to_notifications.sql

FILES TO MODIFY:
1. src/lib/actions/message.ts
2. src/lib/sync/event-handlers.ts
3. src/components/notifications/notification-panel.tsx

When complete, update MULTI-ACCOUNT-BUILD-PROGRESS.md with Stage 4 status.
```

### Acceptance Criteria
- [ ] Migration adds email_account_id to notification_queue
- [ ] Search filters by selectedAccountId
- [ ] New notifications include email_account_id
- [ ] Notification panel shows account context
- [ ] Clicking notification switches to correct account
- [ ] No TypeScript errors
- [ ] Migration runs without errors

---

## STAGE 5: Admin Panel Updates
**Estimated Time**: 45 minutes
**Dependencies**: Stage 1 complete
**Files to Create**: 0
**Files to Modify**: 2

### Prompt for Stage 5

```
I'm implementing multi-account support for this email application. This is STAGE 5 of 6: Admin Panel Updates.

CONTEXT:
- Stages 1-4 are complete: Account switching, filtering, composer, search, and notifications are working
- Admin panel currently shows "1 user" but doesn't show how many email accounts are connected
- Need to update admin metrics to show account counts and per-account stats

STAGE 5 TASKS:
1. Update admin users page to show account count per user (src/app/(app)/app/admin/users/page.tsx)
2. Update admin dashboard to show total accounts and account-level metrics (src/app/(app)/app/admin/page.tsx)

REQUIREMENTS:

**Admin Users Page:**
- Add column: "Email Accounts" showing count of connected accounts per user
- Query: JOIN or count from email_accounts table grouped by user_id
- Display: "2 accounts" or "1 account"
- Click to expand: show list of connected email addresses for that user

**Admin Dashboard:**
- Add metric card: "Total Email Accounts" (count of all email_accounts where is_active = true)
- Add metric card: "Avg Accounts/User" (total accounts / total users)
- Update "Total Messages" metric to show breakdown by account (optional, nice to have)
- Add filter: View metrics for a specific account (dropdown at top)

**Edge Cases:**
- Users with 0 accounts should show "0 accounts"
- Deleted/inactive accounts should not be counted in metrics
- Super admin should see aggregate stats across all users and all accounts

ACCEPTANCE CRITERIA:
- Admin users page shows account count per user
- Admin dashboard shows total email accounts metric
- Metrics accurately reflect active accounts only
- Super admin sees aggregate stats, not duplicated counts
- No TypeScript errors
- No console warnings

FILES TO MODIFY:
1. src/app/(app)/app/admin/users/page.tsx
2. src/app/(app)/app/admin/page.tsx

When complete, update MULTI-ACCOUNT-BUILD-PROGRESS.md with Stage 5 status.
```

### Acceptance Criteria
- [ ] Admin users page shows email account count per user
- [ ] Admin dashboard shows total email accounts metric
- [ ] Metrics reflect active accounts only
- [ ] Super admin sees correct aggregate stats
- [ ] No duplicate counting
- [ ] No TypeScript errors

---

## STAGE 6: Sent, Archive, Trash Pages
**Estimated Time**: 45 minutes
**Dependencies**: Stage 2 complete
**Files to Create**: 1
**Files to Modify**: 2

### Prompt for Stage 6

```
I'm implementing multi-account support for this email application. This is STAGE 6 of 6: Sent, Archive, Trash Pages.

CONTEXT:
- Stages 1-5 are complete: Account switching, filtering, composer, search, notifications, and admin are working
- Archive and Trash pages already use FolderView component which was updated in Stage 2
- Sent page does NOT exist yet and needs to be created
- Need to verify archive/trash work correctly and create sent page

STAGE 6 TASKS:
1. Create Sent page (src/app/(app)/app/sent/page.tsx)
2. Verify archive page filters by selectedAccountId (src/app/(app)/app/archive/page.tsx)
3. Verify trash page filters by selectedAccountId (src/app/(app)/app/trash/page.tsx)

REQUIREMENTS:

**Sent Page:**
- Create page at src/app/(app)/app/sent/page.tsx
- Use FolderView component with folderType="sent"
- Page structure should match archive and trash pages
- Title: "Sent"
- Description: "Sent messages"
- FolderView will automatically filter by selectedAccountId (handled in Stage 2)

**Archive Page Verification:**
- Confirm FolderView is being used with folderType="archive"
- Confirm it filters by selectedAccountId (should already work from Stage 2)
- No changes needed unless broken

**Trash Page Verification:**
- Confirm FolderView is being used with folderType="trash"
- Confirm it filters by selectedAccountId (should already work from Stage 2)
- No changes needed unless broken

**Testing:**
- Switch between accounts
- Verify sent messages only show for selected account
- Verify archive messages only show for selected account
- Verify trash messages only show for selected account
- Verify clicking "Sent" in sidebar navigates to /app/sent

ACCEPTANCE CRITERIA:
- Sent page exists and displays sent messages
- Sent page filters by selectedAccountId
- Archive page filters by selectedAccountId
- Trash page filters by selectedAccountId
- Switching accounts updates all three pages
- No TypeScript errors
- No console warnings

FILES TO CREATE:
1. src/app/(app)/app/sent/page.tsx

FILES TO VERIFY (no changes expected):
1. src/app/(app)/app/archive/page.tsx
2. src/app/(app)/app/trash/page.tsx

When complete, update MULTI-ACCOUNT-BUILD-PROGRESS.md with Stage 6 status and mark MULTI-ACCOUNT SUPPORT as COMPLETE.
```

### Acceptance Criteria
- [ ] Sent page created and displays sent messages
- [ ] Sent page filters by selectedAccountId
- [ ] Archive page filters by selectedAccountId (verified)
- [ ] Trash page filters by selectedAccountId (verified)
- [ ] Switching accounts updates all pages
- [ ] No TypeScript errors

---

## Stage Dependencies

```
Stage 1 (Infrastructure)
  ↓
  ├→ Stage 2 (Core Filtering) → Stage 6 (Sent/Archive/Trash)
  ├→ Stage 3 (Composer)
  ├→ Stage 4 (Search & Notifications)
  └→ Stage 5 (Admin Panel)
```

**Parallel Stages**: After Stage 1 is complete, Stages 2-5 can be done in any order. Stage 6 depends on Stage 2.

**Recommended Order**: 1 → 2 → 3 → 4 → 5 → 6 (sequential for clarity)

---

## Testing Checklist (After All Stages)

- [ ] Connect 2+ email accounts
- [ ] Switch between accounts in sidebar dropdown
- [ ] Verify inbox shows correct messages per account
- [ ] Verify custom folders only show for selected account
- [ ] Compose email from account A, verify it sends from A
- [ ] Compose email from account B, verify it sends from B
- [ ] Search only returns results for selected account
- [ ] Notifications show correct account context
- [ ] Sent page shows correct messages per account
- [ ] Archive page shows correct messages per account
- [ ] Trash page shows correct messages per account
- [ ] Admin panel shows correct account counts
- [ ] Refresh page maintains selected account
- [ ] Logout and login maintains account preferences
- [ ] No console errors across any page
- [ ] No TypeScript errors in build

---

## Rollback Plan

If a stage breaks existing functionality:

1. **Git revert** to before the stage
2. Review the stage prompt and acceptance criteria
3. Identify what broke (likely a missing filter or null check)
4. Re-attempt the stage with the fix
5. Verify acceptance criteria before proceeding

---

## Notes

- Each stage is designed to be completed in one Claude Code session
- Prompts include full context to avoid context loss
- Stages are independent after Stage 1 (can be parallelized if needed)
- Database migration in Stage 4 is optional for existing notifications (backfill can be skipped)
- Calendar sync is mentioned in schema but NOT implemented in these stages (future work)
