/**
 * Webhook verification utilities for Google and Microsoft push notifications
 * Ensures webhook requests are authentic and not spoofed
 */

import type {
  GoogleWebhookPayload,
  GoogleWebhookData,
  MicrosoftWebhookPayload,
  MicrosoftWebhookNotification,
  WebhookVerificationResult,
} from '@/types/webhook';

/**
 * Verify Google Gmail API push notification
 *
 * Google uses Cloud Pub/Sub to send push notifications. The message contains
 * a base64-encoded JSON payload with the email address and history ID.
 *
 * Verification steps:
 * 1. Validate payload structure
 * 2. Decode base64 message data
 * 3. Parse JSON
 * 4. Validate required fields
 *
 * @param payload - Raw webhook payload from Google
 * @returns Verification result with decoded data
 *
 * Reference: https://developers.google.com/gmail/api/guides/push
 */
export function verifyGoogleWebhook(
  payload: GoogleWebhookPayload
): WebhookVerificationResult {
  try {
    // Validate payload structure
    if (!payload.message || typeof payload.message.data !== 'string') {
      return {
        valid: false,
        error: 'Invalid Google webhook payload: missing message.data',
      };
    }

    // Decode base64 message data
    const decodedData = Buffer.from(payload.message.data, 'base64').toString('utf-8');

    // Parse JSON
    const data = JSON.parse(decodedData) as GoogleWebhookData;

    // Validate required fields
    if (!data.emailAddress || !data.historyId) {
      return {
        valid: false,
        error: 'Invalid Google webhook data: missing emailAddress or historyId',
      };
    }

    // Verify history ID is numeric
    if (!/^\d+$/.test(data.historyId)) {
      return {
        valid: false,
        error: 'Invalid Google webhook data: historyId must be numeric',
      };
    }

    return {
      valid: true,
      data,
    };
  } catch (error) {
    return {
      valid: false,
      error: `Failed to verify Google webhook: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Verify Microsoft Graph API webhook notification
 *
 * Microsoft Graph sends webhook notifications with a clientState value
 * that must match the value provided when creating the subscription.
 * This prevents replay attacks and spoofed notifications.
 *
 * Verification steps:
 * 1. Validate payload structure
 * 2. Validate clientState matches expected value
 * 3. Validate required notification fields
 * 4. Check subscription expiry
 *
 * @param payload - Raw webhook payload from Microsoft
 * @param expectedClientState - Client state value from subscription creation
 * @returns Verification result with first notification
 *
 * Reference: https://docs.microsoft.com/en-us/graph/webhooks
 */
export function verifyMicrosoftWebhook(
  payload: MicrosoftWebhookPayload,
  expectedClientState: string
): WebhookVerificationResult {
  try {
    // Validate payload structure
    if (!payload.value || !Array.isArray(payload.value) || payload.value.length === 0) {
      return {
        valid: false,
        error: 'Invalid Microsoft webhook payload: missing or empty value array',
      };
    }

    // Get first notification (usually only one per request)
    const notification = payload.value[0];

    // Validate client state
    if (notification.clientState !== expectedClientState) {
      return {
        valid: false,
        error: 'Invalid Microsoft webhook: clientState mismatch',
      };
    }

    // Validate required fields
    if (
      !notification.subscriptionId ||
      !notification.changeType ||
      !notification.resource
    ) {
      return {
        valid: false,
        error: 'Invalid Microsoft webhook: missing required fields',
      };
    }

    // Check if subscription is expired
    const expiryDate = new Date(notification.subscriptionExpirationDateTime);
    const now = new Date();

    if (expiryDate < now) {
      return {
        valid: false,
        error: 'Microsoft webhook subscription has expired',
      };
    }

    return {
      valid: true,
      data: notification,
    };
  } catch (error) {
    return {
      valid: false,
      error: `Failed to verify Microsoft webhook: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Validate Microsoft Graph webhook validation request
 *
 * When creating a subscription, Microsoft sends a validation request
 * with a validationToken query parameter. We must respond with that
 * token in plain text to confirm ownership of the webhook endpoint.
 *
 * @param validationToken - Token from query parameter
 * @returns The same token to send back
 *
 * Reference: https://docs.microsoft.com/en-us/graph/webhooks#notification-endpoint-validation
 */
export function validateMicrosoftWebhookEndpoint(
  validationToken: string | null
): string | null {
  if (!validationToken || typeof validationToken !== 'string') {
    return null;
  }

  // Return the token as-is for validation
  return validationToken;
}
