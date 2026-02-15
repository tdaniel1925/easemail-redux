# PATTERN: Transactional Email (Resend + React Email)

## When to Use
Any app that sends emails: welcome, password reset, notifications, invoices, invitations.

## Setup
```bash
npm install resend react-email @react-email/components
```

## Email Service
```typescript
// lib/email/client.ts
import { Resend } from 'resend';
export const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({ to, subject, template, data }: {
  to: string | string[];
  subject: string;
  template: string;
  data: Record<string, any>;
}) {
  const TemplateComponent = templates[template];
  if (!TemplateComponent) throw new Error(`Unknown email template: ${template}`);

  try {
    const { error } = await resend.emails.send({
      from: `${process.env.APP_NAME} <noreply@${process.env.EMAIL_DOMAIN}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      react: TemplateComponent(data),
    });
    if (error) { console.error('Email failed:', error); return { success: false, error }; }
    return { success: true };
  } catch (error) {
    console.error('Email service error:', error);
    return { success: false, error };
  }
}
```

## Templates (React Email)
```typescript
// emails/welcome.tsx
import { Html, Head, Body, Container, Heading, Text, Button, Hr, Img } from '@react-email/components';

export default function WelcomeEmail({ userName, loginUrl }: { userName: string; loginUrl: string }) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f4f4f6', fontFamily: 'Arial, sans-serif' }}>
        <Container style={{ maxWidth: 600, margin: '0 auto', backgroundColor: '#fff', padding: 40, borderRadius: 8 }}>
          <Img src={`${process.env.NEXT_PUBLIC_APP_URL}/logo.png`} width={120} height={40} alt="Logo" />
          <Heading style={{ fontSize: 24, marginTop: 32 }}>Welcome, {userName}!</Heading>
          <Text style={{ fontSize: 16, color: '#555', lineHeight: '24px' }}>
            Your account is ready. Click below to get started.
          </Text>
          <Button href={loginUrl} style={{ backgroundColor: '#0066FF', color: '#fff', padding: '12px 24px', borderRadius: 6, fontSize: 16, textDecoration: 'none' }}>
            Go to Dashboard
          </Button>
          <Hr style={{ marginTop: 32, borderColor: '#eee' }} />
          <Text style={{ fontSize: 12, color: '#999' }}>If you didn't create this account, ignore this email.</Text>
        </Container>
      </Body>
    </Html>
  );
}
```

### Standard Templates Every App Needs
```
emails/
├── welcome.tsx           — after signup
├── password-reset.tsx    — password reset link
├── email-verify.tsx      — verify email address
├── invitation.tsx        — invited to org/team
├── notification.tsx      — generic action notification
└── layout.tsx            — shared header/footer
```

## Sending from Server Actions
```typescript
'use server';
import { sendEmail } from '@/lib/email/client';

export async function signUp(data: SignUpInput) {
  const user = await createUser(data);
  // Email failures should NOT block the main operation
  await sendEmail({
    to: data.email,
    subject: `Welcome to ${process.env.APP_NAME}`,
    template: 'welcome',
    data: { userName: data.name, loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/auth/login` },
  }).catch(err => console.error('Welcome email failed:', err));
}
```

## Rules
- Never send from server components — always server actions or API routes
- Wrap in try/catch — email failures must not crash the main operation
- Use React Email for templates — never raw HTML strings
- Log all sent emails (to, subject, template, timestamp) for debugging
- Domain verification (SPF, DKIM, DMARC) required for production
- Rate limit: max 1 email per user per minute for same event type
- Test with Resend sandbox before live
