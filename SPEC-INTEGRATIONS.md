# SPEC-INTEGRATIONS.md — EaseMail v2

---

## GATE 5 — EXTERNAL INTEGRATIONS

### INT-1: PROVIDER ADAPTER PATTERN

All email/calendar operations go through a unified interface. The app code NEVER calls Graph or Gmail directly — always through the adapter.

```typescript
// lib/providers/types.ts
interface EmailProvider {
  getAuthUrl(redirectUri: string, state: string): Promise<string>;
  exchangeCode(code: string, redirectUri: string, codeVerifier: string): Promise<TokenSet>;
  refreshToken(refreshToken: string): Promise<TokenSet>;
  listMessages(token: string, options: ListOptions): Promise<{ messages: Message[], cursor?: string }>;
  getMessage(token: string, messageId: string): Promise<Message>;
  sendMessage(token: string, message: SendMessageParams): Promise<{ id: string }>;
  replyToMessage(token: string, messageId: string, reply: ReplyParams): Promise<{ id: string }>;
  forwardMessage(token: string, messageId: string, forward: ForwardParams): Promise<{ id: string }>;
  moveMessage(token: string, messageId: string, folderId: string): Promise<void>;
  deleteMessage(token: string, messageId: string): Promise<void>;
  updateMessage(token: string, messageId: string, updates: MessageUpdates): Promise<void>;
  listFolders(token: string): Promise<Folder[]>;
  createFolder(token: string, name: string): Promise<Folder>;
  createDraft(token: string, draft: DraftParams): Promise<{ id: string }>;
  updateDraft(token: string, draftId: string, draft: DraftParams): Promise<void>;
  deleteDraft(token: string, draftId: string): Promise<void>;
  getAttachment(token: string, messageId: string, attachmentId: string): Promise<AttachmentData>;
  deltaSync(token: string, cursor?: string): Promise<{ changes: SyncChange[], newCursor: string }>;
  listCalendars(token: string): Promise<Calendar[]>;
  listEvents(token: string, calendarId: string, options: EventListOptions): Promise<{ events: CalendarEvent[], cursor?: string }>;
  createEvent(token: string, calendarId: string, event: CreateEventParams): Promise<CalendarEvent>;
  updateEvent(token: string, calendarId: string, eventId: string, event: UpdateEventParams): Promise<CalendarEvent>;
  deleteEvent(token: string, calendarId: string, eventId: string): Promise<void>;
  deltaSyncEvents(token: string, calendarId: string, cursor?: string): Promise<{ changes: SyncChange[], newCursor: string }>;
  listContacts(token: string, options: { limit: number }): Promise<Contact[]>;
  getUpcomingMeetings?(token: string, daysAhead: number): Promise<TeamsMeeting[]>;
  createTeamsMeeting?(token: string, details: MeetingDetails): Promise<TeamsMeeting>;
}

export function getProvider(type: 'GOOGLE' | 'MICROSOFT'): EmailProvider {
  switch (type) {
    case 'MICROSOFT': return new MicrosoftProvider();
    case 'GOOGLE': return new GoogleProvider();
  }
}
```

### INT-2: MICROSOFT GRAPH API

**OAuth2:**
- Auth: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize`
- Token: `https://login.microsoftonline.com/common/oauth2/v2.0/token`
- Tenant: `common` (multi-tenant)
- Flow: Authorization Code with PKCE
- Scopes: `openid profile email offline_access Mail.ReadWrite Mail.Send MailboxSettings.ReadWrite Calendars.ReadWrite Contacts.Read OnlineMeetings.ReadWrite User.Read`

**Key endpoints:**
- Messages LIST: `GET /me/messages?$select=subject,from,toRecipients,...&$top=50&$orderby=receivedDateTime desc`
- Messages SEND: `POST /me/sendMail { message: {...}, saveToSentItems: true }`
- Messages REPLY: `POST /me/messages/{id}/reply`
- Messages MOVE: `POST /me/messages/{id}/move { destinationId: "{folderId}" }`
- Messages DELTA: `GET /me/messages/delta` (incremental sync with deltatoken)
- Folders LIST: `GET /me/mailFolders?$top=100`
- Calendar LIST: `GET /me/calendars`
- Events: `GET /me/calendarView?startDateTime={}&endDateTime={}`
- Event CREATE: `POST /me/calendar/events` (set isOnlineMeeting=true for Teams)
- Contacts: `GET /me/contacts?$top=100`
- Teams meetings: `GET /me/onlineMeetings`

**Delta sync pattern:**
1. First call: `GET /me/messages/delta?$select=...` → returns all messages + deltaLink
2. Subsequent: `GET {deltaLink}` → returns only changes since last call
3. Changes have `@removed` property if deleted, otherwise created/updated
4. Save deltaLink as sync cursor

**Token refresh:**
```
POST /common/oauth2/v2.0/token
Content-Type: application/x-www-form-urlencoded
client_id={}&client_secret={}&refresh_token={}&grant_type=refresh_token&scope=offline_access Mail.ReadWrite ...
```
Returns new access_token + optional new refresh_token. ALWAYS save new refresh_token if returned.

**CRITICAL v1 fix:** V1 used `(response as any).refreshToken` which was undefined because MSAL doesn't expose it directly. V2 must use direct HTTP calls to the token endpoint (not MSAL library) for full control over token handling.

### INT-3: GMAIL API

**OAuth2:**
- Auth: `https://accounts.google.com/o/oauth2/v2/auth`
- Token: `https://oauth2.googleapis.com/token`
- Flow: Authorization Code with PKCE
- Scopes: `openid profile email https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/contacts.readonly`

**Key endpoints:**
- Messages LIST: `GET /gmail/v1/users/me/messages?maxResults=50&q=in:inbox`
- Messages GET: `GET /gmail/v1/users/me/messages/{id}?format=full`
- Messages SEND: `POST /gmail/v1/users/me/messages/send` (base64url RFC 2822)
- Messages MODIFY: `POST /gmail/v1/users/me/messages/{id}/modify { addLabelIds, removeLabelIds }`
- Messages TRASH: `POST /gmail/v1/users/me/messages/{id}/trash`
- Labels LIST: `GET /gmail/v1/users/me/labels` (Gmail uses labels not folders)
- Drafts: `POST /gmail/v1/users/me/drafts`
- History: `GET /gmail/v1/users/me/history?startHistoryId={}&historyTypes=messageAdded,messageDeleted,labelAdded,labelRemoved`

**Gmail label → folder_type mapping:**
- INBOX → inbox
- SENT → sent
- DRAFT → drafts
- TRASH → trash
- SPAM → spam
- STARRED → starred
- IMPORTANT → important
- Custom labels → custom

**Delta sync pattern (History API):**
1. First call: `GET /users/me/messages?maxResults=500` → save latest historyId
2. Subsequent: `GET /users/me/history?startHistoryId={saved}` → returns changes
3. For each change type (messageAdded, messageDeleted, labelAdded, labelRemoved) → process

**Token refresh:**
```
POST https://oauth2.googleapis.com/token
Content-Type: application/x-www-form-urlencoded
client_id={}&client_secret={}&refresh_token={}&grant_type=refresh_token
```

### INT-4: MESSAGE NORMALIZATION

Both providers return different formats. Normalize to internal Message type:

```typescript
interface NormalizedMessage {
  provider_message_id: string;
  provider_thread_id: string | null;
  subject: string | null;
  from_email: string;
  from_name: string | null;
  to_recipients: { email: string; name?: string }[];
  cc_recipients: { email: string; name?: string }[];
  bcc_recipients: { email: string; name?: string }[];
  reply_to: { email: string; name?: string }[];
  body_html: string | null;
  body_text: string | null;
  snippet: string | null;
  folder_type: FolderType;
  is_unread: boolean;
  is_starred: boolean;
  is_draft: boolean;
  has_attachments: boolean;
  attachments: { id: string; name: string; size: number; type: string; content_id?: string }[];
  importance: 'low' | 'normal' | 'high';
  message_date: string; // ISO 8601
}
```

**Graph → Normalized:**
- from_email: `message.from.emailAddress.address`
- is_unread: `!message.isRead`
- is_starred: `message.flag.flagStatus === 'flagged'`
- body_html: `message.body.content` (when contentType='html')
- snippet: `message.bodyPreview`
- folder_type: map from `parentFolderId` via folder_mappings

**Gmail → Normalized:**
- from_email: parse `From` header
- is_unread: `labelIds.includes('UNREAD')`
- is_starred: `labelIds.includes('STARRED')`
- body_html: find `text/html` part in payload, base64 decode
- snippet: `message.snippet`
- folder_type: map from `labelIds` via label mapping

### INT-5: STRIPE INTEGRATION

**Webhook events to handle:**
```typescript
// app/api/webhooks/stripe/route.ts
switch (event.type) {
  case 'customer.subscription.created':
  case 'customer.subscription.updated':
    // Upsert subscriptions table
    // Update organization plan + status
    break;
  case 'customer.subscription.deleted':
    // Set status='canceled', downgrade to FREE
    break;
  case 'invoice.paid':
    // Create invoices row, status='paid'
    break;
  case 'invoice.payment_failed':
    // Update subscription status='past_due'
    // Send notification to org owner
    break;
  case 'customer.subscription.trial_will_end':
    // 3 days before trial end — send reminder email
    break;
  case 'checkout.session.completed':
    // Link Stripe customer to org/user
    break;
}
```

**Checkout flow:**
```typescript
// Create Stripe Checkout Session
const session = await stripe.checkout.sessions.create({
  customer: stripeCustomerId, // or customer_email if new
  mode: 'subscription',
  line_items: [{
    price: stripePriceId,
    quantity: seats, // for org billing
  }],
  subscription_data: {
    trial_period_days: 14,
    metadata: {
      organization_id: orgId, // or user_id for individual
    },
  },
  success_url: `${APP_URL}/app/settings/billing?success=true`,
  cancel_url: `${APP_URL}/app/settings/billing?canceled=true`,
});
```

**Seat management:**
```typescript
// When org adds/removes members:
await stripe.subscriptions.update(subscriptionId, {
  items: [{
    id: subscriptionItemId,
    quantity: newSeatCount,
  }],
  proration_behavior: 'always_invoice', // charge difference immediately
});
```

### INT-6: OPENAI INTEGRATION

**Models used:**
- GPT-4o: email remix, dictate polish, event extraction, categorization
- Whisper-1: voice transcription

**Rate limiting:** 10 AI requests per user per minute (tracked in usage_tracking).

**Implementation pattern:**
```typescript
// lib/openai/client.ts
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function remixEmail(content: string, tone: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.7,
    max_tokens: 2000,
    messages: [
      { role: 'system', content: `Rewrite this email in a ${tone} tone. Preserve intent and key info. Return only the email body.` },
      { role: 'user', content },
    ],
  });
  return response.choices[0].message.content || content;
}

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  const file = new File([audioBuffer], 'recording.webm', { type: 'audio/webm' });
  const response = await openai.audio.transcriptions.create({
    model: 'whisper-1',
    file,
  });
  return response.text;
}

export async function extractEvent(emailBody: string, subject: string, from: string): Promise<ExtractedEvent | null> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'Extract calendar event details from this email. Return JSON: {title, date, start_time, end_time, location, attendees: [{email, name}], description}. Use null for unknown fields. If no event is detectable, return {detected: false}.' },
      { role: 'user', content: `Subject: ${subject}\nFrom: ${from}\n\n${emailBody}` },
    ],
  });
  return JSON.parse(response.choices[0].message.content || '{"detected":false}');
}

export async function categorizeEmails(messages: {id: string, from: string, subject: string, snippet: string}[]): Promise<{id: string, category: string}[]> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'Categorize each email: "people" (real humans), "newsletter", "notification" (automated), "promotion" (ads/sales), "social". Return JSON: {results: [{id, category}]}.' },
      { role: 'user', content: JSON.stringify(messages) },
    ],
  });
  return JSON.parse(response.choices[0].message.content || '{"results":[]}').results;
}
```

### INT-7: RESEND (Transactional Email)

**Used for:** Welcome emails, invite emails, password reset, billing notifications, org events.

**Templates (React Email components):**
```
lib/email-templates/
  welcome.tsx              — New user signup
  org-invite.tsx           — Organization invitation
  org-member-welcome.tsx   — Accepted invite
  org-member-removal.tsx   — Removed from org
  org-role-change.tsx      — Role updated
  org-ownership-transfer.tsx — Ownership transferred
  password-reset.tsx       — Password reset link
  billing-reminder.tsx     — Trial ending, payment failed
  scheduled-email-failed.tsx — Scheduled email couldn't send
```

**Send pattern:**
```typescript
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: process.env.RESEND_FROM_EMAIL,
  to: recipientEmail,
  subject: 'Welcome to EaseMail',
  react: WelcomeEmail({ name: userName }),
});
```

### INT-8: TWILIO (SMS)

**Used for:** Optional SMS feature for business users.

**Send pattern:**
```typescript
import twilio from 'twilio';
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const message = await client.messages.create({
  body: messageBody,
  from: process.env.TWILIO_PHONE_NUMBER,
  to: recipientNumber,
});
// Save to sms_messages table
```

**Receiving (webhook):**
```
POST /api/webhooks/twilio
Verify Twilio signature header
Parse incoming message
Save to sms_messages with direction='inbound'
Create notification for user
```

### INT-9: CRON JOBS

All crons authenticated via `CRON_SECRET` header check. Deployed as Vercel Cron.

```json
// vercel.json
{
  "crons": [
    { "path": "/api/cron/sync-emails", "schedule": "*/5 * * * *" },
    { "path": "/api/cron/sync-calendar", "schedule": "*/5 * * * *" },
    { "path": "/api/cron/send-scheduled", "schedule": "* * * * *" },
    { "path": "/api/cron/process-snoozes", "schedule": "* * * * *" },
    { "path": "/api/cron/cleanup-rate-limits", "schedule": "*/5 * * * *" },
    { "path": "/api/cron/refresh-tokens", "schedule": "*/3 * * * *" },
    { "path": "/api/cron/cleanup-expired-invites", "schedule": "0 * * * *" }
  ]
}
```

**Cron auth pattern:**
```typescript
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... cron logic
}
```
