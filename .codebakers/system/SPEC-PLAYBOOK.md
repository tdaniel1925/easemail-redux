# FORGE SPEC GENERATION PLAYBOOK
# Instructions for Claude when generating a .codebakers package from client materials

## TRIGGER
User provides project materials in any form — files, descriptions, URLs, screenshots, etc.

---

## PHASE 1: INGEST & CLASSIFY

Accept everything the user provides. Don't ask them to organize. Read every file, image, and piece of text. For each item, classify it:

| Category | Indicators | Destination |
|----------|-----------|-------------|
| REQUIREMENTS | PRDs, SOWs, feature lists, user stories, proposals, meeting notes, emails about features | Extract into PROJECT-SPEC.md |
| API_DOCS | Endpoints, HTTP methods, request/response, auth flows, webhook payloads, SDK docs | `.codebakers/references/` |
| DESIGN | Screenshots, mockups, wireframes, logos, style guides, brand colors, UI references | `.codebakers/templates/` |
| BUSINESS_LOGIC | Commission tables, calculation rules, decision trees, flowcharts, approval rules, scoring, compliance | `.codebakers/logic/` |
| DATA_IMPORT | CSVs, JSON exports, database dumps, spreadsheets with real data, old system schemas | `.codebakers/migrations/` |
| LEGAL | Privacy policies, terms of service, compliance reqs (HIPAA, SOC2, GDPR) | Flag for app pages |
| REFERENCE | Competitor analysis, market research, industry context | `.codebakers/references/` |

### Special cases:
- **Images of apps/websites** → DESIGN (study the layout) + annotate what to match
- **Images of spreadsheets** → DATA_IMPORT (extract the visible data)
- **Photos of whiteboards** → REQUIREMENTS (extract the ideas) + BUSINESS_LOGIC (extract any rules/flows)
- **PDFs** → Read content to classify, don't trust filename
- **Spreadsheets with formulas** → BUSINESS_LOGIC (the formulas ARE the rules)
- **Spreadsheets with data rows** → DATA_IMPORT
- **URLs** → Fetch and classify the content, save relevant docs

---

## PHASE 2: ASK SMART QUESTIONS

After classifying everything, identify what's MISSING. Ask questions the client didn't think to ask.

### Always ask (if not already answered):
1. **Users** — Who uses this? What are the distinct roles? What can each role do that others can't?
2. **Primary workflow** — What's the #1 thing a user does? Walk me through it step by step.
3. **Edge cases** — What happens when [thing] goes wrong? Who handles disputes/errors/exceptions?
4. **Notifications** — When something happens, who needs to know? How? (Email, SMS, in-app?)
5. **Data lifecycle** — How long is data kept? Can things be deleted? Archived? What triggers cleanup?

### Ask based on what you found:
- Found API docs but no auth details → "How does the user authenticate with [service]?"
- Found commission rules but no payout trigger → "When do commissions get paid out? Who approves?"
- Found screenshots but no mobile views → "Does this need to work on phones?"
- Found data CSVs but no field mapping → "Which columns in this spreadsheet map to which fields in the app?"
- Found legal requirements → "Do you need cookie consent? Data export? Right to delete?"

### Ask the uncomfortable questions:
- "What's your budget for monthly services? This affects which tier of Supabase/Vercel/etc."
- "Who maintains this after launch? Your team or the client?"
- "Is there existing data that needs to be migrated? How much?"
- "Are there any hard deadlines driving this?"

---

## PHASE 3: BUILD THE SPEC

Generate PROJECT-SPEC.md following the Gates 0-5 format:
- Gate 0: App identity, tech stack, environment
- Gate 1: Database schema with every table, column, type, constraint, RLS policy, index
- Gate 2: Workflows as state machines — every status, transition, trigger, guard, side effect
- Gate 3: Permissions matrix — every role × every action × every entity
- Gate 4: Automation rules — every trigger → condition → action chain
- Gate 5: External integrations — every API, webhook, OAuth flow

Incorporate ALL classified materials:
- REQUIREMENTS → drive Gates 0-4
- BUSINESS_LOGIC → drive Gate 2 (workflows) and Gate 4 (automation)
- API_DOCS → drive Gate 5 (integrations)
- DATA_IMPORT → inform Gate 1 (schema must accommodate imported data)
- LEGAL → add compliance requirements to Gate 0 and relevant pages to Gate 2

---

## PHASE 4: ANNOTATE & ORGANIZE FILES

For each file going into a drop-in folder, create an annotation entry in that folder's INDEX.md.

### Annotation Format
When placing a file, add an entry to the folder's INDEX.md:

```markdown
## [filename]
- **Source:** [where this came from — client email, meeting, uploaded doc]
- **Category:** [API_DOCS / DESIGN / BUSINESS_LOGIC / DATA_IMPORT / REFERENCE]
- **Use during:** [which build stage(s) — Stage 1, Stage 3, Stage 5, etc.]
- **Summary:** [1-2 sentences of what this contains]
- **Key details:** [specific things Claude Code should pay attention to]
- **Warnings:** [anything tricky, outdated, or ambiguous in this doc]
```

### Example annotations:

**.codebakers/references/INDEX.md:**
```markdown
## stripe-api-v2.pdf
- **Source:** Client provided via email
- **Category:** API_DOCS
- **Use during:** Stage 5 (Event System) and Stage 6 (Automation)
- **Summary:** Stripe Connect API docs for marketplace payouts to sellers
- **Key details:** Uses Connect with Standard accounts, not Express. Payout schedule is T+2. Webhook uses v2 event format.
- **Warnings:** Doc references Stripe API v2024-12-18. Verify current version before implementing.

## goto-connect-voip.md
- **Source:** Extracted from client's API portal
- **Category:** API_DOCS
- **Use during:** Stage 5
- **Summary:** GoTo Connect API for making and receiving calls, call recording, voicemail
- **Key details:** OAuth2 with refresh tokens. Call events arrive via webhook within 30s. Recording URLs expire after 24h.
- **Warnings:** Rate limit is 10 requests/second. Batch operations not supported.
```

**.codebakers/logic/INDEX.md:**
```markdown
## commission-structure.xlsx
- **Source:** Client CFO provided during kickoff meeting
- **Category:** BUSINESS_LOGIC
- **Use during:** Stage 3 (CRUD for payouts) and Stage 4 (commission calculation workflow)
- **Summary:** 7-level MLM commission structure with qualification rules
- **Key details:** Level 1: 8%, Level 2: 5%, Level 3-5: 3%, Level 6-7: 1%. Agents must have 3 active downlines to qualify for Level 3+. Monthly volume threshold: $5,000 personal, $25,000 team.
- **Warnings:** The "override bonus" column has a formula error in row 47. Correct rate is 2%, not 20%.

## claim-decision-tree.png
- **Source:** Photo of whiteboard from client meeting
- **Category:** BUSINESS_LOGIC  
- **Use during:** Stage 4 (claim processing workflow)
- **Summary:** Decision tree for auto-approving, flagging, or rejecting insurance claims
- **Key details:** Claims under $500 with clean history auto-approve. Claims $500-$5000 go to adjuster. Claims over $5000 require manager + adjuster. Prior fraud flag = always manual review.
- **Warnings:** The "clean history" definition wasn't fully discussed — assume no claims in past 12 months.
```

**.codebakers/templates/INDEX.md:**
```markdown
## client-website-screenshot.png
- **Source:** Screenshot of client's current website
- **Category:** DESIGN
- **Use during:** Stages 3-7 (all UI work)
- **Summary:** Client's existing brand — navy blue (#1a2b4a), gold (#d4a843), clean sans-serif
- **Key details:** Match the color palette and clean aesthetic. They like lots of white space. Navigation is top-bar, not sidebar.
- **Warnings:** The current site is dated — modernize the feel while keeping the color palette.

TEMPLATE URL: https://competitor-app.com/dashboard
```

**.codebakers/migrations/INDEX.md:**
```markdown
## current-customers.csv  
- **Source:** Export from client's existing CRM
- **Category:** DATA_IMPORT
- **Use during:** Stage 1 (schema must accommodate these fields)
- **Summary:** 2,847 customer records with name, email, phone, company, status, created date
- **Key details:** Status field has values: "active", "inactive", "prospect", "churned". 43 records have no email. Phone formats are mixed (some with dashes, some without).
- **Warnings:** Contains real customer PII. Do not commit to git. Import script must validate email format and normalize phone numbers.
```

---

## PHASE 3b: API KEY BLUEPRINT

After the spec is built, identify EVERY external service the app needs. For each one, research the current signup process and create a step-by-step blueprint the user can follow.

### How to identify needed services:

Scan the spec for:
- **Supabase** (always) — database, auth, storage
- **Sentry** (always) — error monitoring
- **Stripe** — any mention of payments, billing, subscriptions, marketplace payouts
- **Resend** — any mention of email, notifications, welcome emails, password reset
- **Twilio** — any mention of SMS, voice, phone calls, WhatsApp
- **Anthropic** — any mention of AI features, Claude, chat, summarization
- **OpenAI** — any mention of GPT, embeddings, image generation
- **Google OAuth** — any mention of Google login, Google Calendar, Google Drive
- **GitHub OAuth** — any mention of GitHub login
- **UploadThing / Supabase Storage** — any file uploads
- **GoTo Connect / Vonage / other VoIP** — any phone system integration
- **Vercel** — deployment (always if deploying)
- **Any other API mentioned in the spec or reference docs**

### For EACH service, research and document:

```markdown
## [Service Name]

**Why you need it:** [one sentence — what it does in this app]
**Cost:** [free tier limits and paid pricing]
**Time to set up:** [estimated minutes]

### Steps to get your keys:

1. Go to [exact URL]
2. Create an account (or log in if you have one)
3. [Exact step — e.g., "Click 'New Project' in the top right"]
4. [Exact step — e.g., "Name it anything, select 'US East' region"]
5. [Exact step — e.g., "Go to Settings → API"]
6. Copy these values:
   - `NEXT_PUBLIC_SUPABASE_URL` → the Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → the anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY` → the service_role key (keep secret)

### Extra setup needed:
- [e.g., "Enable Google provider in Auth → Providers"]
- [e.g., "Add your domain to allowed redirect URLs"]
- [e.g., "Create a webhook endpoint pointing to your-app.com/api/webhooks/stripe"]

### Gotchas:
- [e.g., "Stripe test mode keys start with sk_test_ — switch to live before launch"]
- [e.g., "Resend requires domain verification for production — takes 24-48 hours"]
```

### Present the blueprint to the user:

After the spec is done, give the user a clear summary:

```
Here's everything you'll need before deploying. I've ordered them by 
priority — do the ones marked "BEFORE BUILD" first, the rest can 
wait until the build finishes.

BEFORE BUILD (do these now while it builds):
  1. Supabase — create project (~3 min) [or auto-created by forge.mjs]
  2. Sentry — create project (~2 min)

BEFORE DEPLOY (do these when the build finishes):
  3. Stripe — create account, get API keys (~5 min)
  4. Resend — create account, verify domain (~5 min + 24h for domain)
  
OPTIONAL (can add later):
  5. Google OAuth — set up in Google Cloud Console (~10 min)

Total setup time: ~25 minutes (excluding domain verification wait)
```

### Rules:
1. **Always research current signup flows.** Don't assume — dashboards change. Use web search if needed to verify current URLs and steps.
2. **Note free tier limits.** If Supabase free tier only allows 50K rows, say so. The user needs to know when they'll hit a paywall.
3. **Flag time-sensitive steps.** Domain verification for email (Resend, SES) takes 24-48 hours. Tell them to start this FIRST.
4. **Separate test vs production keys.** Tell the user which keys to use during development and which to swap for launch.
5. **Include webhook URLs.** If a service needs a webhook endpoint, tell the user the exact URL format: `https://your-domain.com/api/webhooks/[service]`
6. **Note if forge.mjs handles it automatically.** Supabase can be auto-provisioned — tell the user they can skip manual setup if they want.

Assemble the .codebakers zip with:
1. PROJECT-SPEC.md (the full spec from Phase 3)
2. API-KEY-BLUEPRINT.md (the setup guide from Phase 3b — also present to user in chat)
3. CLAUDE.md, BUILD-STAGES.md, ADVISORS.md (build system)
4. forge.mjs (the runner)
5. All classified files in their correct folders with annotations
6. All patterns, design system, references (standard system files)

Present the zip to the user with a summary:
- What was found in their materials
- What was classified where
- What questions were answered vs what assumptions were made
- The API key blueprint (so they can start setting up accounts while the build runs)
- What the user needs to do next (just run `node forge.mjs`)

---

## CRITICAL RULES

1. **Never ask the user to organize files.** That's your job.
2. **Read everything before asking questions.** The answer might be in a file they already gave you.
3. **Flag contradictions.** If the PRD says "email login" but a screenshot shows Google OAuth, ask which is correct.
4. **Note assumptions.** If you had to guess, document it in the annotation warnings field.
5. **Extract data from images.** If they upload a photo of a spreadsheet, extract the actual data.
6. **Fetch URLs.** If they paste a URL, fetch it and classify the content.
7. **Handle duplicates.** If the same info appears in multiple files, use the most recent/complete version and note it.
8. **Annotations are for Claude Code, not the user.** Write them in technical terms that help the build system.


---

## MULTI-SPEC PATTERN (Large Projects)

For projects with 20+ entities or 50+ features, split the spec across multiple files to manage Claude Code's context window:

| File | Contents | Read by Stages |
|------|----------|---------------|
| `PROJECT-SPEC.md` | Gate 0 (identity) + Gate 1 (full schema) | 1, 2, 3 |
| `SPEC-WORKFLOWS.md` | Gate 2 (all state machines, every transition) | 3, 4, 5 |
| `SPEC-PERMISSIONS.md` | Gate 3 (role × entity × action matrix) | 1, 2, 3 |
| `SPEC-INTEGRATIONS.md` | Gate 5 (external APIs, OAuth, webhooks) | 4, 6, 7 |
| `SPEC-AUTOMATION.md` | Gate 4 (automation rules + AI features) | 5, 6, 7 |
| Additional `SPEC-*.md` | Complex modules (onboarding, admin, billing) | As needed |

**Rules:**
- PROJECT-SPEC.md always contains Gate 0 + Gate 1 (the foundation)
- Each file should be under 800 lines
- BUILD-STAGES.md tells Claude Code which files to read per stage
- Never split an entity's definition across multiple files
- Each file must be self-contained for its domain
