# SPEC-ONBOARDING.md — EaseMail v2

---

## ONBOARDING FLOW

16-step wizard. Full-bleed gradient background (blue-to-indigo). Each step is a centered card (max-w-4xl, rounded-2xl, shadow-2xl). Progress bar at top. Back arrow on steps 2+. "Skip" link on optional steps.

Route: `/onboarding` — protected, redirects to /app/inbox if `onboarding_completed=true`.

### Data model during onboarding:
All selections saved to `user_preferences` and `users` tables progressively. Each step calls `PATCH /api/onboarding` with the step data. If user closes browser mid-flow, they resume from `users.onboarding_step`.

---

### STEP 1: Welcome & Use Case
**Section header:** "TELL US ABOUT YOURSELF"
**Question:** "What will you use EaseMail for?"
**Options:** Work | Personal | Both (large selection cards with icons, Spark-style)
**Right panel:** Contextual description that changes per selection:
- Work: "Built for professionals. Manage multiple accounts, schedule sends, and let AI handle the busywork."
- Personal: "Your inbox, simplified. Smart filtering and AI tools to stay organized."
- Both: "The best of both worlds. Manage work and personal emails in a unified inbox."

**Saves:** `user_preferences.use_case` (custom JSONB field)
**Updates:** `users.onboarding_step = 1`

### STEP 2: Profile Setup
**Question:** "Tell us about yourself"
**Fields:**
- Full name (pre-filled from signup, editable)
- Nickname (optional, used in greetings: "Good morning, {nickname}")
- Profile picture upload with crop/adjust:
  - Supabase Storage bucket: `avatars`
  - Crop using react-easy-crop or similar
  - Circle crop preview
  - Save as 256x256 webp
  - Store path in `users.avatar_url`
- Timezone picker (auto-detect from browser, dropdown to override)

**Saves:** `users.name`, `users.nickname`, `users.avatar_url`, `users.timezone`
**Updates:** `users.onboarding_step = 2`

### STEP 3: Work Details (conditional)
**Show only if:** Step 1 answer was "Work" or "Both"
**Question:** "Tell us about your work"
**Fields:** 3 dropdowns (Spark-style):
- Industry: Marketing, Sales, Engineering, Legal, Healthcare, Finance, Education, Other
- Role: CEO/Owner, Executive, Manager, Individual Contributor, Freelancer
- Team size: Just me, 2-10, 11-30, 31-100, 100+

**Right panel:** Persona illustration + contextual message based on role selection (like Spark)
**Saves:** `user_preferences.work_details` (JSONB)
**Skip if:** Step 1 was "Personal"

### STEP 4: Pain Points
**Section header:** "TELL US ABOUT YOUR EMAIL"
**Question:** "How do you feel about your inbox?"
**Subtitle:** "Pick every statement that feels true — whatever's overwhelming you, EaseMail can help."
**Options:** Multi-select chips (Spark-style, rounded-full, icon + text):
- "I spend too much time checking mail"
- "I have trouble staying organized"
- "I can't separate important emails from noise"
- "I struggle to write the perfect reply"
- "I have a hard time finding specific emails and attachments"
- "My team doesn't use email effectively"
- "I wish email clients worked the way I do"

**Saves:** `user_preferences.pain_points` (JSONB array)

### STEP 5: Goals
**Question:** "What are your goals?"
**Subtitle:** "Choose up to 3 that matter most today."
**Options:** Multi-select chips (max 3):
- "Maintain a focused, clutter-free inbox"
- "Spend less time on email each day"
- "Write faster and more professionally"
- "Find important information when I need it"
- "Stay on top of tasks and follow-ups"
- "Communicate better with my team"
- "None of these"

**Saves:** `user_preferences.goals` (JSONB array)

### STEP 6: Personalized Value Summary
**Full-width card, no form.**
**Header:** "Achieve your goals with EaseMail"
**Subtitle:** "Based on what you've shared, here's how EaseMail will help you work smarter:"
**Content:** 3 feature cards based on goals selected in Step 5:

Goal → Feature card mapping:
- "focused inbox" → "Enjoy a focused, clutter-free inbox" (Smart Inbox + Gatekeeper)
- "less time" → "Save hours every week" (AI Assistant finds, summarizes, acts)
- "write faster" → "Write faster with AI" (AI Remix + Dictate)
- "find info" → "Find anything instantly" (Smart Search + Attachments)
- "tasks/follow-ups" → "Stay on top of tasks and follow-ups" (Pin + Snooze + Reminders)
- "team" → "Collaborate better with your team" (Shared inboxes + Assignments)

Each card: illustration/icon + title + 2-line description. Glass-morphism card style.

### STEP 7: Transition
**Full gradient screen, centered:**
Large animated checkmark icon (Framer Motion scale + opacity)
"You're almost ready!"
"Now let's customize your inbox."
**CTA:** "Set up Inbox" button
**Auto-advance:** After 2 seconds if no click

### STEP 8: Connect Email Account
**Question:** "Connect your email"
**Two large OAuth buttons:**
- "Connect Microsoft" (Outlook, Exchange, Microsoft 365) — Microsoft icon
- "Connect Google" (Gmail, Google Workspace) — Google icon

**On click:** Trigger WF-2 (OAuth flow). After callback, return to onboarding.
**Show connected accounts** below with checkmark + email address.
**"Add another account"** link to connect additional.
**Minimum:** 1 account required. "Skip" available but shows warning: "You need at least one email account to use EaseMail."

**After first account connected:** Show sync progress bar while initial sync runs in background.

### STEP 9: Inbox Layout
**Header:** "Pick your ideal Inbox layout"
**Two visual preview cards (Spark-style, showing mock inbox):**
- **Full Screen View:** Single column, message list only. "Perfect for focus: Give your inbox your full attention."
- **Split View:** Two columns, list + reading pane. "Perfect for multitasking: Process incoming emails with ease."

**Note at bottom:** "You can always adjust this later — just navigate to Settings > Appearance."
**Saves:** `user_preferences.inbox_layout` ('full' or 'split')

### STEP 10: Sidebar Mode
**Header:** "Select your Sidebar mode"
**Two visual preview cards (Spark-style, one light one dark mock):**
- **Collapsed:** Icon-only sidebar. "Your sidebar stays collapsed so you stay focused."
- **Always Expanded:** Shows labels, folders, accounts. "Keep your sidebar expanded. View your email accounts and folders at a glance."

**Note:** "Adjust anytime by pressing the / key."
**Saves:** `user_preferences.sidebar_mode` ('collapsed' or 'expanded')

### STEP 11: Priority Senders
**Header:** "Prioritize essential senders"
**Subtitle:** "EaseMail puts Priority Senders at the top of your inbox so you never miss important emails."
**Content:** Show mock inbox with priority senders highlighted at top (orange/coral accent).
**AI-powered:** After initial sync, auto-detect frequent real-person senders from inbox data.
Show top 10 suggested priority senders with checkboxes.
User can select/deselect.

**Saves:** Creates `priority_senders` rows for selected senders.

### STEP 12: Sender Grouping
**Header:** "Group frequent senders"
**Two visual preview cards:**
- **Group frequent senders** (Recommended badge): "Bundle emails from selected senders to keep your Inbox tidy."
- **Don't group senders:** "Display emails in the order they were delivered."

**Note:** "Manage senders anytime by clicking the contact's email."
**Saves:** `user_preferences.sender_grouping` (boolean)

### STEP 13: Frequent Sender Selection (conditional)
**Show only if:** Step 12 chose "Group frequent senders"
**Header:** "Select the most frequent senders"
**Content:** Two sections:
- **Top recommendations:** AI-analyzed from inbox, show sender name + email in chips
- **Other recommendations:** Additional frequent senders

User selects which senders to group. Creates `sender_groups` rows.

### STEP 14: Gatekeeper
**Header:** "Review (and block) unwanted senders"
**Subtitle:** "EaseMail's Gatekeeper gives you full control over who's allowed to reach your inbox."
**Two visual preview cards:**
- **Screen before inbox:** "New senders appear at the top — you won't see their emails until you accept them."
- **Screen inside inbox:** "Emails from new senders appear in your inbox — you can accept or block after opening."

**"Turn off Gatekeeper"** link at bottom.
**Saves:** `user_preferences.gatekeeper_mode` ('before', 'inside', 'off')

### STEP 15: Email Signature Setup
**Header:** "Create your email signature"
**Template picker:** 4 templates (Professional, Casual, Creative, Minimal)
Each template shows live preview with user's name/email pre-filled.

**Editor fields:**
- Full name (pre-filled from Step 2)
- Title/Role (optional)
- Company (optional)
- Phone (optional)
- Website (optional)
- Social links: LinkedIn, Twitter/X (optional)
- Logo upload (optional)

**Live preview** updates as user types.
**"Skip for now"** available.

**Saves:** Creates `signatures` row with `is_default=true`

### STEP 16: Trial & Launch
**Split card layout (Spark-style):**
**Left:** Paper airplane illustration + "Enjoy 7 days of EaseMail Pro" + "Start your journey by exploring our most powerful features — all for free."
**CTA:** "Let's go!" button

**Right:** Feature list with icons:
- Smart Inbox: Highlight what's most important and filter the rest
- AI Email: Summarize, compose, proofread, and translate emails
- AI Assistant: Get instant answers and take action across your inbox
- Scheduled Sends: Write now, send later at the perfect time
- Email Rules: Automate your inbox with custom rules
- Priority Senders: Never miss emails from key contacts

**On "Let's go!":**
1. Set `users.onboarding_completed = true`
2. Set `users.onboarding_step = 16`
3. Check for pending org invite (from session/cookie) → auto-accept if exists
4. Redirect to `/app/inbox`
5. Show confetti animation (framer-motion) on first inbox load

---

## ONBOARDING TECHNICAL REQUIREMENTS

### Progressive save API:
```
PATCH /api/onboarding
Body: { step: number, data: { ...step-specific fields } }
Response: { success: true, next_step: number }
```

### Resume logic:
```typescript
// In /onboarding/page.tsx (server component)
const { data: user } = await supabase
  .from('users')
  .select('onboarding_completed, onboarding_step')
  .eq('id', session.user.id)
  .single();

if (user.onboarding_completed) redirect('/app/inbox');
// Client component starts at user.onboarding_step
```

### Step transitions:
- Use Framer Motion `AnimatePresence` with slide transitions (enter from right, exit to left)
- Progress bar: thin line at very top, fills proportionally (step / 16 * 100%)
- Each step animates in with `initial={{ opacity: 0, x: 50 }}` `animate={{ opacity: 1, x: 0 }}`

### Background:
- Full viewport gradient: `bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600`
- Card: `bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl`
- Dark mode: `bg-slate-900/95` card on same gradient

### Accessibility:
- All form controls have labels
- Focus visible on all interactive elements
- Keyboard navigation between options (arrow keys)
- Screen reader announcements on step change
- Reduced motion: disable slide transitions, use opacity only
