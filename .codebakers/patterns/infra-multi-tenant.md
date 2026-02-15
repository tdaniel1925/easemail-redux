# PATTERN: Multi-Tenant SaaS

## When to Use
Any app where multiple organizations share the same codebase but have isolated data: SaaS platforms, white-label products, agency tools.

## Architecture: Shared Schema with RLS

### Database Design
```sql
-- Every tenant table gets an org_id column
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  custom_domain TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, user_id)
);

-- Example tenant-scoped table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  -- ... other fields
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: Users can only see data from their orgs
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own org projects" ON projects
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );
```

### Org Context (Middleware)
```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // Extract org from subdomain or path
  const host = request.headers.get('host') || '';
  const slug = host.split('.')[0]; // acme.yourapp.com → acme
  // OR from path: /org/acme/dashboard → acme

  // Verify user belongs to this org
  const supabase = createServerClient(/* ... */);
  const { data: membership } = await supabase
    .from('org_members')
    .select('org_id, role, organizations(id, name, slug, plan)')
    .eq('organizations.slug', slug)
    .eq('user_id', user.id)
    .single();

  if (!membership) return NextResponse.redirect('/select-org');

  // Pass org context via headers (readable in server components)
  const response = NextResponse.next();
  response.headers.set('x-org-id', membership.org_id);
  response.headers.set('x-org-role', membership.role);
  response.headers.set('x-org-plan', membership.organizations.plan);
  return response;
}
```

### Server-Side Org Helper
```typescript
// lib/org.ts
import { headers } from 'next/headers';

export function getOrg() {
  const h = headers();
  return {
    orgId: h.get('x-org-id')!,
    role: h.get('x-org-role')! as 'owner' | 'admin' | 'member' | 'viewer',
    plan: h.get('x-org-plan')! as 'free' | 'starter' | 'pro' | 'enterprise',
  };
}

// Usage in server actions:
export async function createProject(data: ProjectInput) {
  const { orgId, role } = getOrg();
  if (role === 'viewer') throw new Error('Viewers cannot create projects');

  return supabase.from('projects').insert({ ...data, org_id: orgId });
}
```

### Org Switching
```typescript
// components/org-switcher.tsx
'use client';

export function OrgSwitcher({ orgs, currentOrgId }) {
  return (
    <Select onValueChange={(slug) => window.location.href = `/org/${slug}/dashboard`}>
      {orgs.map(org => (
        <SelectItem key={org.id} value={org.slug}>{org.name}</SelectItem>
      ))}
    </Select>
  );
}
```

### Invite Flow
```typescript
export async function inviteToOrg(email: string, role: string) {
  const { orgId } = getOrg();
  
  // Create invite record
  const { data: invite } = await supabase.from('org_invites').insert({
    org_id: orgId,
    email,
    role,
    token: crypto.randomUUID(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  });

  // Send invite email
  await resend.emails.send({
    to: email,
    subject: `You're invited to ${org.name}`,
    html: renderInviteEmail(invite),
  });
}
```

### Plan-Based Feature Gating
```typescript
// lib/plans.ts
const PLAN_LIMITS = {
  free: { members: 3, projects: 5, storage: '1GB' },
  starter: { members: 10, projects: 25, storage: '10GB' },
  pro: { members: 50, projects: 100, storage: '100GB' },
  enterprise: { members: Infinity, projects: Infinity, storage: '1TB' },
};

export function canAccess(plan: string, feature: string, currentCount: number): boolean {
  const limits = PLAN_LIMITS[plan];
  return currentCount < limits[feature];
}
```

## Rules
- EVERY data table must have org_id (except global lookup tables)
- EVERY RLS policy must filter by org membership
- NEVER trust client-side org context — always verify in middleware
- Org switching is a full navigation, not a state change (prevents data leaks)
- Billing is per-org, not per-user
- Owner role cannot be removed (must transfer ownership first)
- Deleting an org requires typing the org name to confirm
