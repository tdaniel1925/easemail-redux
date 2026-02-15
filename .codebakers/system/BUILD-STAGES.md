# BUILD-STAGES.md — STAGE EXECUTION PROMPTS
# Claude Code: Execute ONE stage at a time. Read CLAUDE.md and PROJECT-SPEC.md FIRST.

# ─── HOW TO BUILD ───
#
# Put the .codebakers zip + forge.mjs in a folder. Open terminal. Run:
#
#   node forge.mjs
#
# That's it. It unzips, builds all 7 stages, collects your keys, and deploys.
# If it stops mid-build, run the same command again — it resumes.
#
# MANUAL MODE (one stage at a time):
#   cd into project folder → run: claude
#   Paste the prompt for your current stage
#
# ─── SPEC FILE READING GUIDE ───
#
# For large projects, the spec is split across multiple files to manage context.
# Each stage reads ONLY the spec files it needs:
#
#   Stage 1 (Schema):     PROJECT-SPEC.md + SPEC-PERMISSIONS.md
#   Stage 2 (Auth):       PROJECT-SPEC.md + SPEC-PERMISSIONS.md
#   Stage 3 (CRUD):       PROJECT-SPEC.md + SPEC-WORKFLOWS.md + SPEC-PERMISSIONS.md + any SPEC-ONBOARDING.md
#   Stage 4 (Workflow):   SPEC-WORKFLOWS.md + SPEC-INTEGRATIONS.md
#   Stage 5 (Events):     SPEC-WORKFLOWS.md + SPEC-AUTOMATION.md
#   Stage 6 (Automation): SPEC-AUTOMATION.md + SPEC-INTEGRATIONS.md
#   Stage 7 (AI/Polish):  SPEC-AUTOMATION.md + SPEC-ADMIN.md + SPEC-BILLING.md
#
# If the project uses a single PROJECT-SPEC.md, read that for every stage.
# Always read CLAUDE.md first regardless.

---

# STAGE 1 — SCHEMA & TYPES (Layer 0)
## Audit Level: FULL

### Pre-Flight
Before writing any code:
1. Read CLAUDE.md (hard rules)
2. Read PROJECT-SPEC.md (Gate 0 + Gate 1 — schema and identity)
3. If additional SPEC-*.md files exist, read ONLY the ones listed below for this stage:
   - **Stage 1 reads:** PROJECT-SPEC.md, SPEC-PERMISSIONS.md (for RLS policies)
4. Read BUILD-STATE.md (if it exists)
5. If `.codebakers/logic/` has files: read ALL of them — business rules inform schema design
6. If `.codebakers/migrations/` has files: read ALL of them — imported data informs schema columns
7. Output your SCOPE DECLARATION per CLAUDE.md format

### Task
Create the database schema and TypeScript types for ALL entities defined in PROJECT-SPEC.md Gate 1.

### Allowed Files
- `supabase/migrations/001_initial_schema.sql`
- `src/types/database.ts`
- `src/types/[entity].ts` (one per entity)

### Forbidden
- Do NOT create API routes or server actions
- Do NOT create UI components or pages
- Do NOT create business logic or workflows
- Do NOT add fields not defined in Gate 1
- Do NOT create entities not in Gate 1

### Requirements
1. Create a Supabase migration with all tables matching Gate 1 entities
2. Every table includes: `id (uuid default gen_random_uuid())`, `created_at (timestamptz default now())`, `updated_at (timestamptz default now())`, `created_by (uuid references auth.users)`, `archived_at (timestamptz nullable)`
3. All relationships from Gate 4 reflected as foreign keys with appropriate ON DELETE behavior
4. Create TypeScript type for each entity matching the schema exactly
5. Create database enums for all entity states from Gate 1
6. Enable RLS on every table
7. Create RLS policies matching Gate 3 permissions
8. Add indexes on all foreign key columns
9. Create `scripts/seed.ts` — generates admin user + 2-3 sample records per entity. Runnable via `npx tsx scripts/seed.ts`

### Audit — FULL
After completing the above, run these checks and output the report:

1. **ENTITY COVERAGE:** List every entity from Gate 1. Confirm each has a table. Flag missing.
2. **FIELD COMPLETENESS:** Confirm all base fields exist on every table.
3. **STATE ENUMS:** Confirm every entity's lifecycle states have a corresponding enum.
4. **RELATIONSHIP VALIDATION:** Walk Gate 4 adjacency list. Confirm every relationship has a foreign key. Flag missing.
5. **RLS CHECK:** For each role in Gate 3, confirm RLS policies exist. Flag missing.
6. **TYPE SYNC:** Confirm TypeScript types match SQL schema exactly — every column name, every type. Flag ANY drift.
7. **DEPENDENCY DIRECTION:** Confirm no table references a table in a higher layer.
8. **INDEX CHECK:** Confirm indexes exist on all foreign key columns.
9. **COLUMN SYNC:** Parse migration SQL → extract every table + column name. Parse TypeScript types → extract every field. Cross-reference: every TS field must match a real column, every column must have a TS field. Flag mismatches as BLOCKING.
10. **ENV VAR AUDIT:** Scan all code for process.env references. Verify each exists in .env.example with a comment.
11. **HARDCODED SCAN:** Scan for hardcoded URLs, API keys, passwords, emails. Flag as BLOCKING.
12. **TSC CHECK:** Run `npx tsc --noEmit`. Must pass with zero errors.

### Report Format
```
## STAGE 1 COHERENCE REPORT — SCHEMA & TYPES

### Summary
- Entities created: [X] / [total from Gate 1]
- Relationships mapped: [X] / [total from Gate 4]
- RLS policies created: [X]
- Indexes created: [X]

### Entity Coverage
| Entity | Table | Enum | RLS | Types | Status |
|--------|-------|------|-----|-------|--------|
| [name] | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | PASS/FAIL |

### Dependency Validation (Gate 4)
| Relationship | Foreign Key | Direction | Status |
|-------------|------------|-----------|--------|
| [a → b] | ✅/❌ | ✅/❌ | PASS/FAIL |

### Issues: [list or "None"]
### Ready for Stage 2: YES / NO
```

### Post-Stage
Update `BUILD-STATE.md` per the format in CLAUDE.md.

⛔ **STOP. Do not proceed to Stage 2. Wait for "continue" or correction instructions.**

---

# STAGE 2 — AUTH & SYSTEM SPINE (Layer 1)
## Audit Level: FULL

### Pre-Flight
1. Read CLAUDE.md
2. Read PROJECT-SPEC.md
3. Read BUILD-STATE.md — confirm Stage 1 status is PASS
4. Output SCOPE DECLARATION

### Task
Implement authentication, role management, and system-level logging.

### Allowed Files
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/middleware.ts`
- `src/lib/auth/**`
- `src/middleware.ts`
- `src/app/(auth)/**`
- `src/app/layout.tsx`
- `supabase/migrations/002_auth_and_roles.sql` (new migration only)

### Forbidden
- Do NOT create business entity CRUD (Stage 3)
- Do NOT create feature UI beyond auth screens
- Do NOT modify Stage 1 migration file
- Do NOT add entities not in Gate 1

### Requirements
1. Supabase Auth setup (email + any providers specified in Gate 0)
2. Role assignment system matching Gate 3 roles
3. Supabase client helpers (browser + server) — **create server client ONCE in middleware, never in parallel components**
4. Next.js middleware for route protection by role
5. System event logger utility (creates log entries for auth events)
6. Auth UI: sign-in, sign-up, sign-out, password reset (shadcn/ui, minimal)
7. Root layout with auth provider
8. Session management and token refresh — **use @supabase/ssr with PKCE flow**
9. Create `/api/health` endpoint — checks app running + DB connected (SELECT 1) + returns `{ status: 'ok', timestamp, version }`
10. Install and configure `@sentry/nextjs` — error boundary on root layout, DSN from env var

### Audit — FULL
1. **ROLE COVERAGE:** Confirm every role from Gate 3 can be assigned and checked.
2. **ROUTE PROTECTION:** Confirm middleware protects routes by role correctly.
3. **EVENT LOGGING:** Confirm auth events are logged (sign_up, sign_in, sign_out).
4. **SESSION:** Confirm token refresh and session persistence work.
5. **DEPENDENCY VALIDATION:** Confirm this stage only uses Stage 1 schema. Flag higher-layer coupling.
6. **STAGE 1 INTEGRITY:** Confirm no Stage 1 files were modified.
7. **COLUMN SYNC:** Parse ALL server actions and lib files. Every .eq(), .select(), .insert(), .update() column reference must match a real column in the migration. Flag mismatches as BLOCKING.
8. **UI STATE CHECK:** Auth pages must have: loading state during submission, error state for failed login/signup (field-level messages), disabled submit button during loading, success redirect.
9. **FORM VALIDATION:** Sign-up form must validate: email format, password minimum length, confirm password match. Sign-in form must validate: email required, password required. All via Zod.
10. **ENV VAR AUDIT:** All Supabase env vars referenced in code must exist in .env.example.
11. **HARDCODED SCAN:** No hardcoded URLs, keys, or credentials.
12. **TSC + LINT:** `npx tsc --noEmit` and `npx eslint src/ --quiet` must both pass.

### Report Format
```
## STAGE 2 COHERENCE REPORT — AUTH & SYSTEM SPINE

### Summary
- Roles implemented: [X] / [total from Gate 3]
- Auth events logged: [list]
- Protected routes: [X]

### Role Coverage
| Role | Assignable | Middleware | Routes Protected | Status |
|------|-----------|-----------|-----------------|--------|
| [role] | ✅/❌ | ✅/❌ | [list] | PASS/FAIL |

### Dependency Validation
| Uses | From Stage | Valid | Status |
|------|-----------|-------|--------|
| [what] | [N] | ✅/❌ | PASS/FAIL |

### Stage 1 files modified: [list or "None"]
### Issues: [list or "None"]
### Ready for Stage 3: YES / NO
```

### Post-Stage
Update `BUILD-STATE.md`.

⛔ **STOP. Wait for "continue" or corrections.**

---

# STAGE 3 — CRUD (Layer 2)
## Audit Level: FULL

### Pre-Flight
1. Read CLAUDE.md
2. Read PROJECT-SPEC.md
3. Read BUILD-STATE.md — confirm Stage 2 status is PASS
4. Read `.codebakers/design/` files — ALL UI must follow the design system
5. If `.codebakers/logic/` has files: read ALL of them — implement rules EXACTLY as documented
6. If `.codebakers/templates/` has files: study visual style before building UI
7. Output SCOPE DECLARATION

### Task
Implement CRUD operations for EVERY entity in Gate 1. Mechanical existence only.

### Allowed Files
- `src/lib/actions/[entity].ts` (one per entity)
- `src/app/(dashboard)/[entity]/**`
- `src/components/[entity]/**`
- `src/lib/utils/**` (shared helpers only)

### Forbidden
- Do NOT implement workflow logic (Stage 4)
- Do NOT implement event triggers (Stage 5)
- Do NOT implement automation (Stage 6)
- Do NOT modify Stage 1 or Stage 2 files
- Do NOT add fields or entities not in Gate 1

### Requirements
For EACH entity in Gate 1:
1. **Server Actions:** create, read (single + list with filters), update, soft-delete
2. **Input Validation:** Zod schema for every mutation
3. **Permission Checks:** Every mutation validates role against Gate 3
4. **Parent Enforcement:** Cannot create entity without parent existing (Gate 4)
5. **Soft Delete:** Set `archived_at`, exclude archived from default queries
6. **Mutability Rules:** Enforce Gate 3 data mutability (append-only, immutable, etc.)
7. **UI — List View:** Table/cards showing entity list with filters
8. **UI — Detail View:** Single entity with all fields
9. **UI — Create Form:** Form with validation
10. **UI — Edit Form:** Pre-populated form (only for mutable entities)

### Audit — FULL
1. **ENTITY COVERAGE:** Confirm full CRUD exists for every Gate 1 entity.
2. **PERMISSION CHECK:** For each entity + role combo, confirm correct access.
3. **PARENT DEPENDENCY:** Confirm parent enforcement per Gate 4.
4. **SOFT DELETE:** Confirm archived_at works and archived records are hidden by default.
5. **MUTABILITY:** Confirm Gate 3 data rules are enforced.
6. **VALIDATION:** Confirm Zod schemas exist for every mutation.
7. **DEPENDENCY VALIDATION:** Walk Gate 4. Confirm all entity relationships enforced.
8. **PRIOR STAGE INTEGRITY:** Confirm no Stage 1 or 2 files modified.
9. **COLUMN SYNC:** For EVERY server action, verify every column name referenced (.eq, .select, .insert, .update, .order) exists in the actual migration schema. This is the #1 source of runtime bugs. Flag ANY mismatch as BLOCKING.
10. **SCHEMA CROSS-REF:** For every .from('table_name'), verify table exists. For every .select('col1, col2'), verify ALL columns exist on that table. For every join, verify FK relationship exists in migration.
11. **ZOD-TYPE SYNC:** Every Zod schema field must match the corresponding TypeScript type field. Every required field in the migration (NOT NULL without DEFAULT) must be required in the Zod schema.
12. **UI STATE CHECK:** Every list page must have loading skeleton, empty state (illustration + CTA), and error state. Every form must have submit loading, field-level errors, success feedback, disabled during submission. Every detail page must have loading skeleton and not-found state.
13. **REVALIDATION CHECK:** Every create/update/delete action must call revalidatePath() or revalidateTag() for affected pages. Otherwise the list page shows stale data after mutations.
14. **ENV VAR AUDIT + HARDCODED SCAN + TSC + LINT:** Same as Stage 2.
15. **BUILD CHECK:** Run `npm run build`. Must complete with zero errors. If it fails, fix before proceeding.
16. **BUTTON WIRING CHECK:** Every `<Button>` with an `onClick` or form `action` must be wired to a real function that exists. Every `<Link>` `href` must point to a route that has a corresponding page file. Flag unwired buttons or broken links as BLOCKING.
17. **NAVIGATION AUDIT:** Sidebar/nav must include a link to every entity list page. Every entity detail page must have a back link to its list page. Breadcrumbs (if used) must be accurate.
18. **MUTATION FEEDBACK:** Every create/update/delete must show a toast (sonner) or inline success message on success, and an error toast on failure. Silent mutations are BLOCKING.

### Report Format
```
## STAGE 3 COHERENCE REPORT — CRUD

### Summary
- Entities with full CRUD: [X] / [total]
- Server actions created: [X]
- UI pages created: [X]

### CRUD Coverage
| Entity | Create | Read | Update | Delete | Perms | Parent | Zod | Status |
|--------|--------|------|--------|--------|-------|--------|-----|--------|
| [name] | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | ✅/N/A | ✅/❌ | PASS/FAIL |

### Data Rules
| Entity | Rule | Enforced | Status |
|--------|------|----------|--------|
| [name] | [mutability] | ✅/❌ | PASS/FAIL |

### Dependency Validation
| Relationship | Enforced in CRUD | Status |
|-------------|-----------------|--------|
| [a → b] | ✅/❌ | PASS/FAIL |

### Prior stage files modified: [list or "None"]
### Issues: [list or "None"]
### Ready for Stage 4: YES / NO
```

### Post-Stage
Update `BUILD-STATE.md`.

⛔ **STOP. Wait for "continue" or corrections.**

---

# STAGE 4 — VERTICAL SLICE (Layer 3)
## Audit Level: LIGHT

### Pre-Flight
1. Read CLAUDE.md
2. Read PROJECT-SPEC.md — specifically the **Primary Workflow** in Gate 2
3. Read BUILD-STATE.md — confirm Stage 3 status is PASS
4. If `.codebakers/logic/` has files: re-read — workflow may involve complex business rules
5. If `.codebakers/references/` has API docs: read docs for any integrations in the workflow
6. Output SCOPE DECLARATION

### Task
Implement the PRIMARY WORKFLOW defined in PROJECT-SPEC.md Gate 2 end-to-end. This is the first complete user journey through the app.

### Allowed Files
- `src/app/(dashboard)/**` (workflow-specific pages and modifications)
- `src/lib/actions/**` (workflow logic — may ADD to existing action files)
- `src/components/**` (workflow-specific components)

### Forbidden
- Do NOT implement secondary workflows
- Do NOT add event listeners or triggers (Stage 5)
- Do NOT add automation (Stage 6)
- Do NOT modify Stage 1 or Stage 2 files
- Do NOT add state changes not in Gate 2

### Requirements
1. Implement every state change from Gate 2 that is part of the primary workflow
2. Wire UI to walk through the complete workflow
3. Each state transition validates against Gate 3 permissions
4. Workflow must be completable end-to-end with no dead ends
5. Error handling for failed transitions (clear user feedback)
6. Loading states for all async operations

### Audit — LIGHT
1. **WORKFLOW COMPLETENESS:** Walk every step. Confirm each Gate 2 state change fires.
2. **DEPENDENCY VALIDATION:** Confirm only Stage 1–3 dependencies used.
3. **PRIOR STAGE INTEGRITY:** Confirm no Stage 1–2 files modified.

### Report Format
```
## STAGE 4 COHERENCE REPORT — VERTICAL SLICE

### Workflow: [name from Gate 2]
### State transitions implemented: [X] / [total in workflow]

### Workflow Steps
| # | Actor | Action | State Change | Working | Status |
|---|-------|--------|-------------|---------|--------|
| 1 | [role] | [action] | [change] | ✅/❌ | PASS/FAIL |

### Dependency Validation
| Uses | From Stage | Valid | Status |
|------|-----------|-------|--------|
| [what] | [N] | ✅/❌ | PASS/FAIL |

### Prior stage files modified: [list or "None — only appended to action files"]
### Issues: [list or "None"]
### Ready for Stage 5: YES / NO
```

### Post-Stage
Update `BUILD-STATE.md`.

⛔ **STOP. Wait for "continue" or corrections.**

---

# STAGE 5 — EVENT SYSTEM (Layer 4)
## Audit Level: LIGHT

### Pre-Flight
1. Read CLAUDE.md
2. Read PROJECT-SPEC.md
3. Read BUILD-STATE.md — confirm Stage 4 status is PASS
4. Output SCOPE DECLARATION

### Task
Add the event system. Every meaningful state change from Gate 2 must emit an event.

### Allowed Files
- `supabase/migrations/003_events.sql` (new migration)
- `src/types/events.ts`
- `src/lib/events/**`
- `src/lib/actions/**` (APPEND event emissions only — do not change existing logic)

### Forbidden
- Do NOT implement automation that reacts to events (Stage 6)
- Do NOT implement AI processing (Stage 7)
- Do NOT change existing business logic — only ADD event emissions
- Do NOT modify Stage 1 schema migration

### Requirements
1. Events table: `id`, `event_type`, `entity_type`, `entity_id`, `actor_id`, `payload (jsonb)`, `metadata (jsonb)`, `created_at`
2. Event type enum covering all Gate 2 state changes
3. TypeScript types for all events
4. `emitEvent()` utility function
5. Add event emission to every state-changing action (Stages 3 and 4)
6. Events capture: who, what entity, what changed, previous state, new state
7. Event query utilities: by entity, by type, by actor, by time range
8. Activity feed component (optional but recommended — read-only display of events)

### Audit — LIGHT
1. **EVENT COVERAGE:** Every Gate 2 state change emits an event. Flag missing.
2. **DEPENDENCY VALIDATION:** Events depend only on Stages 1–4.
3. **APPEND-ONLY:** No event update or delete operations exist.

### Report Format
```
## STAGE 5 COHERENCE REPORT — EVENT SYSTEM

### Summary
- Event types defined: [X]
- State changes covered: [X] / [total from Gate 2]

### Event Coverage
| State Change | Event Type | Emitted | Status |
|-------------|-----------|---------|--------|
| [change] | [type] | ✅/❌ | PASS/FAIL |

### Dependency Validation
| Uses | From Stage | Valid | Status |
|------|-----------|-------|--------|
| [what] | [N] | ✅/❌ | PASS/FAIL |

### Issues: [list or "None"]
### Ready for Stage 6: YES / NO
```

### Post-Stage
Update `BUILD-STATE.md`.

⛔ **STOP. Wait for "continue" or corrections.**

---

# STAGE 6 — AUTOMATION (Layer 5)
## Audit Level: LIGHT

### Pre-Flight
1. Read CLAUDE.md
2. Read PROJECT-SPEC.md — specifically **Automation Rules** in Gate 4
3. Read BUILD-STATE.md — confirm Stage 5 status is PASS
4. Output SCOPE DECLARATION

### Task
Implement automation that REACTS to events. Automation is deterministic — it does not reason.

### Allowed Files
- `src/lib/automation/**`
- `src/lib/jobs/**`
- `supabase/functions/**` (edge functions if needed)
- `supabase/migrations/004_automation.sql` (if needed)

### Forbidden
- Do NOT add AI reasoning (Stage 7)
- Do NOT modify event emission logic (Stage 5)
- Do NOT modify CRUD logic (Stage 3)
- Do NOT modify schema from Stage 1

### Requirements
1. Event listener/subscriber infrastructure
2. Implement every automation rule from PROJECT-SPEC.md Gate 4 Automation Rules
3. Each rule has: trigger event, action, failure handling
4. All automation must be idempotent (safe to retry)
5. Automation execution logging (what ran, when, success/failure)
6. Retry mechanism for failed automations

### Audit — LIGHT
1. **AUTOMATION COVERAGE:** Every rule from Gate 4 is implemented and triggered correctly.
2. **IDEMPOTENCY:** Each automation is safe to re-execute.
3. **DEPENDENCY VALIDATION:** Automation reads events (Stage 5) and calls CRUD (Stage 3). No direct schema manipulation.

### Report Format
```
## STAGE 6 COHERENCE REPORT — AUTOMATION

### Summary
- Automation rules implemented: [X] / [total from Gate 4]

### Automation Coverage
| Rule | Trigger | Action | Idempotent | Logged | Status |
|------|---------|--------|-----------|--------|--------|
| [name] | [event] | [action] | ✅/❌ | ✅/❌ | PASS/FAIL |

### Dependency Validation
| Uses | From Stage | Valid | Status |
|------|-----------|-------|--------|
| [what] | [N] | ✅/❌ | PASS/FAIL |

### Issues: [list or "None"]
### Ready for Stage 7: YES / NO
```

### Post-Stage
Update `BUILD-STATE.md`.

⛔ **STOP. Wait for "continue" or corrections.**

---

# STAGE 7 — AI LAYER (Layer 6)
## Audit Level: LIGHT

### Pre-Flight
1. Read CLAUDE.md
2. Read PROJECT-SPEC.md — specifically **AI Features** in Gate 4
3. Read BUILD-STATE.md — confirm Stage 6 status is PASS
4. Output SCOPE DECLARATION

### Task
Implement AI reasoning. AI reads events and entity state. AI does NOT mutate schema — its output flows through existing CRUD.

### Allowed Files
- `src/lib/ai/**`
- `src/app/api/ai/**`
- `src/components/ai/**`
- `src/app/(dashboard)/**/` (AI feature UI additions)

### Forbidden
- Do NOT modify schema (Stage 1)
- Do NOT modify auth (Stage 2)
- Do NOT modify CRUD logic (Stage 3)
- Do NOT modify automation (Stage 6)
- AI must NOT write directly to database — all persistence through Stage 3 CRUD

### Requirements
1. AI service abstraction (provider-agnostic wrapper)
2. Context assembly: gather relevant events + entity state for AI reasoning
3. Implement every AI feature from PROJECT-SPEC.md Gate 4 AI Features
4. AI output persisted through existing CRUD actions
5. Rate limiting and error handling
6. Loading states and streaming UI where appropriate
7. Fallback behavior when AI is unavailable
8. Generate `README.md` — project overview, tech stack, setup instructions (clone, install, env vars, seed, run), deployment instructions, architecture overview
9. Generate `.github/workflows/ci.yml` — lint (`next lint`), type check (`tsc --noEmit`), vitest, playwright
10. Generate `.env.example` — every env var with comments, no real values
11. Verify `@sentry/nextjs` is configured (from Stage 2) with error boundaries on root layout

### Smoke Test (Stage 7 Only — After All Code Written, Before Final Audit)
Walk through EVERY primary workflow from Gate 2 and verify it works end-to-end:
```
SMOKE TEST:
For each primary workflow in Gate 2:
  1. Describe the steps a real user would take
  2. For each step, verify: the page loads, the button/link exists, clicking it does something, 
     the expected state change happens, the user is redirected/shown feedback
  3. For each form: submit with valid data → verify success. Submit with empty data → verify error message.
  4. For each list page: verify items appear after creation. Verify item disappears after deletion/archive.
  5. For each protected route: verify redirect to login when unauthenticated.
Flag any flow that doesn't complete end-to-end as BLOCKING.
```

### Audit — LIGHT
1. **AI ISOLATION:** AI never writes directly to database. All via CRUD.
2. **CONTEXT ACCURACY:** AI context pulls from events (Stage 5) and entities (Stage 3).
3. **DEPENDENCY VALIDATION:** AI layer depends only on lower layers. No circular deps.
4. **FINAL BUILD CHECK:** `npm run build` must succeed with zero errors and zero warnings.
5. **ROUTE AUDIT:** List every page file in `src/app/`. List every `<Link>` href in the codebase. Cross-reference: every page is reachable via at least one link. Every link points to an existing page. Flag orphan pages and broken links as BLOCKING.
6. **LIGHTHOUSE:** Run Lighthouse on the main dashboard page. Performance ≥ 90, Accessibility ≥ 90, Best Practices ≥ 90, SEO ≥ 90. Flag any score below 90.
7. **PACKAGE.JSON SCRIPTS:** Verify these scripts exist: `dev`, `build`, `lint`, `test`, `test:e2e`. Flag missing as WARNING.

### Report Format
```
## STAGE 7 COHERENCE REPORT — AI LAYER (FINAL)

### Summary
- AI features implemented: [X] / [total from Gate 4]

### AI Coverage
| Feature | Context | Output Via | DB Isolation | Status |
|---------|---------|-----------|-------------|--------|
| [name] | [source] | [CRUD action] | ✅/❌ | PASS/FAIL |

### Dependency Validation
| Uses | From Stage | Valid | Status |
|------|-----------|-------|--------|
| [what] | [N] | ✅/❌ | PASS/FAIL |

### Issues: [list or "None"]

---

## 🏁 BUILD COMPLETE

### Final Summary
- Total stages: 7/7
- Total entities: [X]
- Total state changes: [X]
- Total events: [X]
- Total automation rules: [X]
- Total AI features: [X]
- Total files created: [X]
- Architecture violations: [X or "None"]
```

### Post-Stage
Final update to `BUILD-STATE.md`.

⛔ **BUILD COMPLETE. If running via forge.mjs, launch phase starts automatically. If manual, run: node .codebakers/launch.mjs**

---

# CONTEXT RECOVERY PROMPT

> Use this if Claude Code drifts mid-stage or seems confused.

```
STOP. You have lost context. Do the following:

1. Re-read CLAUDE.md completely
2. Re-read PROJECT-SPEC.md completely
3. Re-read BUILD-STATE.md completely
4. You are currently on Stage [N]
5. Re-read Stage [N] in BUILD-STAGES.md
6. Output your SCOPE DECLARATION
7. List what you have already completed in this stage
8. List what remains
9. Continue from where you left off

Do NOT start the stage over. Do NOT modify files you already created unless they have bugs.
```

---

# End of BUILD-STAGES.md
