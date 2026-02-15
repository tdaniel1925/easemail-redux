# PROJECT-SPEC.md — EaseMail v2

---

## GATE 0 — IDENTITY

**App name:** EaseMail
**Tagline:** AI-powered email for modern teams
**Owner:** BotMakers Inc. (subsidiary of BioQuest Inc.)
**Domain:** easemail.ai (placeholder — use NEXT_PUBLIC_APP_URL)

**Tech stack:**
- Framework: Next.js 14 (App Router, Server Components, Server Actions)
- Database: Supabase (Postgres + Auth + Realtime + Storage)
- ORM: Supabase client (no Prisma, no Drizzle)
- UI: shadcn/ui + Radix + Tailwind CSS
- Rich text: TipTap (composer)
- Animation: Framer Motion
- State: TanStack React Query + Zustand (client state)
- Forms: React Hook Form + Zod
- Auth: Supabase Auth (email/password + magic link)
- Email sync: Microsoft Graph API (Outlook/Exchange) + Gmail API (Google)
- Calendar: Microsoft Graph Calendar + Google Calendar API
- Teams: Microsoft Graph Teams API
- AI: OpenAI GPT-4o (remix, dictate, extract, categorize) + Whisper (transcription)
- Billing: Stripe (subscriptions, invoices, seat management)
- Transactional email: Resend + React Email
- SMS: Twilio
- Hosting: Vercel
- File storage: Supabase Storage (avatars, attachments)

**NO Redis. NO Nylas. NO PayPal. NO Prisma.**

**Design identity:**
- Primary: Blue #4A90D9
- Accent: Indigo #6366F1
- Success: Emerald #10B981
- Warning: Amber #F59E0B
- Error: Rose #F43F5E
- Background light: #F8FAFC
- Background dark: #0F172A
- Card: white with subtle shadow, rounded-xl (12px)
- Font: Inter (body), system-ui fallback
- Preferred UI: Ledger-style with coral #FF7F50 accents, mesh gradients, rounded cards
- Themes: Light + Dark (toggle in settings, system preference detection)

**User roles (4):**
1. `SUPER_ADMIN` — BotMakers staff. Full system access. Separate admin panel at /app/admin.
2. `ORG_OWNER` — Created or was transferred an org. Billing, member mgmt, org settings + full email client.
3. `ORG_MEMBER` — Invited to org. Full email client. Optional `is_admin: true` flag grants org admin permissions.
4. `INDIVIDUAL` — Retail customer. Full email client, personal billing. No org features.

**Email providers supported:**
- Microsoft (Outlook, Exchange, Microsoft 365) via Microsoft Graph API
- Google (Gmail, Google Workspace) via Gmail API
- Both use OAuth2 with PKCE. User connects accounts in settings or during onboarding.

---

## GATE 1 — DATA MODEL

All tables use `uuid_generate_v4()` for PKs. All have `created_at TIMESTAMPTZ DEFAULT NOW()` and `updated_at TIMESTAMPTZ DEFAULT NOW()` (with trigger). RLS enabled on every table.

### ENUMS

```sql
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
```

### TABLE: organizations
```
id                      UUID PK
name                    TEXT NOT NULL
slug                    TEXT UNIQUE NOT NULL
domain                  TEXT — optional, for auto-join by email domain
logo_url                TEXT
plan                    plan_type DEFAULT 'FREE'
seats                   INT DEFAULT 1, CHECK >= 1
seats_used              INT DEFAULT 0, CHECK >= 0 AND <= seats
billing_email           TEXT NOT NULL
stripe_customer_id      TEXT
stripe_subscription_id  TEXT
subscription_status     subscription_status DEFAULT 'trialing'
trial_ends_at           TIMESTAMPTZ
settings                JSONB DEFAULT '{}'
created_at              TIMESTAMPTZ
updated_at              TIMESTAMPTZ
```
Indexes: `idx_org_slug UNIQUE(slug)`, `idx_org_domain(domain)`, `idx_org_stripe(stripe_customer_id)`

### TABLE: users
```
id                      UUID PK REFERENCES auth.users(id) ON DELETE CASCADE
email                   TEXT UNIQUE NOT NULL
name                    TEXT
nickname                TEXT
avatar_url              TEXT — Supabase Storage path
role                    user_role DEFAULT 'INDIVIDUAL'
is_super_admin          BOOLEAN DEFAULT FALSE
onboarding_completed    BOOLEAN DEFAULT FALSE
onboarding_step         INT DEFAULT 0
timezone                TEXT DEFAULT 'America/Chicago'
locale                  TEXT DEFAULT 'en'
two_factor_enabled      BOOLEAN DEFAULT FALSE
two_factor_secret       TEXT — encrypted TOTP secret
last_login_at           TIMESTAMPTZ
login_count             INT DEFAULT 0
created_at              TIMESTAMPTZ
updated_at              TIMESTAMPTZ
```
Indexes: `idx_users_email UNIQUE(email)`, `idx_users_role(role)`, `idx_users_super_admin(is_super_admin) WHERE is_super_admin = true`

### TABLE: user_preferences
```
id                      UUID PK
user_id                 UUID UNIQUE NOT NULL FK → users ON DELETE CASCADE
theme                   TEXT DEFAULT 'system' — 'light', 'dark', 'system'
inbox_layout            TEXT DEFAULT 'split' — 'split', 'full'
sidebar_mode            TEXT DEFAULT 'expanded' — 'expanded', 'collapsed'
compose_font            TEXT DEFAULT 'sans-serif'
compose_font_size       INT DEFAULT 14
notifications_enabled   BOOLEAN DEFAULT TRUE
notification_sound      BOOLEAN DEFAULT TRUE
notification_schedule   JSONB DEFAULT '{"morning":{"enabled":true,"time":"09:00"},"afternoon":{"enabled":false,"time":"13:00"},"evening":{"enabled":true,"time":"18:00"}}'
ai_features_enabled     BOOLEAN DEFAULT TRUE
auto_categorize         BOOLEAN DEFAULT TRUE
reading_pane_position   TEXT DEFAULT 'right' — 'right', 'bottom', 'off'
conversations_enabled   BOOLEAN DEFAULT TRUE — thread grouping
keyboard_shortcuts      BOOLEAN DEFAULT TRUE
swipe_actions           JSONB DEFAULT '{"left":"archive","right":"delete"}'
created_at              TIMESTAMPTZ
updated_at              TIMESTAMPTZ
```
Indexes: `idx_user_prefs_user UNIQUE(user_id)`

### TABLE: organization_members
```
id                      UUID PK
organization_id         UUID NOT NULL FK → organizations ON DELETE CASCADE
user_id                 UUID NOT NULL FK → users ON DELETE CASCADE
role                    TEXT DEFAULT 'member' — 'owner', 'admin', 'member'
is_admin                BOOLEAN DEFAULT FALSE
joined_at               TIMESTAMPTZ DEFAULT NOW()
```
Indexes: `UNIQUE(organization_id, user_id)`, `idx_org_members_user(user_id)`, `idx_org_members_org(organization_id)`

### TABLE: organization_invites
```
id                      UUID PK
organization_id         UUID NOT NULL FK → organizations ON DELETE CASCADE
email                   TEXT NOT NULL
role                    TEXT DEFAULT 'member'
invited_by              UUID NOT NULL FK → users
token                   TEXT UNIQUE NOT NULL
status                  invite_status DEFAULT 'pending'
expires_at              TIMESTAMPTZ NOT NULL
accepted_at             TIMESTAMPTZ
created_at              TIMESTAMPTZ
```
Indexes: `idx_invites_token UNIQUE(token)`, `idx_invites_email(email)`, `idx_invites_org(organization_id)`

### TABLE: email_accounts
```
id                      UUID PK
user_id                 UUID NOT NULL FK → users ON DELETE CASCADE
provider                provider_type NOT NULL
email                   TEXT NOT NULL
name                    TEXT — display name from provider
is_primary              BOOLEAN DEFAULT FALSE
sync_status             sync_status DEFAULT 'idle'
sync_cursor             TEXT — delta token (Graph) or history ID (Gmail)
last_synced_at          TIMESTAMPTZ
error_message           TEXT
metadata                JSONB DEFAULT '{}'
created_at              TIMESTAMPTZ
updated_at              TIMESTAMPTZ
```
Indexes: `UNIQUE(user_id, email)`, `idx_accounts_user(user_id)`, `idx_accounts_provider(provider)`, `idx_accounts_primary(user_id) WHERE is_primary = true`
Constraint: Only one `is_primary = true` per user_id (enforced via partial unique index)

### TABLE: oauth_tokens
```
id                      UUID PK
user_id                 UUID NOT NULL FK → users ON DELETE CASCADE
email_account_id        UUID NOT NULL FK → email_accounts ON DELETE CASCADE
provider                provider_type NOT NULL
access_token            TEXT NOT NULL — encrypted via pgcrypto
refresh_token           TEXT NOT NULL — encrypted via pgcrypto
token_expires_at        TIMESTAMPTZ NOT NULL
scopes                  TEXT[] DEFAULT ARRAY[]::TEXT[]
created_at              TIMESTAMPTZ
updated_at              TIMESTAMPTZ
```
Indexes: `UNIQUE(email_account_id)`, `idx_tokens_user(user_id)`, `idx_tokens_expires(token_expires_at)`
**CRITICAL:** Tokens encrypted at rest with `pgp_sym_encrypt()`. Read via `pgp_sym_decrypt()` using `ENCRYPTION_KEY` env var.

### TABLE: messages
```
id                      UUID PK
user_id                 UUID NOT NULL FK → users ON DELETE CASCADE
email_account_id        UUID NOT NULL FK → email_accounts ON DELETE CASCADE
provider_message_id     TEXT NOT NULL — Graph message ID or Gmail message ID
provider_thread_id      TEXT — thread grouping
subject                 TEXT
from_email              TEXT NOT NULL
from_name               TEXT
to_recipients           JSONB DEFAULT '[]' — [{email, name}]
cc_recipients           JSONB DEFAULT '[]'
bcc_recipients          JSONB DEFAULT '[]'
reply_to                JSONB DEFAULT '[]'
body_html               TEXT — sanitized HTML
body_text               TEXT — plain text fallback
snippet                 TEXT — first ~200 chars for list view
folder_type             folder_type DEFAULT 'inbox'
folder_id               TEXT — provider's native folder/label ID
is_unread               BOOLEAN DEFAULT TRUE
is_starred              BOOLEAN DEFAULT FALSE
is_draft                BOOLEAN DEFAULT FALSE
has_attachments         BOOLEAN DEFAULT FALSE
attachments             JSONB DEFAULT '[]' — [{id, name, size, type, content_id}]
importance              TEXT DEFAULT 'normal' — 'low', 'normal', 'high'
categories              TEXT[] DEFAULT ARRAY[]::TEXT[] — AI-assigned categories
message_date            TIMESTAMPTZ NOT NULL — when the email was sent/received
synced_at               TIMESTAMPTZ DEFAULT NOW()
created_at              TIMESTAMPTZ
updated_at              TIMESTAMPTZ
```
Indexes:
- `UNIQUE(email_account_id, provider_message_id)` — deduplication
- `idx_msg_user_date(user_id, message_date DESC)` — main list query
- `idx_msg_user_folder_date(user_id, folder_type, message_date DESC)` — folder view
- `idx_msg_thread(user_id, provider_thread_id)` — thread grouping
- `idx_msg_unread(user_id, is_unread) WHERE is_unread = true` — partial index, unread count
- `idx_msg_starred(user_id, is_starred) WHERE is_starred = true` — partial index
- `idx_msg_account_date(email_account_id, message_date DESC)` — per-account queries
- `idx_msg_search(user_id) USING gin(to_tsvector('english', coalesce(subject,'') || ' ' || coalesce(body_text,'')))` — full-text search

### TABLE: folder_mappings
```
id                      UUID PK
user_id                 UUID NOT NULL FK → users ON DELETE CASCADE
email_account_id        UUID NOT NULL FK → email_accounts ON DELETE CASCADE
provider_folder_id      TEXT NOT NULL — Graph folder ID or Gmail label ID
folder_name             TEXT NOT NULL
folder_type             folder_type NOT NULL
is_system_folder        BOOLEAN DEFAULT FALSE
unread_count            INT DEFAULT 0
total_count             INT DEFAULT 0
is_active               BOOLEAN DEFAULT TRUE
created_at              TIMESTAMPTZ
updated_at              TIMESTAMPTZ
last_synced_at          TIMESTAMPTZ
```
Indexes: `UNIQUE(email_account_id, provider_folder_id)`, `idx_folders_user_type(user_id, folder_type)`, `idx_folders_account(email_account_id)`

### TABLE: drafts
```
id                      UUID PK
user_id                 UUID NOT NULL FK → users ON DELETE CASCADE
email_account_id        UUID FK → email_accounts ON DELETE SET NULL
to_recipients           JSONB DEFAULT '[]'
cc_recipients           JSONB DEFAULT '[]'
bcc_recipients          JSONB DEFAULT '[]'
subject                 TEXT
body_html               TEXT
body_text               TEXT
reply_to_message_id     TEXT — if replying to a message
forward_from_id         TEXT — if forwarding
attachments             JSONB DEFAULT '[]'
auto_saved              BOOLEAN DEFAULT TRUE
provider_draft_id       TEXT — synced draft ID on provider
created_at              TIMESTAMPTZ
updated_at              TIMESTAMPTZ
```
Indexes: `idx_drafts_user(user_id, updated_at DESC)`, `idx_drafts_account(email_account_id)`

### TABLE: signatures
```
id                      UUID PK
user_id                 UUID NOT NULL FK → users ON DELETE CASCADE
name                    TEXT NOT NULL — 'Work', 'Personal', etc.
content_html            TEXT NOT NULL
content_text            TEXT
is_default              BOOLEAN DEFAULT FALSE
email_account_id        UUID FK → email_accounts — if signature is per-account
sort_order              INT DEFAULT 0
created_at              TIMESTAMPTZ
updated_at              TIMESTAMPTZ
```
Indexes: `idx_sig_user(user_id)`, `idx_sig_default(user_id) WHERE is_default = true`

### TABLE: email_templates
```
id                      UUID PK
user_id                 UUID NOT NULL FK → users ON DELETE CASCADE
name                    TEXT NOT NULL
subject                 TEXT
body_html               TEXT NOT NULL
body_text               TEXT
category                TEXT — 'follow-up', 'introduction', 'thank-you', etc.
variables               TEXT[] DEFAULT ARRAY[]::TEXT[] — {{name}}, {{company}}, etc.
use_count               INT DEFAULT 0
created_at              TIMESTAMPTZ
updated_at              TIMESTAMPTZ
```
Indexes: `idx_templates_user(user_id)`, `idx_templates_category(user_id, category)`

### TABLE: scheduled_emails
```
id                      UUID PK
user_id                 UUID NOT NULL FK → users ON DELETE CASCADE
email_account_id        UUID NOT NULL FK → email_accounts ON DELETE CASCADE
to_recipients           JSONB NOT NULL
cc_recipients           JSONB DEFAULT '[]'
bcc_recipients          JSONB DEFAULT '[]'
subject                 TEXT
body_html               TEXT NOT NULL
attachments             JSONB DEFAULT '[]'
scheduled_for           TIMESTAMPTZ NOT NULL
status                  email_status DEFAULT 'queued'
sent_at                 TIMESTAMPTZ
error_message           TEXT
retry_count             INT DEFAULT 0
created_at              TIMESTAMPTZ
updated_at              TIMESTAMPTZ
```
Indexes: `idx_scheduled_user(user_id)`, `idx_scheduled_pending(status, scheduled_for) WHERE status = 'queued'`

### TABLE: snoozed_emails
```
id                      UUID PK
user_id                 UUID NOT NULL FK → users ON DELETE CASCADE
message_id              UUID NOT NULL FK → messages ON DELETE CASCADE
snooze_until            TIMESTAMPTZ NOT NULL
original_folder_type    folder_type NOT NULL
unsnoozed               BOOLEAN DEFAULT FALSE
created_at              TIMESTAMPTZ
```
Indexes: `idx_snoozed_pending(snooze_until) WHERE unsnoozed = false`, `idx_snoozed_user(user_id)`

### TABLE: email_rules
```
id                      UUID PK
user_id                 UUID NOT NULL FK → users ON DELETE CASCADE
name                    TEXT NOT NULL
is_active               BOOLEAN DEFAULT TRUE
priority                INT DEFAULT 0 — lower = runs first
conditions              JSONB NOT NULL — [{field, operator, value}]
actions                 JSONB NOT NULL — [{type, params}]
match_mode              TEXT DEFAULT 'all' — 'all' or 'any'
applied_count           INT DEFAULT 0
created_at              TIMESTAMPTZ
updated_at              TIMESTAMPTZ
```
Indexes: `idx_rules_user(user_id, is_active, priority)` where `is_active = true`

### TABLE: custom_labels
```
id                      UUID PK
user_id                 UUID NOT NULL FK → users ON DELETE CASCADE
name                    TEXT NOT NULL
color                   TEXT DEFAULT '#6366F1'
sort_order              INT DEFAULT 0
created_at              TIMESTAMPTZ
```
Indexes: `UNIQUE(user_id, name)`, `idx_labels_user(user_id)`

### TABLE: message_labels
```
id                      UUID PK
message_id              UUID NOT NULL FK → messages ON DELETE CASCADE
label_id                UUID NOT NULL FK → custom_labels ON DELETE CASCADE
created_at              TIMESTAMPTZ DEFAULT NOW()
```
Indexes: `UNIQUE(message_id, label_id)`, `idx_msg_labels_label(label_id)`, `idx_msg_labels_message(message_id)`

### TABLE: contacts
```
id                      UUID PK
user_id                 UUID NOT NULL FK → users ON DELETE CASCADE
email                   TEXT NOT NULL
name                    TEXT
phone                   TEXT
company                 TEXT
job_title               TEXT
avatar_url              TEXT
notes                   TEXT
is_favorite             BOOLEAN DEFAULT FALSE
is_priority_sender      BOOLEAN DEFAULT FALSE
email_count             INT DEFAULT 0 — number of emails exchanged
last_emailed_at         TIMESTAMPTZ
source                  TEXT DEFAULT 'manual' — 'manual', 'auto', 'import'
metadata                JSONB DEFAULT '{}'
created_at              TIMESTAMPTZ
updated_at              TIMESTAMPTZ
```
Indexes: `UNIQUE(user_id, email)`, `idx_contacts_user(user_id)`, `idx_contacts_priority(user_id) WHERE is_priority_sender = true`, `idx_contacts_search USING gin(to_tsvector('english', coalesce(name,'') || ' ' || coalesce(email,'') || ' ' || coalesce(company,'')))`

### TABLE: calendar_events
```
id                      UUID PK
user_id                 UUID NOT NULL FK → users ON DELETE CASCADE
email_account_id        UUID NOT NULL FK → email_accounts ON DELETE CASCADE
provider_event_id       TEXT NOT NULL
provider_calendar_id    TEXT
title                   TEXT NOT NULL
description             TEXT
location                TEXT
start_time              TIMESTAMPTZ NOT NULL
end_time                TIMESTAMPTZ NOT NULL
all_day                 BOOLEAN DEFAULT FALSE
timezone                TEXT DEFAULT 'UTC'
recurrence              JSONB — recurrence rule from provider
attendees               JSONB DEFAULT '[]' — [{email, name, status}]
organizer_email         TEXT
rsvp_status             event_rsvp DEFAULT 'none'
is_online_meeting       BOOLEAN DEFAULT FALSE
meeting_url             TEXT — Teams/Meet/Zoom link
meeting_provider        TEXT — 'teams', 'meet', 'zoom'
reminders               JSONB DEFAULT '[]' — [{minutes_before, method}]
color                   TEXT
status                  TEXT DEFAULT 'confirmed' — 'confirmed', 'tentative', 'cancelled'
created_at              TIMESTAMPTZ
updated_at              TIMESTAMPTZ
synced_at               TIMESTAMPTZ
```
Indexes: `UNIQUE(email_account_id, provider_event_id)`, `idx_events_user_time(user_id, start_time, end_time)`, `idx_events_account(email_account_id)`, `idx_events_online(user_id) WHERE is_online_meeting = true`

### TABLE: calendar_metadata
```
id                      UUID PK
user_id                 UUID NOT NULL FK → users ON DELETE CASCADE
email_account_id        UUID NOT NULL FK → email_accounts ON DELETE CASCADE
provider_calendar_id    TEXT NOT NULL
calendar_name           TEXT NOT NULL
description             TEXT
timezone                TEXT DEFAULT 'UTC'
is_primary              BOOLEAN DEFAULT FALSE
read_only               BOOLEAN DEFAULT FALSE
is_active               BOOLEAN DEFAULT TRUE
color                   TEXT
sync_cursor             TEXT
last_synced_at          TIMESTAMPTZ
created_at              TIMESTAMPTZ
updated_at              TIMESTAMPTZ
```
Indexes: `UNIQUE(email_account_id, provider_calendar_id)`, `idx_cal_meta_user(user_id)`

### TABLE: sms_messages
```
id                      UUID PK
user_id                 UUID NOT NULL FK → users ON DELETE CASCADE
direction               TEXT NOT NULL CHECK IN ('inbound', 'outbound')
from_number             TEXT NOT NULL
to_number               TEXT NOT NULL
body                    TEXT NOT NULL
twilio_sid              TEXT UNIQUE
status                  TEXT — 'queued', 'sent', 'delivered', 'failed'
created_at              TIMESTAMPTZ
```
Indexes: `idx_sms_user(user_id, created_at DESC)`

### TABLE: spam_reports
```
id                      UUID PK
user_id                 UUID NOT NULL FK → users ON DELETE CASCADE
message_id              UUID FK → messages ON DELETE SET NULL
reported_email          TEXT NOT NULL
reason                  TEXT
auto_detected           BOOLEAN DEFAULT FALSE
created_at              TIMESTAMPTZ
```
Indexes: `idx_spam_user(user_id)`, `idx_spam_email(reported_email)`

### TABLE: subscriptions (Stripe)
```
id                      UUID PK
organization_id         UUID FK → organizations ON DELETE CASCADE — NULL for individual
user_id                 UUID FK → users ON DELETE CASCADE — NULL for org billing
stripe_subscription_id  TEXT UNIQUE NOT NULL
stripe_customer_id      TEXT NOT NULL
plan                    plan_type NOT NULL
status                  subscription_status DEFAULT 'trialing'
seats                   INT DEFAULT 1
current_period_start    TIMESTAMPTZ
current_period_end      TIMESTAMPTZ
cancel_at               TIMESTAMPTZ
canceled_at             TIMESTAMPTZ
trial_end               TIMESTAMPTZ
created_at              TIMESTAMPTZ
updated_at              TIMESTAMPTZ
```
Indexes: `idx_sub_org(organization_id)`, `idx_sub_user(user_id)`, `idx_sub_stripe(stripe_subscription_id)`, `idx_sub_status(status)`

### TABLE: invoices
```
id                      UUID PK
subscription_id         UUID FK → subscriptions ON DELETE SET NULL
stripe_invoice_id       TEXT UNIQUE
amount_cents            INT NOT NULL
currency                TEXT DEFAULT 'usd'
status                  invoice_status DEFAULT 'draft'
description             TEXT
period_start            TIMESTAMPTZ
period_end              TIMESTAMPTZ
paid_at                 TIMESTAMPTZ
pdf_url                 TEXT
created_at              TIMESTAMPTZ
```
Indexes: `idx_invoices_sub(subscription_id)`, `idx_invoices_stripe(stripe_invoice_id)`

### TABLE: payment_methods
```
id                      UUID PK
user_id                 UUID FK → users ON DELETE CASCADE
organization_id         UUID FK → organizations ON DELETE CASCADE
stripe_payment_method_id TEXT UNIQUE NOT NULL
card_brand              TEXT
card_last4              TEXT
card_exp_month          INT
card_exp_year           INT
is_default              BOOLEAN DEFAULT FALSE
created_at              TIMESTAMPTZ
```
Indexes: `idx_pm_user(user_id)`, `idx_pm_org(organization_id)`

### TABLE: usage_tracking
```
id                      UUID PK
user_id                 UUID NOT NULL FK → users ON DELETE CASCADE
organization_id         UUID FK → organizations ON DELETE CASCADE
feature                 TEXT NOT NULL — 'ai_remix', 'ai_dictate', 'sms_send', 'calendar_event', etc.
count                   INT DEFAULT 1
metadata                JSONB
timestamp               TIMESTAMPTZ DEFAULT NOW()
```
Indexes: `idx_usage_user_feature(user_id, feature, timestamp DESC)`, `idx_usage_org(organization_id, timestamp DESC)`

### TABLE: audit_logs
```
id                      UUID PK
user_id                 UUID FK → users ON DELETE SET NULL
target_user_id          UUID FK → users ON DELETE SET NULL
organization_id         UUID FK → organizations ON DELETE SET NULL
action                  audit_action NOT NULL
entity_type             TEXT NOT NULL — 'user', 'organization', 'email_account', etc.
entity_id               UUID
details                 JSONB DEFAULT '{}'
ip_address              TEXT
user_agent              TEXT
created_at              TIMESTAMPTZ DEFAULT NOW()
```
Indexes: `idx_audit_user(user_id, created_at DESC)`, `idx_audit_org(organization_id, created_at DESC)`, `idx_audit_action(action, created_at DESC)`, `idx_audit_entity(entity_type, entity_id)`

### TABLE: impersonate_sessions
```
id                      UUID PK
admin_user_id           UUID NOT NULL FK → users ON DELETE CASCADE
target_user_id          UUID NOT NULL FK → users ON DELETE CASCADE
reason                  TEXT NOT NULL
started_at              TIMESTAMPTZ DEFAULT NOW()
ended_at                TIMESTAMPTZ
ip_address              TEXT
```
Indexes: `idx_impersonate_admin(admin_user_id)`, `idx_impersonate_active(ended_at) WHERE ended_at IS NULL`

### TABLE: system_settings
```
id                      UUID PK
key                     TEXT UNIQUE NOT NULL
value                   JSONB NOT NULL
description             TEXT
updated_by              UUID FK → users
created_at              TIMESTAMPTZ
updated_at              TIMESTAMPTZ
```
Indexes: `idx_settings_key UNIQUE(key)`

### TABLE: webhooks
```
id                      UUID PK
user_id                 UUID NOT NULL FK → users ON DELETE CASCADE
url                     TEXT NOT NULL
events                  TEXT[] NOT NULL — ['email.received', 'email.sent', etc.]
secret                  TEXT NOT NULL
is_active               BOOLEAN DEFAULT TRUE
last_triggered_at       TIMESTAMPTZ
failure_count           INT DEFAULT 0
created_at              TIMESTAMPTZ
updated_at              TIMESTAMPTZ
```
Indexes: `idx_webhooks_user(user_id)`, `idx_webhooks_active(is_active) WHERE is_active = true`

### TABLE: webhook_deliveries
```
id                      UUID PK
webhook_id              UUID NOT NULL FK → webhooks ON DELETE CASCADE
event                   TEXT NOT NULL
payload                 JSONB NOT NULL
response_status         INT
response_body           TEXT
delivered_at            TIMESTAMPTZ
created_at              TIMESTAMPTZ
```
Indexes: `idx_deliveries_webhook(webhook_id, created_at DESC)`

### TABLE: api_keys
```
id                      UUID PK
user_id                 UUID NOT NULL FK → users ON DELETE CASCADE
name                    TEXT NOT NULL
key_hash                TEXT NOT NULL — bcrypt hash, never store plaintext
key_prefix              TEXT NOT NULL — first 8 chars for identification
scopes                  TEXT[] DEFAULT ARRAY['read']
last_used_at            TIMESTAMPTZ
expires_at              TIMESTAMPTZ
is_active               BOOLEAN DEFAULT TRUE
created_at              TIMESTAMPTZ
```
Indexes: `idx_api_keys_user(user_id)`, `idx_api_keys_prefix(key_prefix)`, `idx_api_keys_hash(key_hash)`

### TABLE: enterprise_leads
```
id                      UUID PK
company_name            TEXT NOT NULL
contact_name            TEXT NOT NULL
contact_email           TEXT NOT NULL
phone                   TEXT
message                 TEXT
seats_needed            INT
status                  TEXT DEFAULT 'new' — 'new', 'contacted', 'qualified', 'closed'
created_at              TIMESTAMPTZ
updated_at              TIMESTAMPTZ
```
Indexes: `idx_leads_status(status)`

### TABLE: notification_queue
```
id                      UUID PK
user_id                 UUID NOT NULL FK → users ON DELETE CASCADE
type                    notification_type NOT NULL
title                   TEXT NOT NULL
message                 TEXT NOT NULL
link                    TEXT
read                    BOOLEAN DEFAULT FALSE
created_at              TIMESTAMPTZ
```
Indexes: `idx_notif_user_unread(user_id, read) WHERE read = false`, `idx_notif_user(user_id, created_at DESC)`

### TABLE: backup_codes
```
id                      UUID PK
user_id                 UUID NOT NULL FK → users ON DELETE CASCADE
code_hash               TEXT NOT NULL — bcrypt hash
used                    BOOLEAN DEFAULT FALSE
used_at                 TIMESTAMPTZ
created_at              TIMESTAMPTZ
```
Indexes: `idx_backup_user(user_id)`

### TABLE: user_login_tracking
```
id                      UUID PK
user_id                 UUID NOT NULL FK → users ON DELETE CASCADE
ip_address              TEXT
user_agent              TEXT
login_at                TIMESTAMPTZ DEFAULT NOW()
success                 BOOLEAN DEFAULT TRUE
failure_reason          TEXT
```
Indexes: `idx_login_user(user_id, login_at DESC)`, `idx_login_ip(ip_address, login_at DESC)`

### TABLE: rate_limits
```
key                     TEXT NOT NULL
count                   INT DEFAULT 1
window_start            TIMESTAMPTZ DEFAULT NOW()
PRIMARY KEY (key, window_start)
```
Indexes: `idx_rate_limits_window(window_start)` — for cleanup cron
**NOTE:** This replaces Redis rate limiting. Postgres-based, cleaned up by cron every 5 min.

### TABLE: sync_checkpoints
```
id                      UUID PK
email_account_id        UUID NOT NULL FK → email_accounts ON DELETE CASCADE
sync_type               TEXT NOT NULL — 'messages', 'folders', 'calendar', 'contacts'
cursor                  TEXT — delta token or history ID
last_successful_at      TIMESTAMPTZ
error_count             INT DEFAULT 0
last_error              TEXT
created_at              TIMESTAMPTZ
updated_at              TIMESTAMPTZ
```
Indexes: `UNIQUE(email_account_id, sync_type)`, `idx_checkpoint_account(email_account_id)`
**PURPOSE:** Sync never restarts from zero. Each sync type has its own checkpoint per account.

### TABLE: priority_senders
```
id                      UUID PK
user_id                 UUID NOT NULL FK → users ON DELETE CASCADE
email                   TEXT NOT NULL
name                    TEXT
is_blocked              BOOLEAN DEFAULT FALSE — true = gatekeeper blocked
created_at              TIMESTAMPTZ
```
Indexes: `UNIQUE(user_id, email)`, `idx_priority_user(user_id)`
**PURPOSE:** Used by the Spark-style inbox prioritization and gatekeeper features.

### TABLE: sender_groups
```
id                      UUID PK
user_id                 UUID NOT NULL FK → users ON DELETE CASCADE
sender_email            TEXT NOT NULL
group_name              TEXT — auto-generated from sender domain
is_grouped              BOOLEAN DEFAULT TRUE
created_at              TIMESTAMPTZ
```
Indexes: `UNIQUE(user_id, sender_email)`, `idx_sender_groups_user(user_id)`
**PURPOSE:** Spark-style sender grouping — batch emails from frequent senders.

---

## API KEY BLUEPRINT

### Required at build time (Stage 1):
```
NEXT_PUBLIC_SUPABASE_URL=         # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Supabase anon key (public)
SUPABASE_SERVICE_ROLE_KEY=        # Supabase service role (server only)
NEXT_PUBLIC_APP_URL=              # App URL (http://localhost:3000 for dev)
ENCRYPTION_KEY=                   # 32-char key for pgcrypto token encryption
```

### Required at Stage 4 (integrations):
```
AZURE_CLIENT_ID=                  # MS Entra app registration
AZURE_CLIENT_SECRET=              # MS Entra app secret
AZURE_TENANT_ID=common            # 'common' for multi-tenant
GOOGLE_CLIENT_ID=                 # Google Cloud Console OAuth client
GOOGLE_CLIENT_SECRET=             # Google Cloud Console OAuth secret
OPENAI_API_KEY=                   # OpenAI for AI features
STRIPE_SECRET_KEY=                # Stripe API key
STRIPE_WEBHOOK_SECRET=            # Stripe webhook signing secret
STRIPE_PRO_PRICE_ID=              # Stripe Pro plan price ID
STRIPE_PRO_ANNUAL_PRICE_ID=       # Stripe Pro annual price ID
STRIPE_BUSINESS_PRICE_ID=         # Stripe Business plan price ID
STRIPE_BUSINESS_ANNUAL_PRICE_ID=  # Stripe Business annual price ID
RESEND_API_KEY=                   # Resend for transactional email
RESEND_FROM_EMAIL=                # From address (hello@easemail.ai)
TWILIO_ACCOUNT_SID=               # Twilio for SMS
TWILIO_AUTH_TOKEN=                 # Twilio auth token
TWILIO_PHONE_NUMBER=              # Twilio phone number
CRON_SECRET=                      # Secret for cron job auth
```
