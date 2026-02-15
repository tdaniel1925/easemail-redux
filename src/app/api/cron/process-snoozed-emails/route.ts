import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleSnoozeExpired } from '@/lib/automation/event-handlers';

/**
 * Cron job: Process snoozed emails
 * Runs every 5 minutes via Vercel Cron
 * Unsnoozes emails that have reached their snooze_until time
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
    // Fetch snoozed emails that are due
    const { data: snoozedEmails, error } = await supabase
      .from('snoozed_emails')
      .select('id, user_id')
      .eq('unsnoozed', false)
      .lte('snooze_until', now)
      .order('snooze_until', { ascending: true })
      .limit(100); // Process up to 100 per run

    if (error) {
      console.error('Error fetching snoozed emails:', error);
      return NextResponse.json(
        { error: 'Database error', processed: 0 },
        { status: 500 }
      );
    }

    if (!snoozedEmails || snoozedEmails.length === 0) {
      return NextResponse.json({ message: 'No snoozed emails due', processed: 0 });
    }

    let processed = 0;

    // Process each snoozed email
    for (const snoozed of snoozedEmails) {
      try {
        await handleSnoozeExpired(snoozed.user_id, snoozed.id);
        processed++;
      } catch (error) {
        console.error('Error processing snoozed email:', snoozed.id, error);
      }
    }

    return NextResponse.json({
      message: 'Processed snoozed emails',
      processed,
    });
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json(
      { error: 'Internal error', processed: 0 },
      { status: 500 }
    );
  }
}
