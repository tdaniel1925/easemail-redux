# SPEC-ADMIN.md — EaseMail v2

---

## SUPER ADMIN PANEL

Route: `/app/admin/*` — only accessible to users with `is_super_admin = true`.
Layout: Separate admin layout with its own sidebar navigation. Not the email sidebar.

### ADMIN SIDEBAR NAVIGATION
```
Dashboard        /app/admin
Users            /app/admin/users
Organizations    /app/admin/organizations
Revenue          /app/admin/revenue
Analytics        /app/admin/analytics
System Settings  /app/admin/settings
Audit Logs       /app/admin/audit-logs
Enterprise Leads /app/admin/leads
```

### ADMIN-1: DASHBOARD (`/app/admin`)

**KPI Cards (top row, 4 cards):**
- Total Users (with +X this week badge)
- Active Users (7-day, logged in within 7 days)
- Total Organizations
- MRR (Monthly Recurring Revenue from Stripe, calculated from active subscriptions)

**Charts (below KPIs):**
- Signup Trend: Bar chart, daily signups over last 30 days (recharts BarChart)
- Revenue History: Line chart, MRR over last 12 months (recharts LineChart)
- Plan Distribution: Donut chart, users by plan (FREE/PRO/BUSINESS/ENTERPRISE)
- Feature Usage: Horizontal bar chart, top 10 features by usage_tracking count

**Recent Activity (bottom):**
- Last 20 audit_log entries with: time, user, action, entity, details
- Link to full audit logs page

### ADMIN-2: USER MANAGEMENT (`/app/admin/users`)

**Table columns:** Avatar, Name, Email, Role, Plan, Org, Status (active/onboarding), Created, Last Login, Actions

**Search:** By name or email (server-side search, debounced 300ms)

**Filters:** Role dropdown, Plan dropdown, Date range picker

**Pagination:** Server-side, 25 per page, cursor-based

**Row actions (dropdown):**
- View Profile → modal with full user details + preferences + connected accounts
- Edit Profile → modal: name, email, role, timezone
- Reset Password → sends password reset email via Supabase auth
- Resend Welcome → sends welcome email via Resend
- Toggle Super Admin → confirm dialog, updates is_super_admin
- Impersonate → requires reason input, creates impersonate_session, redirects
- Delete Account → confirm dialog with "Type DELETE to confirm"
  - Cascade deletes: email_accounts, messages, drafts, signatures, etc.
  - Remove from orgs (decrement seats)
  - Cancel individual subscription
  - Log in audit_logs

**Create User (button top-right):**
Modal form: Email, Name, Password (auto-generate option), Role, Send welcome email (checkbox)
Creates user in Supabase auth + users table.

**Bulk Actions (checkbox selection):**
- Send email to selected
- Export selected to CSV
- Delete selected (with confirmation)

### ADMIN-3: ORGANIZATION MANAGEMENT (`/app/admin/organizations`)

**Table columns:** Logo, Name, Slug, Owner, Plan, Seats (used/total), Status, Created, Actions

**Row actions:**
- View Details → modal: org info, member list, billing status, subscription details
- Edit → modal: name, slug, domain, plan
- Manage Members → inline expand: list members, change roles, remove, add
- View Billing → subscription details, invoices, payment methods
- Delete Org → confirm dialog, cascade (see WF-13)

**Create Organization (button top-right):**
Wizard modal (from v1 create-organization-wizard):
1. Org name, slug (auto-generated from name), domain
2. Select plan
3. Add first member (owner) — select from existing users or create new
4. Billing email
5. Review and create

### ADMIN-4: REVENUE (`/app/admin/revenue`)

**Summary cards:**
- MRR (sum of all active subscription amounts / billing period)
- ARR (MRR × 12)
- Total Revenue (lifetime, from invoices where status='paid')
- Churn Rate (canceled last 30 days / active at start of period)

**Revenue chart:** Line chart, monthly revenue over 12 months with trend line

**Invoice table:** All invoices across all orgs/users
Columns: Invoice ID, Customer (org or user), Amount, Status, Period, Paid date
Filterable by status, date range

**Subscription table:** All active subscriptions
Columns: Customer, Plan, Seats, Status, Current period, Next billing date

### ADMIN-5: ANALYTICS (`/app/admin/analytics`)

**Engagement metrics:**
- DAU/MAU ratio (stickiness)
- Avg session duration (from login tracking)
- Messages sent per user per day (avg)
- AI feature adoption rate (% of users who've used AI features)
- Top 10 power users (by message volume)

**Email metrics:**
- Total messages synced (all users)
- Messages sent via EaseMail today/week/month
- Provider breakdown: Microsoft vs Google (pie chart)
- Account connections: new connections per day (line chart)

**Feature metrics:**
- Usage by feature (from usage_tracking): bar chart
- AI Remix usage trend: line chart over 30 days
- Scheduled sends: count per day
- SMS messages: count per day

### ADMIN-6: SYSTEM SETTINGS (`/app/admin/settings`)

**Key-value configuration, editable table:**

| Key | Default | Description |
|---|---|---|
| maintenance_mode | false | If true, show maintenance page to non-admins |
| default_plan | FREE | Default plan for new signups |
| trial_days | 14 | Free trial duration |
| max_accounts_free | 1 | Max email accounts for FREE plan |
| max_accounts_pro | 3 | Max email accounts for PRO plan |
| max_accounts_business | 10 | Max email accounts for BUSINESS plan |
| sync_interval_minutes | 5 | Email sync interval |
| ai_model | gpt-4o | OpenAI model for AI features |
| signup_enabled | true | Allow new signups |
| invite_only | false | Require invite to sign up |
| max_attachment_size_mb | 25 | Max attachment size |
| welcome_email_enabled | true | Send welcome email on signup |

Each change: update system_settings row, log in audit_logs.

### ADMIN-7: AUDIT LOGS (`/app/admin/audit-logs`)

**Table columns:** Timestamp, User (avatar + name), Action, Entity Type, Entity ID, Details (expandable JSON), IP

**Filters:** Action type dropdown, Entity type dropdown, User search, Date range

**Retention:** 90 days. Older logs archived or deleted by monthly cron.

**Logged actions:**
- All CRUD operations on users, orgs, members, subscriptions
- Login/logout events
- Impersonation start/end
- System settings changes
- Bulk operations
- Password resets
- Role changes
- Super admin toggles

### ADMIN-8: ENTERPRISE LEADS (`/app/admin/leads`)

**Table columns:** Company, Contact Name, Email, Phone, Seats Needed, Status, Created, Actions

**Status workflow:** New → Contacted → Qualified → Closed (Won/Lost)

**Row actions:** Update status, Add notes, Send email, Delete

**Source:** Form on marketing site/pricing page: "Need 100+ seats? Contact us."

---

## ADMIN IMPERSONATION DETAIL

**Start impersonation flow:**
```typescript
// POST /api/admin/impersonate
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Verify super admin
  const { data: admin } = await supabase
    .from('users')
    .select('is_super_admin')
    .eq('id', user.id)
    .single();
  if (!admin?.is_super_admin) return unauthorized();

  const { target_user_id, reason } = await request.json();
  if (!reason || reason.length < 10) return badRequest('Reason required (min 10 chars)');

  // Cannot impersonate other super admins
  const { data: target } = await supabase
    .from('users')
    .select('is_super_admin, email, name')
    .eq('id', target_user_id)
    .single();
  if (target?.is_super_admin) return forbidden('Cannot impersonate super admins');

  // Create session
  const { data: session } = await supabase
    .from('impersonate_sessions')
    .insert({
      admin_user_id: user.id,
      target_user_id,
      reason,
      ip_address: request.headers.get('x-forwarded-for'),
    })
    .select()
    .single();

  // Log audit
  await logAudit(user.id, 'impersonate', 'user', target_user_id, {
    reason,
    target_email: target.email,
  });

  // Set impersonation cookie (encrypted, httpOnly, 30min TTL)
  // Client reads this to show banner and fetch data as target user
  const response = NextResponse.json({ session_id: session.id, target: target });
  response.cookies.set('impersonate_session', session.id, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 30 * 60, // 30 minutes
    path: '/',
  });

  return response;
}
```

**During impersonation:**
- Middleware checks for `impersonate_session` cookie
- If present: fetch target user data instead of admin data
- All API routes check: if impersonating → read-only mode (no mutations)
- Persistent banner component at top of page

**End impersonation:**
```typescript
// POST /api/admin/impersonate/end
// Delete cookie, update impersonate_sessions.ended_at, redirect to admin panel
```

---

## ADMIN LOG SYSTEM

Super admins have a separate activity log visible only on the admin panel.

**Admin actions logged:**
```typescript
// lib/audit-logs.ts
export async function logAudit(
  userId: string,
  action: AuditAction,
  entityType: string,
  entityId: string | null,
  details: Record<string, any> = {},
  request?: NextRequest
) {
  const supabase = createServiceClient(); // service role, bypasses RLS

  await supabase.from('audit_logs').insert({
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details,
    ip_address: request?.headers.get('x-forwarded-for') || null,
    user_agent: request?.headers.get('user-agent') || null,
  });
}
```

Every admin action in every admin API route calls `logAudit()`.
