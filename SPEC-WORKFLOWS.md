# SPEC-WORKFLOWS.md — EaseMail v2

---

## GATE 2 — STATE MACHINES & WORKFLOWS

### WF-1: USER REGISTRATION & ONBOARDING

States: `SIGNUP → EMAIL_VERIFY → ONBOARDING → ACTIVE`

```
SIGNUP:
  User fills: email, password, name
  → Supabase auth.signUp() with email confirmation
  → Creates users row with onboarding_completed=false, onboarding_step=0
  → Creates user_preferences row with defaults
  → Sends welcome email via Resend
  → → EMAIL_VERIFY

EMAIL_VERIFY:
  User clicks email link → /auth/callback
  → Supabase confirms email
  → Redirects to /onboarding
  → → ONBOARDING

ONBOARDING:
  16-step flow (see SPEC-ONBOARDING.md)
  Each step updates onboarding_step
  On final step → onboarding_completed=true
  → → ACTIVE

ACTIVE:
  User has full access to /app/*
  If onboarding_completed=false, always redirect to /onboarding
```

### WF-2: EMAIL ACCOUNT CONNECTION (OAuth2 + PKCE)

States: `INIT → OAUTH_REDIRECT → CALLBACK → TOKEN_STORE → INITIAL_SYNC → CONNECTED`

```
INIT:
  User clicks "Connect Microsoft" or "Connect Google"
  → Generate state + PKCE code_verifier + code_challenge
  → Store state + code_verifier in httpOnly cookie (5min TTL)

OAUTH_REDIRECT:
  Microsoft: redirect to login.microsoftonline.com/common/oauth2/v2.0/authorize
    scopes: openid profile email offline_access
            Mail.ReadWrite Mail.Send MailboxSettings.ReadWrite
            Calendars.ReadWrite Contacts.Read
            OnlineMeetings.ReadWrite User.Read
  Google: redirect to accounts.google.com/o/oauth2/v2/auth
    scopes: openid profile email
            https://www.googleapis.com/auth/gmail.modify
            https://www.googleapis.com/auth/gmail.send
            https://www.googleapis.com/auth/calendar
            https://www.googleapis.com/auth/contacts.readonly
  → → CALLBACK

CALLBACK (/api/auth/oauth/callback):
  Verify state cookie matches
  Exchange code for tokens (with code_verifier for PKCE)
  → → TOKEN_STORE

TOKEN_STORE:
  Create email_accounts row (provider, email from token)
  Create oauth_tokens row:
    - access_token: pgp_sym_encrypt(token, ENCRYPTION_KEY)
    - refresh_token: pgp_sym_encrypt(refresh, ENCRYPTION_KEY)
    - token_expires_at: from token response
    - scopes: from token response
  Create sync_checkpoints rows (messages, folders, calendar, contacts)
  If first account → set is_primary=true
  → → INITIAL_SYNC

INITIAL_SYNC:
  Set email_accounts.sync_status = 'syncing'
  1. Sync folders → folder_mappings (map to standard folder_types)
  2. Sync messages (last 30 days) → messages table
     - Use batch: Graph /me/mailFolders/{id}/messages?$top=50
     - Use batch: Gmail users.messages.list + users.messages.get
     - Deduplicate via UNIQUE(email_account_id, provider_message_id)
  3. Sync calendars → calendar_metadata
  4. Sync contacts (top 100) → contacts table
  5. Save delta token / history ID to sync_checkpoints
  Set sync_status = 'idle'
  → → CONNECTED

CONNECTED:
  Account visible in sidebar
  Delta sync runs every 5 minutes via cron
  Webhooks (Graph subscriptions / Gmail push) for real-time
```

### WF-3: TOKEN REFRESH (Proactive)

States: `VALID → REFRESHING → VALID` or `REFRESHING → REAUTH_REQUIRED`

```
VALID:
  Token not expired. Use normally.
  Check: if token_expires_at < NOW() + INTERVAL '5 minutes' → REFRESHING

REFRESHING:
  1. SELECT ... FOR UPDATE on oauth_tokens row (row lock prevents race)
  2. Re-check: if token was already refreshed by another request, use new token
  3. Call provider refresh endpoint:
     - Microsoft: POST /common/oauth2/v2.0/token with grant_type=refresh_token
     - Google: POST /token with grant_type=refresh_token
  4. Update oauth_tokens: new access_token, new expires_at, maybe new refresh_token
  5. Release lock
  → → VALID

  On error (refresh token revoked/expired):
  Set email_accounts.sync_status = 'error'
  Set email_accounts.error_message = 'Re-authentication required'
  Show banner in UI: "Your {provider} connection needs to be refreshed. [Reconnect]"
  → → REAUTH_REQUIRED (user must redo OAuth flow)
```

### WF-4: EMAIL SYNC (Delta / Incremental)

States: `IDLE → SYNCING → IDLE` or `SYNCING → ERROR`

```
IDLE:
  Triggered by: cron (every 5 min) OR webhook OR manual refresh button

SYNCING:
  1. Get sync_checkpoint for this account + 'messages'
  2. Get valid access token (trigger WF-3 if needed)
  3. Microsoft Graph:
     GET /me/mailFolders/delta?$deltatoken={cursor}
     GET /me/messages/delta?$deltatoken={cursor}&$select=subject,from,toRecipients,...
     Process changes: created → INSERT, updated → UPDATE, deleted → DELETE
  4. Gmail:
     GET users/me/history?startHistoryId={cursor}&historyTypes=messageAdded,messageDeleted,labelAdded,labelRemoved
     For new messages: GET users/me/messages/{id}?format=full
     Process changes accordingly
  5. Upsert messages (ON CONFLICT email_account_id, provider_message_id DO UPDATE)
  6. Update folder counts (unread_count, total_count)
  7. Save new cursor to sync_checkpoints
  8. Update email_accounts.last_synced_at
  → → IDLE

  On error:
  Increment sync_checkpoints.error_count
  If error_count >= 3 → set sync_status='error', pause sync
  Save error to sync_checkpoints.last_error
  → → ERROR (user sees warning, can retry manually)
```

### WF-5: EMAIL COMPOSE & SEND

States: `COMPOSING → DRAFT_SAVED → SENDING → SENT` or `SENDING → FAILED`

```
COMPOSING:
  User opens composer (new, reply, forward)
  Auto-save to drafts table every 30 seconds (debounced)
  On explicit save → upsert draft with auto_saved=false

DRAFT_SAVED:
  Draft exists in local DB
  Optionally sync to provider draft folder:
    Graph: POST /me/messages (isDraft=true)
    Gmail: POST users/me/drafts
  Store provider_draft_id for later sync

SENDING:
  User clicks Send:
  1. Validate recipients (at least one TO)
  2. Sanitize HTML body (DOMPurify)
  3. Attach signature if configured
  4. Upload attachments to provider
  5. Send via provider:
     Graph: POST /me/sendMail { message: { subject, body, toRecipients, ... } }
     Gmail: POST users/me/messages/send (base64 RFC 2822)
  6. Delete local draft
  7. Log to usage_tracking (feature='email_send')
  → → SENT

  On error:
  Keep draft intact
  Show toast: "Failed to send. Your draft has been saved. [Retry]"
  → → FAILED (user can retry from draft)
```

### WF-6: SCHEDULED EMAIL

States: `SCHEDULED → QUEUED → SENDING → SENT` or `SENDING → RETRY → SENT/FAILED`

```
SCHEDULED:
  User composes email, clicks "Schedule" instead of "Send"
  Picks date/time → creates scheduled_emails row with status='queued'
  Shows in Scheduled folder

QUEUED:
  Cron job runs every minute:
  SELECT * FROM scheduled_emails
  WHERE status = 'queued' AND scheduled_for <= NOW()
  For each: attempt send via WF-5

SENDING:
  Same as WF-5 send flow
  On success: status='sent', sent_at=NOW(), delete from scheduled view
  → → SENT

  On error:
  retry_count += 1
  If retry_count < 3 → status stays 'queued', try again next cron cycle
  If retry_count >= 3 → status='failed', show notification to user
  → → RETRY or FAILED
```

### WF-7: EMAIL SNOOZE

States: `SNOOZED → ACTIVE`

```
SNOOZED:
  User snoozes message → create snoozed_emails row
  Move message to 'snoozed' folder_type locally
  Set snooze_until to chosen datetime

UNSNOOZE (cron every minute):
  SELECT * FROM snoozed_emails
  WHERE snooze_until <= NOW() AND unsnoozed = false
  For each:
  1. Update message folder_type back to original_folder_type
  2. Mark message as is_unread=true (so it appears as new)
  3. Set snoozed_emails.unsnoozed = true
  4. Create notification: "Snoozed email from {sender} is back"
  → → ACTIVE
```

### WF-8: EMAIL RULES ENGINE

Trigger: Every new message synced from provider

```
ON NEW MESSAGE:
  1. Load user's active rules ordered by priority ASC
  2. For each rule:
     a. Evaluate conditions against message:
        - from_email CONTAINS/EQUALS/REGEX value
        - subject CONTAINS/EQUALS/REGEX value
        - to_email CONTAINS/EQUALS value
        - has_attachments = true/false
        - importance = low/normal/high
     b. Match mode: ALL conditions must match ('all') or ANY ('any')
     c. If match, execute actions:
        - move_to_folder: update message folder_type
        - add_label: insert message_labels row
        - mark_read: set is_unread=false
        - mark_starred: set is_starred=true
        - forward_to: trigger WF-5 to forward
        - delete: move to trash
        - categorize: set categories array
     d. Increment rule.applied_count
  3. Stop after first matching rule (if stop_after_match=true) or continue all
```

### WF-9: AI REMIX

States: `DRAFT → AI_PROCESSING → PREVIEW → ACCEPT/REJECT`

```
DRAFT:
  User has text in composer
  Clicks AI Remix button → picks tone: Professional, Friendly, Brief, Detailed

AI_PROCESSING:
  POST /api/ai/remix
  Body: { content: composerHTML, tone: 'professional' }
  Server:
    1. Rate limit check (10/min per user)
    2. Strip HTML → plain text
    3. Call OpenAI GPT-4o:
       System: "You are an email writing assistant. Rewrite the following email in a {tone} tone. Maintain the original intent and key information. Return only the rewritten email body, no preamble."
       User: {plain text}
    4. Track usage: usage_tracking(feature='ai_remix')
    5. Return { original, rewritten, suggested_subject }

PREVIEW:
  Show side-by-side: original vs rewritten
  User can: Accept, Reject, Try Different Tone

ACCEPT:
  Replace composer content with rewritten version
  Optionally update subject line

REJECT:
  Keep original content, close preview
```

### WF-10: AI DICTATE

States: `RECORDING → TRANSCRIBING → POLISHING → PREVIEW → ACCEPT`

```
RECORDING:
  User clicks microphone in composer
  Browser MediaRecorder API captures audio
  Visual indicator shows recording in progress
  User clicks stop or pauses

TRANSCRIBING:
  POST /api/ai/dictate
  Body: FormData with audio blob (webm/opus)
  Server:
    1. Rate limit check
    2. Send to OpenAI Whisper: transcriptions.create({ file, model: 'whisper-1' })
    3. Get raw transcription text

POLISHING:
  Same API call continues:
    4. Send transcription to GPT-4o:
       System: "Convert this voice transcription into a well-formatted email. Fix grammar, add proper greeting and sign-off. Maintain the speaker's intent."
       User: {transcription}
    5. Track usage: usage_tracking(feature='ai_dictate')
    6. Return { raw_transcription, polished_email, suggested_subject }

PREVIEW:
  Show polished email in composer with "Edit" option
  User can switch between raw transcription and polished version

ACCEPT:
  Insert into composer, user can edit before sending
```

### WF-11: AI CALENDAR EVENT EXTRACTION

Trigger: User clicks "Create Event" on an email, or AI auto-detects

```
DETECT:
  When viewing an email, scan body for date/time patterns
  If found, show subtle chip: "📅 Event detected — Create?"

EXTRACT:
  POST /api/ai/extract-event
  Body: { email_body, email_subject, from_email }
  Server:
    1. Call GPT-4o:
       System: "Extract calendar event details from this email. Return JSON: {title, date, start_time, end_time, location, attendees: [{email, name}], description}. If any field cannot be determined, use null."
       User: "Subject: {subject}\nFrom: {from}\n\n{body}"
    2. Parse JSON response
    3. Return extracted event data

CONFIRM:
  Pre-fill calendar event form with extracted data
  User reviews and can edit any field
  Check for conflicts: query calendar_events for overlapping time
  If conflict → show warning with alternative slots

CREATE:
  POST to provider calendar:
    Graph: POST /me/calendar/events
    Google: POST /calendars/primary/events
  Save to local calendar_events table
  Send invites to attendees (provider handles this)
  Show confirmation toast
```

### WF-12: AI EMAIL CATEGORIZATION

Trigger: Every new message during sync

```
ON NEW MESSAGE (batch of up to 20):
  POST /api/ai/categorize (server-side only, called during sync)
  Body: { messages: [{id, from, subject, snippet}] }
  Server:
    1. Call GPT-4o with batch:
       System: "Categorize each email into exactly one category: 'people' (from real humans), 'newsletter' (subscriptions, marketing), 'notification' (automated: shipping, receipts, alerts), 'promotion' (ads, sales), 'social' (social media notifications). Return JSON array [{id, category}]."
    2. Update messages.categories for each
    3. Track usage: usage_tracking(feature='ai_categorize')

  Used by Smart Inbox feature to group messages by category.
```

### WF-13: ORGANIZATION LIFECYCLE

States: `CREATED → ACTIVE → SUSPENDED → DELETED`

```
CREATED:
  Org owner creates org:
  1. Create organizations row
  2. Create organization_members row (role='owner')
  3. Update user.role to 'ORG_OWNER'
  4. Create subscription with trial_end = NOW() + 14 days
  5. Send org welcome email

ACTIVE:
  Org in use. Members can be invited, seats managed.

INVITE MEMBER:
  1. Check seats_used < seats (or prompt to upgrade)
  2. Create organization_invites row with token + 7-day expiry
  3. Send invite email with link: /invite/{token}
  4. Recipient clicks → /api/invites/accept
     a. If user exists → add to org_members, update invite status
     b. If user doesn't exist → redirect to signup with invite token in session
     c. After signup/login → auto-accept invite, add to org
  5. Increment seats_used

REMOVE MEMBER:
  1. Check: cannot remove owner (must transfer first)
  2. Delete organization_members row
  3. Decrement seats_used
  4. Send removal email to user
  5. Update user.role to 'INDIVIDUAL' if no other org memberships

TRANSFER OWNERSHIP:
  1. Current owner selects new owner from members
  2. Update old owner: role='admin' in org_members, is_admin=true
  3. Update new owner: role='owner' in org_members
  4. Update new owner user.role to 'ORG_OWNER'
  5. Send notification emails to both
  6. Log in audit_logs

SUSPENDED:
  Subscription past_due for >30 days
  Members can still read but cannot send, use AI, or add accounts
  Banner: "Your subscription is past due. [Update payment]"

DELETED:
  Owner deletes org
  1. Cancel Stripe subscription
  2. Remove all members (set to INDIVIDUAL)
  3. Delete organization + cascade
  4. Send confirmation email to owner
```

### WF-14: BILLING (Stripe)

States: `FREE → TRIALING → ACTIVE → PAST_DUE → CANCELED`

```
FREE:
  Default state. Limited features:
  - 1 email account
  - 5 AI remixes/day
  - No SMS
  - No scheduled sends
  - No email rules
  - Basic search

TRIALING:
  14-day free trial of PRO features
  No card required
  Banner shows days remaining
  At trial end → if no card → downgrade to FREE
  At trial end → if card added → charge and activate

ACTIVE:
  Plans (placeholder pricing):
  PRO: $X/user/month — unlimited AI, scheduled sends, rules, 3 accounts
  BUSINESS: $X/user/month — everything in PRO + SMS, Teams, API access, 10 accounts
  ENTERPRISE: Custom — SSO, dedicated support, custom branding, unlimited accounts

  Stripe handles:
  - Monthly/annual billing
  - Seat-based pricing (quantity = seats)
  - Proration on seat changes
  - Invoice generation

PAST_DUE:
  Stripe fires invoice.payment_failed webhook
  Update subscription_status = 'past_due'
  Send email: "Payment failed. Please update your payment method."
  Retry automatically (Stripe Smart Retries)
  After 3 failures → restrict features (read-only mode)

CANCELED:
  User cancels → subscription runs until period end
  At period end → downgrade to FREE
  Data retained for 90 days, then eligible for cleanup
```

### WF-15: SUPER ADMIN WORKFLOWS

```
USER MANAGEMENT:
  /app/admin/users — paginated table of all users
  Search by email, name
  Filter by role, plan, created_at
  Actions: edit profile, reset password, toggle super_admin, delete account

ORG MANAGEMENT:
  /app/admin/organizations — paginated table of all orgs
  Search by name, domain
  Filter by plan, status
  Actions: edit org, manage members, view billing, delete org

ANALYTICS DASHBOARD:
  /app/admin/analytics
  - Total users, active users (7d/30d)
  - Total organizations
  - MRR/ARR calculation from active subscriptions
  - Revenue history chart (line chart, 12 months)
  - Signup trend (bar chart, 30 days)
  - Feature usage breakdown (pie chart)
  - Top users by email volume

IMPERSONATION:
  Admin clicks "Impersonate" on user row
  Enter reason (required) → creates impersonate_sessions row
  Redirected to /app/inbox as that user (read-only)
  Persistent top banner: "Impersonating {name} ({email}). Reason: {reason}. [End Session]"
  End session → redirect back to admin panel

SYSTEM SETTINGS:
  /app/admin/settings
  Key-value pairs: maintenance_mode, default_plan, trial_days, max_accounts_free, etc.
  Changes logged in audit_logs
```

### WF-16: GATEKEEPER (New Sender Screening)

```
CONFIGURATION (during onboarding or settings):
  User chooses:
  A) Screen before inbox — new senders held at top, must Accept/Block
  B) Screen inside inbox — new senders appear with "NEW SENDER" badge + Accept/Block
  C) Off — all emails appear normally

ON NEW MESSAGE FROM UNKNOWN SENDER:
  1. Check if from_email exists in contacts OR priority_senders
  2. If not: this is a "new sender"
  3. Based on gatekeeper mode:
     A) Hold in special "screening" area at top of inbox
     B) Show in inbox with "NEW SENDER" badge
     C) Show normally
  4. User clicks Accept → add to contacts, mark as known
  5. User clicks Block → add to priority_senders with is_blocked=true
     → Future emails from this sender go directly to spam
```

### WF-17: PRIORITY INBOX

```
DISPLAY ORDER:
  1. Priority senders (is_priority_sender=true) — always at top, highlighted
  2. People emails (category='people') — real humans
  3. Newsletters (category='newsletter') — grouped by sender if grouping enabled
  4. Notifications (category='notification') — grouped
  5. Promotions (category='promotion') — grouped

SENDER GROUPING (if enabled):
  Emails from same sender within same day → collapsed into single row
  "Frequent sender 4 • Reservation confirmation" (4 = number of grouped emails)
  Click to expand and see all individual emails
```

### WF-18: CALENDAR SYNC

```
INITIAL SYNC:
  After email account connected:
  1. Fetch all calendars: Graph GET /me/calendars, Gmail GET /calendars/calendarList
  2. Store in calendar_metadata
  3. For primary calendar: fetch events (next 90 days + past 30 days)
  4. Store in calendar_events
  5. Save sync cursor

DELTA SYNC (every 5 min via cron):
  1. Use delta token: Graph GET /me/calendarView/delta
  2. Gmail: use syncToken from previous list call
  3. Process changes (created, updated, deleted)
  4. Update local calendar_events

EVENT CRUD:
  All event creates/updates/deletes go through provider API first,
  then update local table. Local is always secondary to provider.

CONFLICT DETECTION:
  Before creating event, query:
  SELECT * FROM calendar_events
  WHERE user_id = $1
  AND start_time < $new_end AND end_time > $new_start
  If results → warn user: "You have a conflict with {title} at {time}. Continue?"
```

### WF-19: CONTACT SYNC & AUTO-CREATE

```
INITIAL SYNC:
  Graph: GET /me/contacts?$top=100&$orderby=displayName
  Gmail: GET /people/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers

AUTO-CREATE:
  When user sends an email to a new address:
  1. Check if contact exists for that email
  2. If not → create contact with source='auto'
  3. Increment email_count

ENRICHMENT:
  When viewing a contact, show:
  - Email count (how many emails exchanged)
  - Last emailed date
  - All email threads with this contact
  - Calendar events with this contact as attendee
```

### WF-20: SEARCH

```
QUICK SEARCH (Cmd+K / command palette):
  1. Search contacts: name, email
  2. Search messages: subject, body (full-text via tsvector index)
  3. Search folders: navigate to folder
  4. Search actions: "compose new email", "go to calendar", etc.

ADVANCED SEARCH:
  Filters: from, to, subject, has:attachment, is:unread, is:starred,
           before:date, after:date, in:folder, label:name
  Uses Postgres full-text search with ts_rank for relevance
  Results paginated with cursor (keyset pagination, not OFFSET)
```
