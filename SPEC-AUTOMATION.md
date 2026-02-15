# SPEC-AUTOMATION.md — EaseMail v2

---

## GATE 4 — AUTOMATION & AI

### AUTO-1: EVENT TRIGGERS

These are internal events that fire during normal app operation and trigger side effects.

| Event | Source | Side Effects |
|---|---|---|
| `user.created` | Signup | Send welcome email, create user_preferences, log audit |
| `user.onboarding_completed` | Onboarding Step 16 | Check pending invites, create trial subscription |
| `email_account.connected` | OAuth callback | Start initial sync, create sync_checkpoints |
| `email_account.sync_error` | Sync cron | Increment error count, notify user if 3+ errors |
| `message.received` | Delta sync | Run email rules engine, AI categorize, check gatekeeper, update folder counts |
| `message.sent` | Send flow | Auto-create contact if new, increment email_count on contact, update folder counts |
| `message.deleted` | User action | Update folder counts, remove from snoozed if snoozed |
| `draft.auto_saved` | Composer debounce | Upsert drafts table (30-second debounce) |
| `scheduled_email.due` | Send-scheduled cron | Attempt send, retry on failure |
| `snooze.expired` | Snooze cron | Move message back to original folder, mark unread, notify |
| `org.member_added` | Invite accept | Increment seats_used, send welcome email, log audit |
| `org.member_removed` | Admin action | Decrement seats_used, send removal email, update Stripe seats, log audit |
| `org.ownership_transferred` | Owner action | Update roles, send emails to both parties, log audit |
| `subscription.trial_ending` | Stripe webhook | Send reminder email (3 days before) |
| `subscription.payment_failed` | Stripe webhook | Send payment failed email, set past_due status |
| `subscription.canceled` | Stripe webhook | Downgrade to FREE at period end |
| `impersonate.started` | Admin action | Create impersonate_session, log audit |
| `impersonate.ended` | Admin/timeout | Update ended_at, log audit |
| `token.refresh_failed` | Token refresh | Set account to error state, notify user |
| `token.near_expiry` | Refresh-tokens cron | Proactively refresh 5 min before expiry |

### AUTO-2: EMAIL RULES ENGINE

**Rule conditions (field + operator + value):**

| Field | Operators | Value Type |
|---|---|---|
| from_email | equals, contains, ends_with, regex | string |
| from_name | equals, contains, regex | string |
| to_email | equals, contains | string |
| subject | equals, contains, starts_with, regex | string |
| body_text | contains | string |
| has_attachments | equals | boolean |
| importance | equals | 'low' / 'normal' / 'high' |
| is_unread | equals | boolean |

**Rule actions:**

| Action | Params | Effect |
|---|---|---|
| move_to_folder | { folder_type } | Update message folder_type |
| add_label | { label_id } | Insert message_labels row |
| remove_label | { label_id } | Delete message_labels row |
| mark_read | {} | Set is_unread = false |
| mark_unread | {} | Set is_unread = true |
| mark_starred | {} | Set is_starred = true |
| archive | {} | Set folder_type = 'archive' |
| delete | {} | Set folder_type = 'trash' |
| forward_to | { email } | Trigger send with body forwarded |
| categorize | { category } | Set categories array |
| notify | { message } | Create notification_queue entry |

**Execution:**
```typescript
// lib/rules/engine.ts
export async function evaluateRules(userId: string, message: NormalizedMessage): Promise<void> {
  const rules = await supabase
    .from('email_rules')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('priority', { ascending: true });

  for (const rule of rules.data || []) {
    const conditions: Condition[] = rule.conditions;
    const matchMode = rule.match_mode; // 'all' or 'any'

    const matches = matchMode === 'all'
      ? conditions.every(c => evaluateCondition(c, message))
      : conditions.some(c => evaluateCondition(c, message));

    if (matches) {
      for (const action of rule.actions as Action[]) {
        await executeAction(action, message);
      }
      // Increment applied count
      await supabase
        .from('email_rules')
        .update({ applied_count: rule.applied_count + 1 })
        .eq('id', rule.id);

      // Stop after first match (could make configurable)
      break;
    }
  }
}
```

### AUTO-3: AI FEATURE CONFIGURATION

**Plan-based limits:**

| Feature | FREE | PRO | BUSINESS | ENTERPRISE |
|---|---|---|---|---|
| AI Remix | 5/day | Unlimited | Unlimited | Unlimited |
| AI Dictate | 3/day | Unlimited | Unlimited | Unlimited |
| AI Event Extract | 5/day | Unlimited | Unlimited | Unlimited |
| AI Categorize | Auto (all) | Auto (all) | Auto (all) | Auto (all) |
| Email Rules | 3 rules | 25 rules | Unlimited | Unlimited |
| Scheduled Sends | 0 | 50/month | Unlimited | Unlimited |
| Email Accounts | 1 | 3 | 10 | Unlimited |
| SMS Messages | 0 | 0 | 100/month | Unlimited |
| Search | Basic | Full-text | Full-text | Full-text + API |
| Keyboard Shortcuts | Yes | Yes | Yes | Yes |
| Command Palette | No | Yes | Yes | Yes |
| Email Templates | 3 | 25 | Unlimited | Unlimited |
| Custom Labels | 5 | 25 | Unlimited | Unlimited |
| Webhooks | 0 | 0 | 5 | Unlimited |
| API Keys | 0 | 0 | 3 | Unlimited |

**Usage check pattern:**
```typescript
export async function checkFeatureLimit(
  userId: string,
  feature: string,
  plan: PlanType
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const limits = PLAN_LIMITS[plan];
  const featureLimit = limits[feature];

  if (featureLimit === -1) return { allowed: true, remaining: Infinity, limit: -1 }; // unlimited

  const today = new Date().toISOString().split('T')[0];
  const { count } = await supabase
    .from('usage_tracking')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('feature', feature)
    .gte('timestamp', `${today}T00:00:00Z`);

  const used = count || 0;
  return {
    allowed: used < featureLimit,
    remaining: Math.max(0, featureLimit - used),
    limit: featureLimit,
  };
}
```

### AUTO-4: SMART INBOX SECTIONS

The inbox is divided into sections based on AI categorization + priority:

```
1. [PRIORITY] — Messages from priority_senders (is_priority_sender=true)
   → Coral/orange left border, sorted by date DESC

2. [NEW SENDERS] — Gatekeeper: unknown senders (if gatekeeper enabled)
   → Shows Accept/Block buttons per sender

3. [PEOPLE] — category='people', not priority
   → Regular message rows

4. [NEWSLETTERS] — category='newsletter'
   → Grouped by sender if sender_grouping enabled
   → Collapsed by default (show count: "3 newsletters")

5. [NOTIFICATIONS] — category='notification'
   → Grouped by sender
   → Collapsed by default

6. [PROMOTIONS] — category='promotion'
   → Hidden by default, expandable
```

**Query pattern for inbox:**
```sql
-- Priority messages first
SELECT * FROM messages
WHERE user_id = $1 AND folder_type = 'inbox'
AND from_email IN (SELECT email FROM priority_senders WHERE user_id = $1 AND NOT is_blocked)
ORDER BY message_date DESC LIMIT 20;

-- Then people
SELECT * FROM messages
WHERE user_id = $1 AND folder_type = 'inbox'
AND 'people' = ANY(categories)
AND from_email NOT IN (SELECT email FROM priority_senders WHERE user_id = $1)
ORDER BY message_date DESC LIMIT 50;

-- Then grouped
SELECT from_email, from_name, COUNT(*) as count, MAX(message_date) as latest
FROM messages
WHERE user_id = $1 AND folder_type = 'inbox'
AND ('newsletter' = ANY(categories) OR 'notification' = ANY(categories))
GROUP BY from_email, from_name
ORDER BY latest DESC;
```

### AUTO-5: KEYBOARD SHORTCUTS & COMMAND PALETTE

**Global shortcuts (always active):**
| Key | Action |
|---|---|
| `c` | New compose |
| `g then i` | Go to inbox |
| `g then s` | Go to sent |
| `g then d` | Go to drafts |
| `g then t` | Go to trash |
| `g then c` | Go to calendar |
| `/` | Toggle sidebar |
| `Cmd+K` | Open command palette |
| `?` | Show shortcut help |

**Message view shortcuts:**
| Key | Action |
|---|---|
| `j` / `k` | Next / previous message |
| `o` or `Enter` | Open message |
| `r` | Reply |
| `a` | Reply all |
| `f` | Forward |
| `e` | Archive |
| `#` | Delete (move to trash) |
| `s` | Star/unstar |
| `u` | Mark unread |
| `l` | Label (open label picker) |
| `v` | Move to folder |
| `z` | Undo last action |
| `Shift+I` | Mark read |
| `Shift+U` | Mark unread |

**Command palette (Cmd+K):**
cmdk component with fuzzy search. Sections:
1. Actions: Compose, Search, Go to settings, etc.
2. Navigation: Inbox, Sent, Calendar, Contacts, etc.
3. Recent contacts: Quick compose to recent contact
4. Search results: Messages matching query

### AUTO-6: NOTIFICATION SYSTEM

**In-app notifications (notification_queue table):**
- Bell icon in header with unread count badge
- Dropdown shows recent notifications
- Click notification → navigate to relevant page
- Mark as read on click or "Mark all read" button

**Notification triggers:**
- New email from priority sender
- Snoozed email returned
- Scheduled email sent (or failed)
- Organization invite received
- Member added/removed from org
- Payment failed
- Trial ending in 3 days
- Sync error on account

**Browser push notifications (optional):**
- Enabled via `user_preferences.notifications_enabled`
- Respects notification_schedule (morning/afternoon/evening)
- Uses Web Push API with service worker
- Only for new emails from priority senders and calendar reminders

### AUTO-7: SEARCH INDEXING

**Full-text search uses Postgres tsvector:**

Already defined in Gate 1 via GIN index on messages. Additional search support:

```typescript
// lib/search/index.ts
export async function searchMessages(
  userId: string,
  query: string,
  filters: SearchFilters,
  cursor?: string,
  limit: number = 20
): Promise<{ results: Message[], nextCursor?: string }> {
  let q = supabase
    .from('messages')
    .select('*')
    .eq('user_id', userId)
    .textSearch('search_vector', query, { type: 'websearch' });

  // Apply filters
  if (filters.from) q = q.ilike('from_email', `%${filters.from}%`);
  if (filters.folder) q = q.eq('folder_type', filters.folder);
  if (filters.hasAttachments) q = q.eq('has_attachments', true);
  if (filters.isUnread !== undefined) q = q.eq('is_unread', filters.isUnread);
  if (filters.after) q = q.gte('message_date', filters.after);
  if (filters.before) q = q.lte('message_date', filters.before);
  if (filters.label) {
    q = q.in('id', supabase.from('message_labels').select('message_id').eq('label_id', filters.label));
  }

  // Cursor pagination
  if (cursor) q = q.lt('message_date', cursor);
  q = q.order('message_date', { ascending: false }).limit(limit);

  const { data } = await q;
  return {
    results: data || [],
    nextCursor: data?.length === limit ? data[data.length - 1].message_date : undefined,
  };
}
```

**search_vector column (generated):**
Add to messages table as generated column:
```sql
ALTER TABLE messages ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(subject, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(from_name, '') || ' ' || coalesce(from_email, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(body_text, '')), 'C')
  ) STORED;

CREATE INDEX idx_msg_search ON messages USING gin(search_vector);
```
Subject matches rank highest (A), then sender (B), then body (C).
