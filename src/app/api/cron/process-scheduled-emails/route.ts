import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/actions/message';

/**
 * Cron job: Process scheduled emails
 * Runs every minute via Vercel Cron
 * Sends emails that are due (scheduled_for <= NOW)
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  try {
    // Fetch scheduled emails that are due
    const { data: scheduledEmails, error } = await supabase
      .from('scheduled_emails')
      .select('*')
      .eq('status', 'queued')
      .lte('scheduled_for', now)
      .order('scheduled_for', { ascending: true })
      .limit(50); // Process up to 50 per run

    if (error) {
      console.error('Error fetching scheduled emails:', error);
      return NextResponse.json(
        { error: 'Database error', processed: 0 },
        { status: 500 }
      );
    }

    if (!scheduledEmails || scheduledEmails.length === 0) {
      return NextResponse.json({ message: 'No scheduled emails due', processed: 0 });
    }

    let processed = 0;
    let failed = 0;

    // Process each scheduled email
    for (const email of scheduledEmails) {
      try {
        // Get email account
        const { data: account } = await supabase
          .from('email_accounts')
          .select('id, provider, email')
          .eq('id', email.email_account_id)
          .single();

        if (!account) {
          throw new Error('Email account not found');
        }

        // Update status to sending
        await supabase
          .from('scheduled_emails')
          .update({ status: 'sending' })
          .eq('id', email.id);

        // Send email via provider
        // Extract email addresses from recipient objects
        const toEmails = (email.to_recipients as Array<{ email: string; name?: string }>).map(r => r.email);
        const ccEmails = (email.cc_recipients as Array<{ email: string; name?: string }> | null)?.map(r => r.email) || [];
        const bccEmails = (email.bcc_recipients as Array<{ email: string; name?: string }> | null)?.map(r => r.email) || [];

        const result = await sendEmail({
          email_account_id: email.email_account_id,
          to: toEmails,
          cc: ccEmails,
          bcc: bccEmails,
          subject: email.subject || '',
          body_html: email.body_html,
        });

        if (result.error) {
          throw new Error(result.error);
        }

        // Mark as sent
        await supabase
          .from('scheduled_emails')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', email.id);

        processed++;
      } catch (error) {
        console.error('Error sending scheduled email:', email.id, error);

        const retryCount = email.retry_count || 0;
        const maxRetries = 3;

        if (retryCount < maxRetries) {
          // Retry later
          await supabase
            .from('scheduled_emails')
            .update({
              status: 'queued',
              retry_count: retryCount + 1,
              error_message: error instanceof Error ? error.message : 'Unknown error',
            })
            .eq('id', email.id);
        } else {
          // Max retries reached - mark as failed
          await supabase
            .from('scheduled_emails')
            .update({
              status: 'failed',
              error_message: error instanceof Error ? error.message : 'Unknown error',
            })
            .eq('id', email.id);

          // Notify user
          await supabase.from('notification_queue').insert({
            user_id: email.user_id,
            type: 'error',
            title: 'Scheduled Email Failed',
            message: `Failed to send scheduled email: ${email.subject}`,
            link: '/app/scheduled',
            read: false,
          });
        }

        failed++;
      }
    }

    return NextResponse.json({
      message: 'Processed scheduled emails',
      processed,
      failed,
    });
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json(
      { error: 'Internal error', processed: 0 },
      { status: 500 }
    );
  }
}
