/**
 * Cron job: Process Queued Sends
 * Runs every second via Vercel Cron (or every 10 seconds for free tier)
 * Sends emails that have passed their send_at time
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProvider } from '@/lib/providers';
import { getValidToken } from '@/lib/providers/token-manager';
import { emitEvent } from '@/lib/events';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  try {
    // Fetch queued sends that are due
    const { data: queuedSends, error: fetchError } = await supabase
      .from('queued_sends')
      .select('*, email_account:email_accounts(*)')
      .eq('sent', false)
      .eq('canceled', false)
      .lte('send_at', now)
      .order('send_at', { ascending: true })
      .limit(50); // Process up to 50 per run to avoid timeout

    if (fetchError) {
      console.error('Error fetching queued sends:', fetchError);
      return NextResponse.json(
        { error: 'Database error', processed: 0, failed: 0 },
        { status: 500 }
      );
    }

    if (!queuedSends || queuedSends.length === 0) {
      return NextResponse.json({
        message: 'No queued sends due',
        processed: 0,
        failed: 0,
      });
    }

    let processed = 0;
    let failed = 0;

    // Process each queued send
    for (const queued of queuedSends) {
      try {
        const emailAccount = (queued as any).email_account;
        if (!emailAccount) {
          throw new Error('Email account not found');
        }

        // Get valid token
        const tokenResult = await getValidToken(emailAccount.id);
        if (!tokenResult.token) {
          throw new Error(tokenResult.error || 'Invalid token');
        }

        // Get provider
        const provider = getProvider(emailAccount.provider as any);

        // Prepare attachments if they exist
        let attachments;
        if (queued.attachments && Array.isArray(queued.attachments)) {
          // Attachments are stored as metadata with URLs
          // For now, we skip attachment content in queued sends
          // This is a known limitation - attachments would need to be downloaded
          // from storage and re-uploaded. Future enhancement.
          attachments = undefined;
        }

        // Send message via provider
        const result = await provider.sendMessage(tokenResult.token, {
          to: queued.to_addresses as Array<{ email: string; name?: string | null }>,
          cc: queued.cc_addresses as Array<{ email: string; name?: string | null }> | undefined,
          bcc: queued.bcc_addresses as Array<{ email: string; name?: string | null }> | undefined,
          subject: queued.subject,
          body_html: queued.body_html || queued.body,
          body_text: queued.body,
          attachments,
          reply_to_message_id: queued.in_reply_to || undefined,
        });

        // Mark as sent
        await supabase
          .from('queued_sends')
          .update({
            sent: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', queued.id);

        // Log usage
        await supabase.from('usage_tracking').insert({
          user_id: queued.user_id,
          feature: 'email_send',
          count: 1,
          timestamp: new Date().toISOString(),
        });

        // Emit event
        await emitEvent({
          eventType: 'message.sent',
          entityType: 'message',
          entityId: result.id,
          actorId: queued.user_id,
          payload: {
            queued_send_id: queued.id,
            delayed: true,
          },
          metadata: { source: 'cron' },
        });

        processed++;
      } catch (error: any) {
        console.error('Error processing queued send:', queued.id, error);

        // Mark as failed with error message
        await supabase
          .from('queued_sends')
          .update({
            error: error.message || 'Unknown error',
            updated_at: new Date().toISOString(),
          })
          .eq('id', queued.id);

        failed++;
      }
    }

    return NextResponse.json({
      message: 'Processed queued sends',
      processed,
      failed,
      total: queuedSends.length,
    });
  } catch (error: any) {
    console.error('Cron error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal error', processed: 0, failed: 0 },
      { status: 500 }
    );
  }
}
