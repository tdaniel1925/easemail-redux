# API-KEY-BLUEPRINT.md — EaseMail v2

> Step-by-step instructions for every API key your app needs.
> Follow in order. Total time: ~30 minutes.

---

## BEFORE YOU START

You'll need these accounts. If you already have them, skip to the key sections.

| Service | Free Tier | Paid Starts At | Account URL |
|---|---|---|---|
| Supabase | 2 projects, 500MB DB, 50K auth users | $25/mo (Pro) | supabase.com |
| Microsoft Azure/Entra | Free app registrations | Free (pay per user if >50K) | portal.azure.com |
| Google Cloud | Free OAuth, 15K Gmail API calls/day | Free for this use case | console.cloud.google.com |
| Stripe | Free until you process payments | 2.9% + $0.30 per charge | dashboard.stripe.com |
| OpenAI | $5 free credit (new accounts) | Pay-as-you-go (~$0.01/request) | platform.openai.com |
| Resend | 100 emails/day free | $20/mo (5K/day) | resend.com |
| Twilio | $15 free trial credit | ~$0.0079/SMS | console.twilio.com |
| Vercel | Free hobby plan | $20/mo (Pro) | vercel.com |
| GitHub | Free private repos | Free for this use case | github.com |

---

## 🔴 DO FIRST — Supabase Access Token

**Time:** 1 minute
**Why:** The build script creates your entire database automatically. You just need this one token.

1. Go to **https://supabase.com/dashboard/account/tokens**
2. Click **"Generate new token"**
3. Name it: `forge`
4. Click **Generate**
5. **Copy the token immediately** — it starts with `sbp_` and you can't see it again

**Env var:**
```
SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxxxxxxxxxx
```

**That's it.** The build script handles everything else — creates the project, database, tables, auth config, and pulls all the Supabase keys automatically.

---

## 🔴 DO SECOND — Microsoft Azure (Email via Graph API)

**Time:** 10 minutes
**Why:** This lets users connect their Outlook/Microsoft 365 email accounts.

### Step 1: Register an App

1. Go to **https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade**
2. Click **"+ New registration"**
3. Fill in:
   - **Name:** `EaseMail`
   - **Supported account types:** Select **"Accounts in any organizational directory and personal Microsoft accounts"** (the 3rd option)
   - **Redirect URI:** Select **"Web"** → enter `http://localhost:3000/api/auth/oauth/callback`
4. Click **Register**
5. On the Overview page, copy the **Application (client) ID**

### Step 2: Create a Client Secret

1. In the left sidebar, click **"Certificates & secrets"**
2. Click **"+ New client secret"**
3. Description: `forge-secret`, Expires: **24 months**
4. Click **Add**
5. **Copy the Value immediately** (not the Secret ID) — you can't see it again

### Step 3: Add API Permissions

1. In the left sidebar, click **"API permissions"**
2. Click **"+ Add a permission"** → **"Microsoft Graph"** → **"Delegated permissions"**
3. Search and check each of these:
   - `Mail.ReadWrite`
   - `Mail.Send`
   - `MailboxSettings.ReadWrite`
   - `Calendars.ReadWrite`
   - `Contacts.Read`
   - `OnlineMeetings.ReadWrite`
   - `User.Read`
   - `offline_access`
   - `openid`
   - `profile`
   - `email`
4. Click **"Add permissions"**
5. If you see a "Grant admin consent" button and you're an admin, click it (optional for personal accounts)

### Step 4: Add Production Redirect URI (after deploy)

1. Go back to **"Authentication"** in the sidebar
2. Under **Web → Redirect URIs**, click **"Add URI"**
3. Add: `https://your-app.vercel.app/api/auth/oauth/callback`
4. Click **Save**

**Env vars:**
```
AZURE_AD_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_AD_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AZURE_AD_TENANT_ID=common
```

**Gotchas:**
- Tenant ID is always `common` for multi-tenant apps (personal + work accounts)
- The client secret expires — set a calendar reminder to rotate it
- If users get "AADSTS65001" error, they need to consent to permissions on first login

---

## 🔴 DO THIRD — Google Cloud (Gmail + Calendar API)

**Time:** 10 minutes
**Why:** This lets users connect their Gmail accounts.

### Step 1: Create a Project

1. Go to **https://console.cloud.google.com/projectcreate**
2. Project name: `EaseMail`
3. Click **Create**
4. Wait for it to create, then make sure it's selected in the top dropdown

### Step 2: Enable APIs

1. Go to **https://console.cloud.google.com/apis/library**
2. Search for and **Enable** each of these:
   - **Gmail API** — click Enable
   - **Google Calendar API** — click Enable
   - **People API** — click Enable

### Step 3: Configure OAuth Consent Screen

1. Go to **https://console.cloud.google.com/apis/credentials/consent**
2. Select **External** → click **Create**
3. Fill in:
   - App name: `EaseMail`
   - User support email: your email
   - Developer contact email: your email
4. Click **Save and Continue**
5. On **Scopes** page, click **"Add or Remove Scopes"** and add:
   - `openid`
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/contacts.readonly`
6. Click **Update** → **Save and Continue**
7. On **Test users**, add your own email → **Save and Continue**

### Step 4: Create OAuth Credentials

1. Go to **https://console.cloud.google.com/apis/credentials**
2. Click **"+ Create Credentials"** → **"OAuth client ID"**
3. Application type: **Web application**
4. Name: `EaseMail Web`
5. **Authorized redirect URIs:** Add:
   - `http://localhost:3000/api/auth/oauth/callback`
6. Click **Create**
7. Copy the **Client ID** and **Client Secret**

### Step 5: Add Production Redirect URI (after deploy)

1. Go back to the OAuth client you just created
2. Add another redirect URI: `https://your-app.vercel.app/api/auth/oauth/callback`
3. Click **Save**

**Env vars:**
```
GOOGLE_CLIENT_ID=xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxx
```

**Gotchas:**
- While in "Testing" mode, only test users you added can use Google OAuth
- To go live: submit for Google verification (takes 2-6 weeks)
- For development, "Testing" mode works fine with your own accounts
- Gmail API has a daily quota of 15,000 units — each message read = 5 units

---

## 🟡 DO WHILE BUILD RUNS — Stripe

**Time:** 5 minutes
**Why:** Handles all billing — subscriptions, payments, invoices.

### Step 1: Get API Keys

1. Go to **https://dashboard.stripe.com/apikeys**
2. Copy the **Secret key** (starts with `sk_test_`)
3. You'll switch to live keys (`sk_live_`) before going to production

### Step 2: Create Products and Prices

1. Go to **https://dashboard.stripe.com/products**
2. Click **"+ Add product"**
3. Create **4 products:**

| Product | Price (Monthly) | Price (Annual) |
|---|---|---|
| EaseMail Pro | $X/month (recurring) | $X/year (recurring) |
| EaseMail Business | $X/month (recurring) | $X/year (recurring) |

4. For each product, after creating it, go to the product page
5. Copy each **Price ID** (starts with `price_`)

### Step 3: Set Up Webhooks

1. Go to **https://dashboard.stripe.com/webhooks**
2. Click **"+ Add endpoint"**
3. Endpoint URL: `https://your-app.vercel.app/api/webhooks/stripe`
   (Use `http://localhost:3000/api/webhooks/stripe` for local dev)
4. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.trial_will_end`
   - `checkout.session.completed`
5. Click **"Add endpoint"**
6. On the endpoint page, click **"Reveal"** under Signing secret
7. Copy the webhook signing secret (starts with `whsec_`)

**Env vars:**
```
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PRO_PRICE_ID=price_xxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PRO_ANNUAL_PRICE_ID=price_xxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_BUSINESS_PRICE_ID=price_xxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_BUSINESS_ANNUAL_PRICE_ID=price_xxxxxxxxxxxxxxxxxxxxxxxxx
```

**Gotchas:**
- Use `sk_test_` keys for development, switch to `sk_live_` for production
- Webhook secret is different for test vs live — you need separate endpoints
- To test webhooks locally, use Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

---

## 🟡 DO WHILE BUILD RUNS — OpenAI

**Time:** 2 minutes
**Why:** Powers AI Remix, AI Dictate, calendar extraction, and email categorization.

1. Go to **https://platform.openai.com/api-keys**
2. Click **"+ Create new secret key"**
3. Name: `easemail`
4. Copy the key (starts with `sk-`)

**Env var:**
```
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Gotchas:**
- New accounts get $5 free credit
- GPT-4o costs ~$5/million input tokens — very affordable for email rewrites
- Whisper transcription costs ~$0.006/minute of audio
- Set a usage limit at https://platform.openai.com/account/limits to avoid surprises

---

## 🟡 DO WHILE BUILD RUNS — Resend

**Time:** 3 minutes
**Why:** Sends transactional emails (welcome, invites, password reset, billing alerts).

### Step 1: Get API Key

1. Go to **https://resend.com/api-keys**
2. Click **"+ Create API Key"**
3. Name: `easemail`, Permission: **Full access**
4. Copy the key (starts with `re_`)

### Step 2: Add Sending Domain

1. Go to **https://resend.com/domains**
2. Click **"+ Add Domain"**
3. Enter your domain (e.g., `easemail.app` or `yourdomain.com`)
4. Add the DNS records shown (MX, TXT for SPF, DKIM)
5. Click **Verify**
6. DNS propagation takes 5-60 minutes

**Env vars:**
```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

**Gotchas:**
- Free tier: 100 emails/day, 1 domain
- Without a verified domain, you can only send to your own email
- For development, use `onboarding@resend.dev` as the from address (Resend's sandbox)

---

## 🟢 DO BEFORE LAUNCH — Twilio (Optional)

**Time:** 5 minutes
**Why:** SMS messaging feature for business plans. Skip if not needed at launch.

1. Go to **https://console.twilio.com**
2. Sign up → verify your phone number
3. From the Console dashboard, copy:
   - **Account SID** (starts with `AC`)
   - **Auth Token**
4. Go to **Phone Numbers → Manage → Buy a Number**
5. Buy a number with SMS capability (~$1.15/month)
6. Copy the phone number

**Env vars:**
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
```

**Gotchas:**
- Trial accounts can only send to verified numbers (your own phone)
- Upgrade to paid (~$20 minimum) to send to anyone
- SMS costs ~$0.0079/message in the US

---

## 🟢 DO BEFORE LAUNCH — Cron Secret

**Time:** 10 seconds
**Why:** Authenticates scheduled jobs (email sync, scheduled sends, snooze checks).

Generate a random secret:
```bash
openssl rand -hex 32
```

**Env var:**
```
CRON_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 🟢 DO BEFORE LAUNCH — Encryption Key

**Time:** 10 seconds
**Why:** Encrypts OAuth tokens (access + refresh) stored in the database.

Generate a strong encryption key:
```bash
openssl rand -hex 32
```

**Env var:**
```
ENCRYPTION_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## COMPLETE ENV VAR CHECKLIST

Copy this to `.env.local` and fill in the values:

```bash
# ── App ──
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ── Supabase (auto-filled by forge.mjs) ──
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# ── Microsoft Azure ──
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
AZURE_AD_TENANT_ID=common

# ── Google ──
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# ── Stripe ──
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_PRICE_ID=
STRIPE_PRO_ANNUAL_PRICE_ID=
STRIPE_BUSINESS_PRICE_ID=
STRIPE_BUSINESS_ANNUAL_PRICE_ID=

# ── OpenAI ──
OPENAI_API_KEY=

# ── Resend ──
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@yourdomain.com

# ── Twilio (optional) ──
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# ── Security ──
CRON_SECRET=
ENCRYPTION_KEY=
```

---

## AFTER DEPLOY CHECKLIST

Once the app is live on Vercel:

- [ ] Add production redirect URI to **Azure**: `https://your-app.vercel.app/api/auth/oauth/callback`
- [ ] Add production redirect URI to **Google**: `https://your-app.vercel.app/api/auth/oauth/callback`
- [ ] Add production webhook URL to **Stripe**: `https://your-app.vercel.app/api/webhooks/stripe`
- [ ] Switch Stripe keys from `sk_test_` to `sk_live_` when ready for real payments
- [ ] Verify Resend domain DNS has propagated
- [ ] Submit Google OAuth app for verification (if serving users beyond test accounts)
- [ ] Update `NEXT_PUBLIC_APP_URL` in Vercel env vars to your production URL
- [ ] Set OpenAI usage limits at platform.openai.com/account/limits

---

## COST ESTIMATE (Monthly)

| Service | Development | Production (100 users) | Production (1,000 users) |
|---|---|---|---|
| Supabase | Free | Free | $25 (Pro) |
| Azure | Free | Free | Free |
| Google Cloud | Free | Free | Free |
| Stripe | Free | 2.9% + $0.30/txn | 2.9% + $0.30/txn |
| OpenAI | ~$0 | ~$5 | ~$30 |
| Resend | Free | Free | $20 |
| Twilio | Free trial | ~$5 | ~$20 |
| Vercel | Free | Free | $20 (Pro) |
| **Total** | **$0** | **~$10 + Stripe fees** | **~$115 + Stripe fees** |
