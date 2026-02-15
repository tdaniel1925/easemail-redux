# CLAUDE.md — HARD RULES FOR THIS PROJECT

> **You are a deterministic executor, not an architect.**
> The architecture is frozen in PROJECT-SPEC.md. You implement increments only.

---

## MANDATORY PRE-FLIGHT — RUN BEFORE EVERY STAGE

Before writing ANY code, you MUST:

1. Read `PROJECT-SPEC.md` completely (Gate 0 + Gate 1 — always required)
2. Read the **stage-specific spec files** listed in BUILD-STAGES.md for your current stage
3. Read `.codebakers/design/INDEX.md` and all design files (color-system.md, typography.md, animations.md, dark-mode.md) for any stage that produces UI
4. Read `.codebakers/references/INDEX.md` and identify relevant API + design references
5. If `.codebakers/logic/` contains files: read ALL of them before implementing business logic
6. If `.codebakers/migrations/` contains files: read ALL of them before designing schema (Stage 1)
7. If Stage 3+: Study components in `.codebakers/templates/` before writing ANY UI code
8. Read `BUILD-STATE.md` (if it exists — it won't exist before Stage 1)
9. Read `BUILD-STAGES.md` and locate ONLY your current stage
10. If `.codebakers/advisors/` contains reports from previous stages: read them and address any CRITICAL issues
11. Output a **SCOPE DECLARATION** in this exact format:

```
## SCOPE DECLARATION — STAGE [N]

### I am building:
[List exactly what this stage produces]

### I am allowed to create/modify these files:
[List from the stage's ALLOWED FILES]

### I am FORBIDDEN from:
[List from the stage's FORBIDDEN section]

### Entities I know about (from PROJECT-SPEC.md):
[List every entity from Gate 1]

### State changes I know about (from PROJECT-SPEC.md):
[List every state change from Gate 2 relevant to this stage]

### Dependencies I must respect (from PROJECT-SPEC.md Gate 4):
[List the adjacency relationships]
```

**If you cannot produce this scope declaration, STOP and ask for clarification.**
**If you produce this and it doesn't match PROJECT-SPEC.md, you have a problem. STOP.**

---

## GLOBAL RULES — APPLY TO EVERY LINE OF CODE YOU WRITE

### Design Rules
- All UI must follow `.codebakers/design/` system files — colors, typography, components, layout patterns, animations.
- Colors come from CSS variables only. Never hardcode hex/rgb values.
- Use shadcn/ui for forms, dialogs, controls. Use Tremor for dashboards, charts, data. Use Framer Motion for animations.
- Every app must support light + dark mode via next-themes.
- The color palette is AI-generated based on the app description in Gate 0. It must be generated during Stage 3 before any UI is built.
- Never use Inter, Roboto, Arial, or system default fonts. Select distinctive Google Fonts per `.codebakers/design/typography.md`.

### Design Token Enforcement
- A `design-tokens.ts` file must be created in Stage 3 that exports ALL design constants: colors (as CSS variable references), spacing scale, border radii, shadow values, font sizes, font weights, breakpoints, animation durations.
- ALL components must import from `design-tokens.ts` — never use raw Tailwind values for colors, spacing, or typography that should match the design system.
- Allowed raw Tailwind: layout utilities (flex, grid, w-full, p-4 for standard spacing), responsive prefixes (sm:, md:, lg:).
- Forbidden raw Tailwind: color classes (bg-blue-500), font sizes (text-lg) unless they match the type scale, border radius (rounded-lg) unless it matches the token, shadows (shadow-md) unless it matches the token.
- Exception: shadcn/ui components use their own theming via CSS variables — that's fine as long as the CSS variables are set correctly in globals.css.

### Component Consistency Rules
- Every project uses ONE button component (shadcn `<Button>`), ONE input component, ONE select component, etc. Never mix shadcn and raw HTML for the same element type.
- All interactive elements must have: hover state, focus state (visible ring), active/pressed state, disabled state, loading state (for buttons that trigger async actions).
- All hover states use the same transition duration (150ms or design token value).
- All focus rings use the same color and style (ring-2 ring-offset-2 with the primary color).
- All modals/dialogs use the same animation (Framer Motion or shadcn Dialog).
- All toasts use the same library (sonner or shadcn Toast) and position (top-right or design system standard).

### Typography Scale
- Every project must define a type scale in `design-tokens.ts`:
  - `text-xs` (12px), `text-sm` (14px), `text-base` (16px), `text-lg` (18px), `text-xl` (20px), `text-2xl` (24px), `text-3xl` (30px), `text-4xl` (36px)
  - OR custom scale per design system — but it must be defined and consistent.
- Page titles always use the same level. Section headings always use the same level. Body text always uses the same size. Labels always use the same size.
- No random font sizes. Every text element must map to a named level in the type scale.

### Spacing System
- Use Tailwind's default 4px grid (p-1 = 4px, p-2 = 8px, p-4 = 16px, p-6 = 24px, p-8 = 32px).
- Page padding: consistent across all pages (e.g., p-6 on desktop, p-4 on mobile).
- Card padding: consistent across all cards.
- Form field spacing: consistent gap between all form fields.
- Section spacing: consistent gap between sections on all pages.
- If the design system specifies custom spacing, use `design-tokens.ts` values.

### Dark Mode Rules
- Every page and component must work in both light and dark mode.
- Colors must use CSS variables that swap in dark mode — never hardcode light-only colors.
- Images and illustrations should have appropriate backgrounds in dark mode.
- Borders and dividers must be visible in both modes.
- Stage 7 Playwright tests must screenshot every page in BOTH modes and verify no invisible text, broken contrast, or missing elements.

### Animation Standards
- Page transitions: consistent across all route changes (fade, slide, or none — pick one).
- List items: staggered entrance animation on first render (Framer Motion stagger).
- Modals: fade + scale in, fade out.
- Toasts: slide in from top-right, auto-dismiss.
- Skeleton loaders: pulse animation (Tailwind animate-pulse).
- Interactive feedback: buttons scale slightly on press (scale-95), inputs highlight on focus.
- All animations respect `prefers-reduced-motion: reduce` — disable animations for users who opt out.

### Responsive Testing Requirements
- Every page must be tested at 5 viewport widths: 375px (mobile), 768px (tablet), 1024px (laptop), 1280px (desktop), 1920px (wide).
- Stage 7 Playwright tests capture screenshots at each viewport.
- Known responsive rules:
  - Sidebar → collapses to hamburger or bottom tabs below 768px
  - Tables → horizontal scroll with sticky first column OR card layout below 768px
  - Forms → full-width stacked inputs below 768px
  - Modals → full-screen bottom sheet below 768px
  - Grid layouts → collapse columns (3-col → 2-col → 1-col)
  - Touch targets ≥ 44x44px on mobile

### Entity Rules
- Every entity comes from PROJECT-SPEC.md Gate 1. **You may NOT invent entities.**
- Every entity table includes: `id (uuid)`, `created_at`, `updated_at`, `created_by`, `archived_at`
- **Never hard delete business data.** Use `archived_at` for soft delete.
- No orphan entities. No circular ownership. All relationships are directional.

### State Change Rules
- Every behavior is defined as: Actor → Action → State Change (Gate 2)
- **You may NOT invent state changes.** If it's not in Gate 2, it doesn't exist.
- UI is a visualization of state. If it doesn't change state, it's not functionality.

### Permission Rules
- All permissions come from PROJECT-SPEC.md Gate 3. **You may NOT invent roles or permissions.**
- Every mutation checks permissions before executing.

### Dependency Rules
- Higher layers may depend on lower layers.
- **Lower layers may NEVER depend on higher layers.**
- All dependencies come from Gate 4. **You may NOT create undeclared coupling.**

### Layer Rules
- Layer 0: Schema & Types
- Layer 1: Auth & System Spine
- Layer 2: CRUD
- Layer 3: Vertical Slice (first workflow)
- Layer 4: Event System
- Layer 5: Automation
- Layer 6: AI

**You build ONE layer per stage. Never combine layers.**

### Event Rules
- Events are append-only. No updates. No deletes.
- Automation listens to events. AI reads events.
- **Automation does not reason. AI does not mutate schema.**

### File Rules
- **Never modify files outside your current stage's allowed list.**
- **Never modify files from a previous stage** unless the current stage explicitly permits appending to them.
- Check your allowed file list before every file creation or modification.

### Next.js / Supabase Trap Rules (CRITICAL — These Cause 80% of Runtime Bugs)
- **redirect() must NEVER be inside a try/catch.** Next.js redirect() throws internally. If caught, the redirect silently fails. Place redirect() AFTER the try/catch block.
- **Every server action file must start with `'use server'` on line 1.** Missing this causes the function to run on the CLIENT, exposing DB queries to the browser.
- **All Supabase queries must use `{ cache: 'no-store' }` or `unstable_noStore()`.** Next.js caches fetches by default. Without this, pages show stale data after mutations.
- **Create Supabase server client ONCE in middleware.** Never create multiple server clients in parallel layouts/components — causes token refresh race condition ("Invalid Refresh Token: Already Used") and random logouts.
- **Service role client must use `createClient` from `@supabase/supabase-js` directly.** Never use SSR helpers for service role — the user session overrides the service role key in the Authorization header, causing silent RLS failures.
- **Never use `Date.now()`, `Math.random()`, `window.*`, `localStorage.*`, or `sessionStorage.*` in server components.** These cause hydration mismatches. Wrap in `useEffect` or move to a `'use client'` component.
- **No `console.log` or `console.debug` in production code.** Use `console.warn` and `console.error` only. Configure ESLint `no-console` rule.
- **Every `npm install` must be followed by `npm ls --depth=0` to verify packages exist.** AI can hallucinate package names that don't exist.
- **Every async server action must have error handling.** Wrap in try/catch, return `{ error: message }` on failure, never let exceptions propagate uncaught to the UI.
- **Dynamic route params are ALWAYS strings.** `params.id` is a string, not a number. Always validate and parse before using in queries.
- **Supabase .single() throws if no row found.** Always use `.maybeSingle()` for lookups that might return nothing (detail pages, user profiles).
- **Next.js Image component requires width and height.** Never use `<img>` tag directly. Always use `next/image` with explicit dimensions or `fill` prop.
- **Server components cannot use hooks.** No useState, useEffect, useRouter in server components. If you need interactivity, create a separate `'use client'` child component.
- **Middleware runs on EVERY request.** Keep middleware fast — no heavy DB queries, no AI calls. Only auth checks and redirects.

### Audit Rules
- After completing your stage, run the audit checks defined in BUILD-STAGES.md.
- Output the coherence report in the exact format specified.
- **If any check fails, mark the stage as NOT READY and STOP.**
- After the audit, update `BUILD-STATE.md` with what you built.

---

## FORBIDDEN ACTIONS — NEVER DO THESE

❌ Create entities not in PROJECT-SPEC.md Gate 1
❌ Create state changes not in PROJECT-SPEC.md Gate 2
❌ Create roles or permissions not in PROJECT-SPEC.md Gate 3
❌ Create dependencies not in PROJECT-SPEC.md Gate 4
❌ Modify files from previous stages (unless explicitly allowed)
❌ Skip the pre-flight scope declaration
❌ Skip the post-stage audit
❌ Proceed to the next stage without outputting a coherence report
❌ Refactor previous stage code while building the current stage
❌ Combine multiple stages into one
❌ Add "nice to have" features not in the spec
❌ Use `any` type in TypeScript (use `unknown` if type is unclear)
❌ Hard delete business data
❌ Create circular dependencies between entities
❌ Place `redirect()` inside a `try/catch` block
❌ Create Supabase server clients in multiple parallel components
❌ Use `window`, `localStorage`, or `Date.now()` in server components
❌ Leave `console.log` in non-test files

---

## RECOVERY — IF YOU LOSE CONTEXT MID-STAGE

If at any point you are unsure what you should be doing:

1. Re-read this file (CLAUDE.md)
2. Re-read PROJECT-SPEC.md
3. Re-read `.codebakers/design/` files (if building UI)
4. Re-read BUILD-STATE.md
5. Re-read any advisor reports in `.codebakers/advisors/`
6. Re-output your SCOPE DECLARATION
7. Continue from where you left off

**Never guess. Re-read the files.**

---

## BUILD-STATE.md UPDATE FORMAT

After every stage, create or update `BUILD-STATE.md` with this format:

```markdown
# BUILD STATE — [PROJECT NAME]
## Last completed stage: [N]
## Ready for stage: [N+1]
## Timestamp: [ISO timestamp]

### Stage [N] Summary
- **What was built:** [list]
- **Files created:** [list with paths]
- **Files modified:** [list with paths]
- **Entities implemented:** [list]
- **State changes implemented:** [list]
- **Issues found:** [list or "None"]
- **Coherence status:** PASS / FAIL

### Cumulative State
- **Total files:** [count]
- **Entities with schema:** [list]
- **Entities with CRUD:** [list]
- **Entities with events:** [list]
- **Working workflows:** [list]
- **Active automation rules:** [list]
- **AI features:** [list]
```

---

## DROP-IN FOLDERS — API DOCS, DESIGNS, TEMPLATES, LOGIC, DATA

Five folders where the builder drops files. No config needed. Claude Code auto-detects everything.

### `.codebakers/references/` — API & Integration Docs
Drop API docs here (PDF, markdown, text, or paste a URL in INDEX.md).
Claude Code reads these BEFORE building any integration. The doc overrides training data.
Rules: use exact field names from the doc, handle every error code listed, match auth method exactly, match webhook payloads exactly.

### `.codebakers/templates/` — Design Templates
Drop HTML, React, Next.js files, or screenshots here (or paste a URL in INDEX.md).
Claude Code extracts colors, fonts, spacing, layout and matches the visual style.
Template defines LOOK. Spec defines BEHAVIOR. If they conflict, spec wins.

### `.codebakers/logic/` — Business Logic & Rules
Drop rule docs, decision trees, calculation formulas, pseudocode here.
Claude Code reads these BEFORE implementing any business logic. The doc is the authority.
Rules: implement EXACTLY as documented, no simplification, handle every edge case, put logic in lib/logic/ with unit tests.

### `.codebakers/migrations/` — Data Import
Drop CSVs, JSON exports, old database schemas, or descriptions of existing data here.
Claude Code generates import scripts in scripts/migrate/ during Stage 1.
Rules: validate all data, map old fields to new, log warnings, run idempotently.

### `.codebakers/design/` — Design System (pre-loaded)
Color system, typography, animations, dark mode rules. Pre-loaded in every project.
Claude Code reads these during Stages 3-7 for consistent visual design.

---

## End of CLAUDE.md
