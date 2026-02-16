/**
 * Google Gmail API Webhook Receiver
 * Receives push notifications from Google Cloud Pub/Sub when mailbox changes occur
 * Triggers delta sync to fetch new messages
 *
 * Reference: https://developers.google.com/gmail/api/guides/push
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyGoogleWebhook } from '@/lib/providers/webhook-verify';
import type { GoogleWebhookPayload, GoogleWebhookData } from '@/types/webhook';
import { createClient } from '@/lib/supabase/server';
import { performDeltaSync } from '@/lib/sync/email-sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/google
 *
 * Receives push notifications from Google Cloud Pub/Sub
 *
 * Request body:
 * {
 *   message: {
 *     data: "base64-encoded JSON with emailAddress and historyId",
 *     messageId: "1234567890",
 *     publishTime: "2023-01-01T00:00:00.000Z"
 *   },
 *   subscription: "projects/my-project/subscriptions/my-subscription"
 * }
 *
 * Response:
 * - 200: Webhook processed successfully
 * - 400: Invalid webhook payload
 * - 401: Unauthorized (webhook verification failed)
 * - 500: Internal server error
 */
export async function POST(req: NextRequest) {
  try {
    // Parse webhook payload
    const payload = (await req.json()) as GoogleWebhookPayload;

    // Verify webhook authenticity
    const verification = verifyGoogleWebhook(payload);
    if (!verification.valid) {
      console.error('[Google Webhook] Verification failed:', verification.error);
      return NextResponse.json(
        { error: 'Webhook verification failed', details: verification.error },
        { status: 401 }
      );
    }

    const webhookData = verification.data as GoogleWebhookData;

    // Find email account by email address
    const supabase = await createClient();
    const { data: account, error: accountError } = await supabase
      .from('email_accounts')
      .select('id, user_id, provider')
      .eq('email_address', webhookData.emailAddress)
      .eq('provider', 'GOOGLE')
      .maybeSingle();

    if (accountError) {
      console.error('[Google Webhook] Failed to find email account:', accountError);
      return NextResponse.json(
        { error: 'Failed to find email account' },
        { status: 500 }
      );
    }

    if (!account) {
      console.warn(
        '[Google Webhook] Email account not found for:',
        webhookData.emailAddress
      );
      // Return 200 to acknowledge webhook (account may have been disconnected)
      return NextResponse.json({ success: true, message: 'Account not found' });
    }

    // Trigger delta sync in background (don't await to respond quickly to Google)
    performDeltaSync(account.id).catch((error) => {
      console.error('[Google Webhook] Delta sync failed:', error);
    });

    // Respond quickly to Google to acknowledge receipt
    return NextResponse.json({
      success: true,
      message: 'Webhook processed',
      accountId: account.id,
    });
  } catch (error) {
    console.error('[Google Webhook] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
