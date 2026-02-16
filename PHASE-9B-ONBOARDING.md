# PHASE 9B: USER ONBOARDING — EXECUTION PROMPT

**Use this prompt to execute Stage 9B in Claude Code**

---

## PROMPT FOR CLAUDE CODE

```
I'm executing PHASE 9B: User Onboarding for the EaseMail Redux application.

CONTEXT:
- This is a Next.js 14 email application with Supabase backend
- All features from Phases 1-8 are complete and working
- Users currently land on empty inbox after signup
- Need to guide new users through connecting their first email account

OBJECTIVE:
Create a welcoming first-run experience that helps new users connect their first account and understand key features.

TARGET UX:
- New users see welcome screen immediately after signup
- Clear call-to-action to connect email account
- Optional product tour highlighting key features
- Can skip onboarding but tour preference is saved

---

SECTION A: WELCOME SCREEN (Tasks 235-240)

Create src/components/onboarding/welcome-screen.tsx:

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mail, Sparkles, Zap, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function WelcomeScreen() {
  const router = useRouter();

  const features = [
    {
      icon: <Mail className="h-8 w-8 text-primary" />,
      title: 'Smart Inbox',
      description: 'Automatically organized by priority, people, newsletters, and more',
    },
    {
      icon: <Sparkles className="h-8 w-8 text-primary" />,
      title: 'AI-Powered Features',
      description: 'Smart compose, email remix, voice dictation, and more',
    },
    {
      icon: <Zap className="h-8 w-8 text-primary" />,
      title: 'Real-Time Sync',
      description: 'Instant updates across all devices with live notifications',
    },
    {
      icon: <Shield className="h-8 w-8 text-primary" />,
      title: 'Privacy First',
      description: 'End-to-end encryption, no tracking, your data stays yours',
    },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="max-w-4xl p-8 md:p-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Welcome to EaseMail</h1>
          <p className="text-lg text-muted-foreground mb-8">
            The smartest way to manage your email
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-4 text-left">
                <div className="flex-shrink-0">{feature.icon}</div>
                <div>
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => router.push('/app/settings/accounts')}>
              Connect Your Email
            </Button>
            <Button size="lg" variant="outline" onClick={() => router.push('/app/inbox')}>
              Explore Without Account
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
```

Modify src/app/(app)/app/inbox/page.tsx to show welcome screen:

```typescript
import { WelcomeScreen } from '@/components/onboarding/welcome-screen';

// In the page component:
const { data: accounts } = await supabase
  .from('email_accounts')
  .select('id')
  .eq('user_id', user.id);

if (!accounts || accounts.length === 0) {
  return <WelcomeScreen />;
}

// ... rest of inbox logic
```

---

SECTION B: ACCOUNT CONNECTION WIZARD (Tasks 241-246)

Create src/components/onboarding/connect-account-dialog.tsx:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Check, Mail } from 'lucide-react';

export function ConnectAccountDialog({
  open,
  onOpenChange
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const handleGoogleConnect = () => {
    window.location.href = '/api/auth/oauth/google';
  };

  const handleMicrosoftConnect = () => {
    window.location.href = '/api/auth/oauth/microsoft';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Connect Your Email Account</DialogTitle>
          <DialogDescription>
            Choose your email provider to get started
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Google */}
          <Button
            variant="outline"
            className="w-full h-auto py-4 px-6 justify-start"
            onClick={handleGoogleConnect}
          >
            <Mail className="h-8 w-8 mr-4" />
            <div className="flex-1 text-left">
              <div className="font-semibold">Google / Gmail</div>
              <div className="text-sm text-muted-foreground">
                Connect your Gmail or Google Workspace account
              </div>
            </div>
          </Button>

          {/* Microsoft */}
          <Button
            variant="outline"
            className="w-full h-auto py-4 px-6 justify-start"
            onClick={handleMicrosoftConnect}
          >
            <Mail className="h-8 w-8 mr-4" />
            <div className="flex-1 text-left">
              <div className="font-semibold">Microsoft / Outlook</div>
              <div className="text-sm text-muted-foreground">
                Connect your Outlook or Office 365 account
              </div>
            </div>
          </Button>

          {/* Feature Comparison */}
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-3">All providers support:</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span>Real-time sync</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span>Calendar integration</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span>Multiple accounts</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span>AI features</span>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Skip for now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

SECTION C: ONBOARDING TOUR (Tasks 247-253)

Install react-joyride:
```bash
npm install react-joyride
```

Create src/components/onboarding/onboarding-tour.tsx:

```typescript
'use client';

import { useState, useEffect } from 'react';
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';
import { useOnboarding } from '@/hooks/use-onboarding';

export function OnboardingTour() {
  const { tourCompleted, completeTour } = useOnboarding();
  const [run, setRun] = useState(false);

  useEffect(() => {
    // Start tour after 1 second delay (let page render first)
    if (!tourCompleted) {
      const timer = setTimeout(() => setRun(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [tourCompleted]);

  const steps: Step[] = [
    {
      target: '[data-tour="account-switcher"]',
      content: 'Switch between multiple email accounts here. You can connect Google, Microsoft, and more.',
      disableBeacon: true,
    },
    {
      target: '[data-tour="compose-button"]',
      content: 'Click here to compose a new email. Use Cmd+C (Mac) or Ctrl+C (Windows) as a shortcut.',
    },
    {
      target: '[data-tour="smart-inbox"]',
      content: 'Your inbox is automatically organized into sections: Priority, People, Newsletters, and more.',
    },
    {
      target: '[data-tour="settings"]',
      content: 'Access all settings here, including signatures, vacation responder, and preferences.',
    },
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      completeTour();
      setRun(false);
    }
  };

  if (tourCompleted) {
    return null;
  }

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: 'hsl(var(--primary))',
          zIndex: 10000,
        },
      }}
    />
  );
}
```

Create src/hooks/use-onboarding.ts:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useOnboarding() {
  const [tourCompleted, setTourCompleted] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOnboardingState() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from('user_preferences')
        .select('onboarding_completed')
        .eq('user_id', user.id)
        .single();

      setTourCompleted(data?.onboarding_completed ?? false);
      setLoading(false);
    }

    loadOnboardingState();
  }, []);

  const completeTour = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    await supabase
      .from('user_preferences')
      .update({ onboarding_completed: true })
      .eq('user_id', user.id);

    setTourCompleted(true);
  };

  return {
    tourCompleted,
    loading,
    completeTour,
  };
}
```

Add data-tour attributes to components:
- Account switcher: `data-tour="account-switcher"`
- Compose button: `data-tour="compose-button"`
- Smart inbox section: `data-tour="smart-inbox"`
- Settings link: `data-tour="settings"`

Modify src/app/(app)/app/layout.tsx to include tour:

```typescript
import { OnboardingTour } from '@/components/onboarding/onboarding-tour';

// Inside layout component:
<body>
  {children}
  <OnboardingTour />
</body>
```

---

SECTION D: QUICK PREFERENCES (Task 254)

Create src/components/onboarding/quick-preferences.tsx:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export function QuickPreferences({ onComplete }: { onComplete: () => void }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [readReceipts, setReadReceipts] = useState(false);

  return (
    <Card className="p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-6">Quick Setup</h2>

      {/* Theme Selection */}
      <div className="space-y-3 mb-6">
        <Label className="text-base font-semibold">Choose your theme</Label>
        <RadioGroup value={theme} onValueChange={(v: any) => setTheme(v)}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="light" id="light" />
            <Label htmlFor="light">Light mode</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="dark" id="dark" />
            <Label htmlFor="dark">Dark mode</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Read Receipts */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="read-receipts"
            checked={readReceipts}
            onCheckedChange={(checked) => setReadReceipts(checked === true)}
          />
          <Label htmlFor="read-receipts">
            Enable read receipts by default
            <span className="block text-sm text-muted-foreground">
              Track when recipients open your emails
            </span>
          </Label>
        </div>
      </div>

      <Button className="w-full" onClick={onComplete}>
        Continue to Inbox
      </Button>
    </Card>
  );
}
```

---

DATABASE MIGRATION:

Add onboarding fields to user_preferences:

```sql
-- Add to existing migration or create new one
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_skipped BOOLEAN DEFAULT FALSE;
```

---

EXIT CRITERIA CHECKLIST:

- [ ] WelcomeScreen shows when user has 0 accounts
- [ ] ConnectAccountDialog guides OAuth flow
- [ ] OnboardingTour highlights key UI elements
- [ ] Tour can be skipped
- [ ] Tour completion persisted to database
- [ ] QuickPreferences sets initial user settings
- [ ] All tour targets have data-tour attributes
- [ ] TypeScript check passes (0 errors)

---

VERIFICATION STEPS:

1. Test with fresh user:
   ```bash
   # Create new user account
   # Should see WelcomeScreen immediately
   ```

2. Test account connection:
   - Click "Connect Your Email"
   - Choose provider
   - Complete OAuth flow
   - Should redirect to inbox

3. Test onboarding tour:
   - Should auto-start after 1 second
   - All 4 steps should highlight correctly
   - "Skip" and "Next" buttons work
   - Completion persists to database

4. Test skip behavior:
   - User can skip welcome screen
   - User can skip tour
   - Preferences saved correctly

---

HANDOFF NOTES:

After completing this stage:
- Update BUILD-STATE.md with onboarding feature
- Test onboarding flow with multiple test users
- Commit changes: "feat: Phase 9B complete - User onboarding"
- Proceed to Phase 9C: Advanced UX Polish

```
