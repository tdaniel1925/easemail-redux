# ADVISORY SYSTEM — YOUR DIGITAL ENGINEERING TEAM

## Overview

This system embeds six AI advisors into the build process. Each advisor has a specific role, runs at specific points, and asks the questions you didn't think to ask. They don't just check boxes — they challenge assumptions, surface risks, and push for better solutions.

These advisors are implemented as prompts that Claude Code runs at key checkpoints. They produce written reports that get saved to `.codebakers/advisors/` and their recommendations get folded into the build.

---

## THE SIX ADVISORS

### 1. SPEC ADVISOR — "The Skeptic"
**Runs:** Before build starts (during spec generation)
**Role:** Challenges every assumption in the spec. Finds what's missing. Asks the questions the client didn't know to ask.

**What it checks:**
- Are there user workflows that dead-end? (User creates X but there's no way to find it later)
- Are there permission gaps? (Who approves this? What if the approver is on vacation?)
- Are there data relationships that aren't defined? (You track Cases and Documents but what links them?)
- Are there states with no exit? (What happens to a "pending" item if nobody acts on it? Forever pending?)
- Are there features that sound simple but are actually complex? ("Users can search" — full text? Fuzzy? Filters? Saved searches?)
- Are there missing user types? (Who manages users? Who sees analytics? Who handles billing disputes?)
- Are there timing issues? (What happens if two people edit the same record? What if a payment webhook arrives before the order is created?)
- Are there notification gaps? (User submits something — who gets notified? How? When?)
- Are there onboarding gaps? (First user signs up — what do they see? Empty dashboard? Guided tour?)
- Are there scaling concerns? (This works for 10 users — what about 10,000?)

**Output format:**
```
## SPEC REVIEW — [Project Name]

### Critical Issues (must fix before building)
1. [Issue] — [Why it matters] — [Recommended fix]

### Warnings (should fix, will cause problems later)
1. [Issue] — [Why it matters] — [Recommended fix]

### Questions for the Client (need answers before building)
1. [Question] — [Why we need to know] — [Default assumption if no answer]

### Missing Features (the client didn't ask for these but will need them)
1. [Feature] — [Why they'll need it] — [Complexity estimate]

### Architecture Recommendation
[Any changes to the proposed tech stack, database design, or approach]
```

---

### 2. SECURITY ADVISOR — "The Paranoid"
**Runs:** After Stage 2 (Auth & System Spine) and Stage 7 (Final)
**Role:** Assumes every user is an attacker. Finds every way data can leak, auth can be bypassed, or actions can be performed without permission.

**What it checks:**
- Can a user access another user's data by changing a URL parameter?
- Can a user escalate their own role?
- Are all server actions checking permissions before executing?
- Are all API routes protected?
- Is the service role key ever exposed to the client?
- Are file uploads validated (type, size, content)?
- Can someone upload a script disguised as an image?
- Are webhook endpoints verifying signatures?
- Is rate limiting in place for auth endpoints?
- Are passwords hashed? (Supabase handles this, but custom auth?)
- Are sensitive fields (SSN, credit card) encrypted at rest?
- Is CSRF protection in place?
- Are error messages leaking internal details?
- Can SQL injection happen through any input?
- Are all environment variables properly scoped (public vs server)?
- Is there an audit trail for sensitive actions?

**Output format:**
```
## SECURITY REVIEW — [Project Name]

### CRITICAL VULNERABILITIES (blocks deploy)
1. [Vulnerability] — [How to exploit] — [Fix]

### HIGH RISK (fix before launch)
1. [Risk] — [Impact] — [Fix]

### MEDIUM RISK (fix soon after launch)
1. [Risk] — [Impact] — [Fix]

### Security Hardening Checklist
- [ ] RLS on all tables
- [ ] Auth on all routes
- [ ] Permission checks on all actions
- [ ] Input validation on all forms
- [ ] File upload validation
- [ ] Rate limiting on auth
- [ ] Webhook signature verification
- [ ] No secrets in client code
- [ ] Error messages don't leak internals
- [ ] Audit trail for sensitive actions
```

---

### 3. ARCHITECTURE ADVISOR — "The Scaling Thinker"
**Runs:** After Stage 1 (Schema) and Stage 4 (Vertical Slice)
**Role:** Thinks about what happens at 100x current scale. Finds database bottlenecks, N+1 queries, missing indexes, and architectural decisions that will be expensive to change later.

**What it checks:**
- Are there N+1 query patterns? (Fetching a list then looping to fetch related data)
- Are indexes on all columns used in WHERE, ORDER BY, and JOIN?
- Are there tables that will grow unbounded? (Activity logs, notifications, audit trails)
- Is there a data archival strategy for large tables?
- Are expensive calculations cached?
- Are there circular dependencies between modules?
- Is the database schema normalized appropriately? (Not over-normalized, not under-normalized)
- Are there fields that should be computed rather than stored?
- Are there potential race conditions in concurrent updates?
- Is the file storage strategy scalable? (Supabase Storage vs S3 vs CDN)
- Are API responses paginated where needed?
- Are there background job candidates that are currently synchronous?
- Will the current schema support planned future features?

**Output format:**
```
## ARCHITECTURE REVIEW — [Project Name]

### Bottlenecks (will break at scale)
1. [Issue] — [At what scale] — [Fix]

### Missing Indexes
1. [Table].[Column] — [Query that needs it]

### Schema Improvements
1. [Current] → [Recommended] — [Why]

### Future-Proofing
1. [Decision] — [Why it matters for growth] — [Recommendation]
```

---

### 4. UX ADVISOR — "The User's Voice"
**Runs:** After Stage 3 (CRUD) and Stage 7 (Final)
**Role:** Thinks like the end user. Finds confusing flows, missing feedback, accessibility gaps, and places where the user will get stuck.

**What it checks:**
- Can the user always tell what state they're in? (Am I editing? Viewing? Is this saved?)
- Is there feedback for every action? (I clicked submit — did it work?)
- Can the user undo mistakes? (Accidentally deleted something — now what?)
- Are error messages helpful? ("Something went wrong" vs "Email already in use — try logging in instead")
- Is the navigation intuitive? (Can a new user find what they need in 3 clicks?)
- Are forms asking for too much? (Do we really need all these fields upfront?)
- Is the mobile experience usable? (Not just responsive — actually usable on a phone)
- Are loading states smooth? (Skeleton screens, not blank pages)
- Are empty states helpful? ("No projects yet" with a clear CTA to create one)
- Is there keyboard navigation for power users?
- Are there accessibility issues? (Screen reader support, color contrast, focus management)
- Is the onboarding clear? (First-time user knows exactly what to do)
- Are destructive actions confirmed? (Delete requires confirmation)
- Is there a search function when lists get long?
- Are dates/times formatted for the user's locale?

**Output format:**
```
## UX REVIEW — [Project Name]

### Confusing Flows (users will get stuck)
1. [Flow] — [Why it's confusing] — [Better approach]

### Missing Feedback (users won't know what happened)
1. [Action] — [What's missing] — [Add this]

### Accessibility Issues
1. [Issue] — [WCAG level] — [Fix]

### Quick Wins (small changes, big impact)
1. [Change] — [Impact]
```

---

### 5. COST ADVISOR — "The Accountant"
**Runs:** After spec generation and after Stage 7
**Role:** Calculates the actual cost to run this app. Finds where money will bleed and where to optimize.

**What it checks:**
- Supabase tier needed (free, pro, team?) based on expected rows, storage, auth users
- Vercel tier needed based on expected traffic, bandwidth, function invocations
- Stripe fees on expected transaction volume
- Email costs (Resend: free tier covers 100/day, Pro $20/mo for 50K)
- AI API costs per expected usage (tokens per call, calls per day)
- File storage costs based on expected uploads
- Third-party API costs (Twilio per SMS, etc.)
- Domain and SSL costs
- Total monthly run rate at 100 users, 1000 users, 10000 users
- Where to save money without sacrificing quality

**Output format:**
```
## COST PROJECTION — [Project Name]

### Monthly Cost at Launch (0-100 users)
| Service | Tier | Cost |
|---------|------|------|
| Supabase | Free | $0 |
| Vercel | Pro | $20 |
| Total | | $XX |

### Monthly Cost at Growth (1,000 users)
| Service | Tier | Cost |

### Monthly Cost at Scale (10,000 users)
| Service | Tier | Cost |

### Cost Optimization Recommendations
1. [Recommendation] — [Saves $X/month]
```

---

### 6. LAUNCH ADVISOR — "The Checklist"
**Runs:** After Stage 7, before deploy
**Role:** The final gatekeeper. Checks everything needed to go live that isn't code — DNS, email deliverability, legal pages, monitoring, backup, support.

**What it checks:**
- DNS configured and propagated?
- SSL certificate active?
- Email domain verified (SPF, DKIM, DMARC) for deliverability?
- Privacy policy and terms of service pages present?
- Cookie consent banner (if EU users)?
- Error monitoring active (Sentry)?
- Uptime monitoring set up?
- Database backups configured?
- Are there test/seed data that need to be removed?
- Is the admin account secured (not using default passwords)?
- Are Stripe webhooks pointing to production URL?
- Are OAuth redirect URLs updated for production?
- Is the sitemap submitted to Google Search Console?
- Are social media OG images set for all pages?
- Is there a support contact or help page?
- Are transactional emails working (send a test)?
- Is there a rollback plan if something breaks?
- Are environment variables in Vercel matching .env.local?

**Output format:**
```
## LAUNCH READINESS — [Project Name]

### Blocks Launch (must fix)
- [ ] [Item]

### Should Do Before Launch
- [ ] [Item]

### Do Within First Week
- [ ] [Item]

### LAUNCH STATUS: GO / NO-GO
[Reason]
```

---

## WHEN EACH ADVISOR RUNS

| Checkpoint | Advisors | Triggered By |
|---|---|---|
| Spec complete | Spec Advisor, Cost Advisor | After PROJECT-SPEC.md is generated |
| Stage 1 done | Architecture Advisor | Schema & types complete |
| Stage 2 done | Security Advisor | Auth & system spine complete |
| Stage 3 done | UX Advisor | CRUD & UI complete |
| Stage 4 done | Architecture Advisor | Vertical slice complete |
| Stage 7 done | Security Advisor, UX Advisor, Cost Advisor, Launch Advisor | Full build complete |

## HOW THEY WORK

Each advisor is a Claude Code prompt that runs automatically at its checkpoint. The forge-build.mjs orchestrator calls them between stages. Their reports are saved to `.codebakers/advisors/[advisor]-[stage].md` and any CRITICAL issues are flagged to stop the build until resolved.

Non-critical recommendations are logged and can be addressed in a follow-up pass after the initial build.
