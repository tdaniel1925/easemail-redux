# SPEC-PERMISSIONS.md — EaseMail v2

---

## GATE 3 — PERMISSIONS MATRIX

### ROLE HIERARCHY

```
SUPER_ADMIN > ORG_OWNER > ORG_MEMBER (is_admin=true) > ORG_MEMBER > INDIVIDUAL
```

Super admins can do everything. Org owners can manage their org. Org members with `is_admin: true` get org admin powers (member management, settings) but NOT billing. Individual users have full email client access but zero org features.

### ROLE DETECTION LOGIC

```typescript
// In every server action and API route:
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) return unauthorized();

const { data: profile } = await supabase
  .from('users')
  .select('*, organization_members(organization_id, role, is_admin)')
  .eq('id', user.id)
  .single();

const isSuperAdmin = profile.is_super_admin === true;
const orgMembership = profile.organization_members?.[0]; // current org context
const isOrgOwner = orgMembership?.role === 'owner';
const isOrgAdmin = orgMembership?.is_admin === true || isOrgOwner;
```

### ENTITY PERMISSION MATRIX

Legend: `C`=Create, `R`=Read, `R*`=Read own only, `U`=Update, `U*`=Update own only, `D`=Delete, `D*`=Delete own only, `—`=No access

| Entity | SUPER_ADMIN | ORG_OWNER | ORG_MEMBER (admin) | ORG_MEMBER | INDIVIDUAL |
|---|---|---|---|---|---|
| **users** | CRUD (all) | R (org members) | R (org members) | R* | R* U* |
| **users.role** | U (any) | — | — | — | — |
| **users.is_super_admin** | U | — | — | — | — |
| **organizations** | CRUD (all) | R U (own org) | R (own org) | R (own org) | — |
| **organizations.plan/billing** | U | U (own org) | — | — | — |
| **organization_members** | CRUD (all) | CRUD (own org) | CR D (own org, not owner) | R (own org) | — |
| **organization_members.is_admin** | U | U (own org) | — | — | — |
| **organization_invites** | CRUD (all) | CRD (own org) | CR (own org, if admin) | R (own org) | — |
| **email_accounts** | R (all via impersonate) | R* U* D* | R* U* D* | R* U* D* | R* U* D* |
| **oauth_tokens** | R (all via impersonate) | R* | R* | R* | R* |
| **messages** | R (all via impersonate) | R* U* D* | R* U* D* | R* U* D* | R* U* D* |
| **drafts** | R (all via impersonate) | CRUD* | CRUD* | CRUD* | CRUD* |
| **signatures** | R (all via impersonate) | CRUD* | CRUD* | CRUD* | CRUD* |
| **email_templates** | R (all via impersonate) | CRUD* | CRUD* | CRUD* | CRUD* |
| **scheduled_emails** | R (all via impersonate) | CRUD* | CRUD* | CRUD* | CRUD* |
| **snoozed_emails** | R (all via impersonate) | CRUD* | CRUD* | CRUD* | CRUD* |
| **email_rules** | R (all via impersonate) | CRUD* | CRUD* | CRUD* | CRUD* |
| **custom_labels** | R (all via impersonate) | CRUD* | CRUD* | CRUD* | CRUD* |
| **contacts** | R (all via impersonate) | CRUD* | CRUD* | CRUD* | CRUD* |
| **calendar_events** | R (all via impersonate) | CRUD* | CRUD* | CRUD* | CRUD* |
| **sms_messages** | R (all via impersonate) | CR* | CR* | CR* | CR* |
| **subscriptions** | CRUD (all) | R (own org) | R (own org, if admin) | — | R* |
| **invoices** | CRUD (all) | R (own org) | R (own org, if admin) | — | R* |
| **payment_methods** | R (all) | CRUD (own org) | — | — | CRUD* |
| **usage_tracking** | R (all) | R (own org) | R* | R* | R* |
| **audit_logs** | R (all) | R (own org) | — | — | — |
| **impersonate_sessions** | CR | — | — | — | — |
| **system_settings** | CRUD | — | — | — | — |
| **webhooks** | CRUD (all) | CRUD* | — | — | CRUD* |
| **api_keys** | CRUD (all) | CRUD* | CRUD* | CRUD* | CRUD* |
| **enterprise_leads** | CRUD | — | — | — | C (submit form) |
| **notification_queue** | CRUD (all) | R* U* | R* U* | R* U* | R* U* |
| **priority_senders** | R (all via impersonate) | CRUD* | CRUD* | CRUD* | CRUD* |
| **sender_groups** | R (all via impersonate) | CRUD* | CRUD* | CRUD* | CRUD* |

### RLS POLICY PATTERNS

**Pattern 1: Own data only (most tables)**
```sql
CREATE POLICY "Users manage own data" ON {table}
  FOR ALL
  USING (user_id = auth.uid());
```

**Pattern 2: Own data + super admin read all**
```sql
CREATE POLICY "Users manage own data" ON {table}
  FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Super admins read all" ON {table}
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );
```

**Pattern 3: Org-scoped (org members can see org data)**
```sql
CREATE POLICY "Org members read org data" ON organizations
  FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Org owners update org" ON organizations
  FOR UPDATE
  USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role = 'owner'
    )
  );
```

**Pattern 4: Org members table (complex)**
```sql
CREATE POLICY "Members see own org members" ON organization_members
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owner/admin manage members" ON organization_members
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND (role = 'owner' OR is_admin = true)
    )
  );

CREATE POLICY "Owner/admin remove members" ON organization_members
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role = 'owner'
    )
    AND role != 'owner' -- cannot remove the owner
  );
```

**Pattern 5: Super admin only**
```sql
CREATE POLICY "Super admin only" ON system_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );
```

### IMPERSONATION RULES

Super admins can impersonate any non-super-admin user. Impersonation:
1. MUST provide a reason (stored in `impersonate_sessions`)
2. Creates an audit log entry with action = 'impersonate'
3. Sets a session flag `impersonating_user_id` in the Supabase JWT custom claim
4. Shows a persistent banner in the UI: "You are viewing as {user_name}. [End session]"
5. All actions during impersonation are logged with `impersonated_by` in the audit details
6. The impersonated user's data is READ-ONLY during impersonation (no modifications)
7. Impersonation sessions auto-expire after 30 minutes

### ADMIN PANEL ACCESS

Route `/app/admin/*` is only accessible to `is_super_admin = true` users.

Middleware check:
```typescript
// In app/(app)/app/admin/layout.tsx
const { data: profile } = await supabase
  .from('users')
  .select('is_super_admin')
  .eq('id', user.id)
  .single();

if (!profile?.is_super_admin) {
  redirect('/app/inbox');
}
```

### ORG ADMIN VS ORG OWNER

Both can manage members and view org settings. Key differences:

| Action | ORG_OWNER | ORG_MEMBER (is_admin) |
|---|---|---|
| Manage billing/subscription | Yes | No |
| Transfer ownership | Yes | No |
| Delete organization | Yes | No |
| Remove any member | Yes | Yes (except owner) |
| Invite members | Yes | Yes |
| Change member roles | Yes | Yes (except can't make owner) |
| View org settings | Yes | Yes |
| Update org settings (name, logo) | Yes | Yes |

### SERVICE ROLE BYPASS

Server-side operations using `SUPABASE_SERVICE_ROLE_KEY` bypass RLS. Used for:
- Cron jobs (scheduled email sending, snooze expiry, sync)
- Webhook processing
- Stripe webhook handlers
- Admin API routes (after server-side super admin check)

**CRITICAL:** Never use service role key in client-side code. Never expose it in `NEXT_PUBLIC_*` vars.

### RATE LIMITING MATRIX (Postgres-based)

| Endpoint | Limit | Window | Key |
|---|---|---|---|
| `POST /api/auth/*` | 5 requests | 60s | IP address |
| `POST /api/ai/*` | 10 requests | 60s | user_id |
| `POST /api/email/send` | 30 requests | 60s | user_id |
| `POST /api/sms/send` | 10 requests | 60s | user_id |
| `GET /api/*` (read) | 300 requests | 60s | user_id |
| `POST /api/admin/*` | 50 requests | 60s | user_id |
| `POST /api/webhooks/*` | 1000 requests | 60s | webhook_id |

Implementation:
```sql
-- Rate limit check function
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key TEXT,
  p_max INT,
  p_window_seconds INT
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INT;
  v_window_start TIMESTAMPTZ;
BEGIN
  v_window_start := NOW() - (p_window_seconds || ' seconds')::INTERVAL;

  -- Clean old entries
  DELETE FROM rate_limits WHERE window_start < v_window_start;

  -- Count recent
  SELECT COALESCE(SUM(count), 0) INTO v_count
  FROM rate_limits
  WHERE key = p_key AND window_start >= v_window_start;

  IF v_count >= p_max THEN
    RETURN FALSE; -- rate limited
  END IF;

  -- Increment
  INSERT INTO rate_limits (key, count, window_start)
  VALUES (p_key, 1, date_trunc('second', NOW()))
  ON CONFLICT (key, window_start) DO UPDATE SET count = rate_limits.count + 1;

  RETURN TRUE; -- allowed
END;
$$ LANGUAGE plpgsql;
```
