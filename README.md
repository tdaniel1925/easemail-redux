# EaseMail v2 🚀

**AI-powered email for modern teams**

EaseMail is a next-generation email client built with cutting-edge AI features, seamless calendar integration, and powerful automation. Built for individuals and teams who want more from their email experience.

---

## ✨ Features

### Core Email
- **Multi-account support** — Connect unlimited Microsoft and Google accounts
- **Smart Inbox** — AI-categorized sections (Priority, People, Newsletters, Notifications, Promotions)
- **Real-time sync** — Delta sync with Microsoft Graph and Gmail APIs
- **Rich composer** — TipTap editor with signatures, templates, and auto-save
- **Scheduled sends** — Send emails at the perfect time
- **Email snooze** — Return emails to your inbox when you're ready
- **Advanced search** — Full-text search with filters and weighted ranking

### AI-Powered Features
- **AI Remix** — Rewrite emails in different tones (Professional, Friendly, Brief, Detailed)
- **AI Dictate** — Voice-to-email with Whisper transcription and GPT-4o polishing
- **AI Event Extraction** — Extract calendar events from emails automatically
- **Smart categorization** — Automatic email categorization powered by GPT-4o
- **Gatekeeper** — Screen unknown senders before they hit your inbox

### Automation
- **Email rules** — Powerful rules engine with 8 condition types and 11 actions
- **Keyboard shortcuts** — Gmail-style shortcuts + command palette (Cmd+K)
- **Auto-contacts** — Automatically create contacts from sent emails
- **Smart notifications** — In-app and browser push notifications

### Team Features
- **Organizations** — Multi-seat billing with role-based permissions
- **Member management** — Invite teammates, manage roles, transfer ownership
- **Shared billing** — Seat-based pricing with Stripe integration
- **Admin panel** — Super admin dashboard with analytics and user management

### Calendar & Integrations
- **Calendar sync** — Bi-directional sync with Microsoft and Google calendars
- **Event detection** — AI detects dates/times in emails
- **Conflict detection** — Warns about overlapping meetings
- **SMS support** — Send and receive SMS via Twilio (Business plan)
- **Webhooks** — Real-time event notifications for integrations
- **API access** — RESTful API for custom integrations (Business+ plans)

---

## 🛠 Tech Stack

- **Framework:** Next.js 14 (App Router, Server Components, Server Actions)
- **Database:** Supabase (Postgres + Auth + Realtime + Storage)
- **UI:** shadcn/ui + Radix + Tailwind CSS + Framer Motion
- **AI:** OpenAI GPT-4o + Whisper
- **Auth:** Supabase Auth (email/password + magic link + OAuth)
- **Billing:** Stripe (subscriptions + invoices)
- **Email APIs:** Microsoft Graph + Gmail API
- **Email Delivery:** Resend + React Email
- **SMS:** Twilio
- **Error Tracking:** Sentry
- **Hosting:** Vercel

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works)
- OpenAI API key
- Stripe account (for billing features)
- Microsoft Azure app registration (for Outlook/Exchange)
- Google Cloud project (for Gmail)

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/easemail-v2.git
cd easemail-v2
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Copy `.env.example` to `.env.local` and fill in all required values:

```bash
cp .env.example .env.local
```

**Required environment variables:**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Encryption (generate with: openssl rand -base64 32)
ENCRYPTION_KEY=your_32_character_encryption_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Microsoft Azure
AZURE_CLIENT_ID=your_azure_client_id
AZURE_CLIENT_SECRET=your_azure_client_secret
AZURE_TENANT_ID=common

# Google
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
STRIPE_PRO_PRICE_ID=your_stripe_pro_price_id
STRIPE_BUSINESS_PRICE_ID=your_stripe_business_price_id

# Resend (transactional email)
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=hello@yourdomain.com

# Twilio (SMS)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Cron Secret (generate with: openssl rand -hex 32)
CRON_SECRET=your_cron_secret

# Sentry (optional)
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
```

### 4. Set Up Supabase

Run migrations to create all database tables:

```bash
npx supabase db push
```

Or if using Supabase CLI:

```bash
supabase db push
```

### 5. Seed the Database (Optional)

Create test data:

```bash
npx tsx scripts/seed.ts
```

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 7. Create Your First Account

1. Navigate to `/auth/signup`
2. Create an account with email + password
3. Complete the onboarding flow
4. Connect your first email account (Microsoft or Google)

---

## 📁 Project Structure

```
easemail-v2/
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── (auth)/            # Auth pages (signin, signup)
│   │   ├── (app)/             # Main app (inbox, calendar, settings)
│   │   ├── api/               # API routes
│   │   └── layout.tsx         # Root layout
│   ├── components/            # React components
│   │   ├── ui/               # shadcn/ui components
│   │   ├── email/            # Email-specific components
│   │   ├── ai/               # AI feature components
│   │   └── ...
│   ├── lib/                   # Business logic
│   │   ├── actions/          # Server actions (CRUD)
│   │   ├── ai/               # AI service client
│   │   ├── auth/             # Auth helpers
│   │   ├── automation/       # Rules engine, limits
│   │   ├── events/           # Event system
│   │   ├── providers/        # Microsoft/Google adapters
│   │   ├── supabase/         # Supabase client helpers
│   │   ├── sync/             # Email sync logic
│   │   └── ...
│   └── types/                 # TypeScript types
├── supabase/
│   └── migrations/            # Database migrations
├── scripts/                   # Utility scripts
├── .github/
│   └── workflows/             # CI/CD
├── public/                    # Static assets
└── ...
```

---

## 🏗 Architecture

EaseMail follows a **layered architecture** to ensure clean separation of concerns:

### Layer 0: Schema & Types
- Database schema (Supabase migrations)
- TypeScript types for all entities
- 40 entities, 83+ indexes, comprehensive RLS policies

### Layer 1: Auth & System Spine
- Supabase Auth (email/password + magic link)
- Role-based access control (4 roles: SUPER_ADMIN, ORG_OWNER, ORG_MEMBER, INDIVIDUAL)
- Middleware for route protection
- Audit logging system

### Layer 2: CRUD
- Server actions for all entities
- Zod validation schemas
- Permission checks on every mutation
- Soft delete for business data

### Layer 3: Workflows
- OAuth2 PKCE flow for Microsoft and Google
- Email sync (initial + delta)
- Token management and proactive refresh
- Email compose and send
- Scheduled sends and snooze

### Layer 4: Event System
- Append-only events table
- 104 event types
- Event emissions on all state changes
- Activity feed

### Layer 5: Automation
- Email rules engine (8 conditions, 11 actions)
- Usage limits (plan-based)
- Smart inbox sections
- Keyboard shortcuts and command palette
- Notifications

### Layer 6: AI
- AI Remix (GPT-4o)
- AI Dictate (Whisper + GPT-4o)
- AI Event Extraction (GPT-4o)
- AI Categorization (GPT-4o)
- All AI output flows through CRUD (no direct DB writes)

---

## 🧪 Testing

Run linter:
```bash
npm run lint
```

Run type check:
```bash
npx tsc --noEmit
```

Run unit tests (if configured):
```bash
npm test
```

Run E2E tests with Playwright (if configured):
```bash
npm run test:e2e
```

---

## 🚢 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project in Vercel dashboard
3. Add all environment variables
4. Deploy!

Vercel will automatically:
- Run `npm run build`
- Set up cron jobs from `vercel.json`
- Enable serverless functions

### Set Up Cron Jobs

EaseMail uses Vercel Cron to run scheduled tasks. Ensure these are configured in `vercel.json`:

- **Email sync:** Every 5 minutes
- **Token refresh:** Every 3 minutes
- **Scheduled emails:** Every minute
- **Snoozed emails:** Every 5 minutes

### Set Up Webhooks

**Stripe Webhook:**
- URL: `https://yourdomain.com/api/webhooks/stripe`
- Events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.trial_will_end`

---

## 🔐 Security

- **RLS enabled** on all Supabase tables
- **OAuth tokens encrypted** at rest with pgcrypto
- **Rate limiting** via Postgres (no Redis required)
- **CSRF protection** via Next.js middleware
- **SQL injection prevention** via parameterized queries
- **XSS prevention** via DOMPurify on rich text
- **Sentry error tracking** for monitoring

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🤝 Contributing

Contributions are welcome! Please open an issue or PR.

---

## 💬 Support

- **Documentation:** [docs.easemail.ai](https://docs.easemail.ai)
- **Issues:** [GitHub Issues](https://github.com/yourusername/easemail-v2/issues)
- **Email:** support@easemail.ai

---

Built with ❤️ using Claude Code
