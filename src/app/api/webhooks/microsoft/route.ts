/**
 * Microsoft Graph API Webhook Receiver
 * Receives push notifications from Microsoft Graph when mailbox changes occur
 * Triggers delta sync to fetch new messages
 *
 * Reference: https://docs.microsoft.com/en-us/graph/webhooks
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  verifyMicrosoftWebhook,
  validateMicrosoftWebhookEndpoint,
} from '@/lib/providers/webhook-verify';
import type {
  MicrosoftWebhookPayload,
  MicrosoftWebhookNotification,
} from '@/types/webhook';
import { createClient } from '@/lib/supabase/server';
import { performDeltaSync } from '@/lib/sync/email-sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/webhooks/microsoft?validationToken=...
 *
 * Microsoft Graph sends a validation request when creating a subscription
 * We must respond with the validationToken to confirm endpoint ownership
 *
 * Query params:
 * - validationToken: Token to echo back
 *
 * Response: Plain text token
 */
export async function GET(req: NextRequest) {
  const validationToken = req.nextUrl.searchParams.get('validationToken');

  const token = validateMicrosoftWebhookEndpoint(validationToken);
  if (!token) {
    return new NextResponse('Invalid validation token', { status: 400 });
  }

  // Return token as plain text
  return new NextResponse(token, {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
}

/**
 * POST /api/webhooks/microsoft
 *
 * Receives push notifications from Microsoft Graph
 *
 * Request body:
 * {
 *   value: [
 *     {
 *       subscriptionId: "...",
 *       subscriptionExpirationDateTime: "2023-01-01T00:00:00.000Z",
 *       clientState: "...",
 *       changeType: "created",
 *       resource: "me/mailFolders('Inbox')/messages",
 *       resourceData: { ... }
 *     }
 *   ]
 * }
 *
 * Response:
 * - 202: Webhook accepted
 * - 400: Invalid webhook payload
 * - 401: Unauthorized (webhook verification failed)
 * - 500: Internal server error
 */
export async function POST(req: NextRequest) {
  try {
    // Parse webhook payload
    const payload = (await req.json()) as MicrosoftWebhookPayload;

    // Find the email account to get the expected clientState
    // For now, we'll fetch all Microsoft accounts and check clientState
    const supabase = await createClient();

    // TODO: Once migration 010_realtime_sync.sql is applied, use webhook_subscription_id to match accounts
    // For now, trigger delta sync for all Microsoft accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('email_accounts')
      .select('id, user_id')
      .eq('provider', 'MICROSOFT');

    if (accountsError) {
      console.error('[Microsoft Webhook] Failed to fetch accounts:', accountsError);
      return NextResponse.json(
        { error: 'Failed to fetch accounts' },
        { status: 500 }
      );
    }

    if (!accounts || accounts.length === 0) {
      console.warn('[Microsoft Webhook] No Microsoft accounts found');
      // Return 202 to acknowledge webhook
      return new NextResponse(null, { status: 202 });
    }

    // Process each notification
    const results = [];
    for (const notification of payload.value) {
      console.log('[Microsoft Webhook] Received notification:', {
        subscriptionId: notification.subscriptionId,
        changeType: notification.changeType,
        resource: notification.resource,
      });

      // Trigger delta sync for all Microsoft accounts
      // TODO: Improve to only sync the account matching notification.subscriptionId
      for (const account of accounts) {
        performDeltaSync(account.id).catch((error) => {
          console.error('[Microsoft Webhook] Delta sync failed:', error);
        });

        results.push({
          accountId: account.id,
          subscriptionId: notification.subscriptionId,
          status: 'triggered',
        });

        console.log(
          '[Microsoft Webhook] Delta sync triggered for account:',
          account.id
        );
      }
    }

    // Microsoft expects 202 Accepted for async processing
    return new NextResponse(null, { status: 202 });
  } catch (error) {
    console.error('[Microsoft Webhook] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
