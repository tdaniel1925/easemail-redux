# PATTERN: Background Jobs & Scheduled Tasks

## When to Use
Any work that takes too long for an API response: bulk emails, report generation, file processing, nightly calculations, webhook retries, data syncs.

## Recommended: Inngest (serverless-friendly)
Works on Vercel, no Redis needed, built-in retries, cron, and step functions.

### Setup
```bash
npm install inngest
```

### Define Functions
```typescript
// lib/inngest/client.ts
import { Inngest } from 'inngest';
export const inngest = new Inngest({ id: 'my-app' });

// lib/inngest/functions/send-bulk-email.ts
import { inngest } from '../client';

export const sendBulkEmail = inngest.createFunction(
  { id: 'send-bulk-email', retries: 3 },
  { event: 'email/bulk.send' },
  async ({ event, step }) => {
    const { recipients, templateId } = event.data;

    // Step 1: Fetch template
    const template = await step.run('fetch-template', async () => {
      return await db.emailTemplates.findById(templateId);
    });

    // Step 2: Send to each recipient (with built-in parallelism)
    for (const recipient of recipients) {
      await step.run(`send-to-${recipient.id}`, async () => {
        await resend.emails.send({
          to: recipient.email,
          subject: template.subject,
          html: template.body,
        });
      });
    }

    return { sent: recipients.length };
  }
);
```

### Scheduled/Cron Jobs
```typescript
export const nightlyReport = inngest.createFunction(
  { id: 'nightly-report' },
  { cron: '0 2 * * *' }, // 2 AM daily
  async ({ step }) => {
    const data = await step.run('gather-data', async () => {
      return await db.analytics.getDailySummary();
    });

    await step.run('send-report', async () => {
      await resend.emails.send({
        to: 'admin@company.com',
        subject: `Daily Report — ${new Date().toLocaleDateString()}`,
        html: renderReport(data),
      });
    });
  }
);
```

### API Route (Next.js App Router)
```typescript
// app/api/inngest/route.ts
import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { sendBulkEmail } from '@/lib/inngest/functions/send-bulk-email';
import { nightlyReport } from '@/lib/inngest/functions/nightly-report';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [sendBulkEmail, nightlyReport],
});
```

### Trigger from Server Actions
```typescript
// actions/email.ts
'use server';
import { inngest } from '@/lib/inngest/client';

export async function sendCampaign(campaignId: string) {
  const recipients = await getRecipients(campaignId);
  
  await inngest.send({
    name: 'email/bulk.send',
    data: { recipients, templateId: campaign.templateId },
  });

  return { queued: recipients.length };
}
```

## Alternative: BullMQ + Redis (for VPS deployments)
Use when you need more control, run on your own server, or need priority queues.

```typescript
// lib/queue.ts
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis(process.env.REDIS_URL);
export const jobQueue = new Queue('jobs', { connection });

// workers/email-worker.ts
new Worker('jobs', async (job) => {
  if (job.name === 'send-email') {
    await resend.emails.send(job.data);
  }
}, { connection, concurrency: 5 });
```

## Rules
- Never do heavy work in API routes or server actions — queue it
- Always set retries with exponential backoff
- Log job start, completion, and failure
- For cron jobs, make them idempotent (safe to run twice)
- Store job results in the database, not just in the queue
- Add a /admin/jobs page showing queue status, failed jobs, retry buttons
