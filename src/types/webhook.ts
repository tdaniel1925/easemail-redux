import type { Webhook, WebhookInsert, WebhookUpdate } from './database';

export type { Webhook, WebhookInsert, WebhookUpdate };

// Webhook payload types for Google and Microsoft push notifications

/**
 * Google Gmail API push notification payload
 * Sent when Gmail detects changes to a mailbox
 * Reference: https://developers.google.com/gmail/api/guides/push
 */
export interface GoogleWebhookPayload {
  message: {
    // Base64-encoded JSON message
    data: string;
    // Message ID assigned by Cloud Pub/Sub
    messageId: string;
    // Publish time as RFC3339 timestamp
    publishTime: string;
  };
  // Cloud Pub/Sub subscription name
  subscription: string;
}

/**
 * Decoded Google webhook message data
 */
export interface GoogleWebhookData {
  // User's email address
  emailAddress: string;
  // History ID representing the state after the change
  historyId: string;
}

/**
 * Microsoft Graph API webhook notification payload
 * Sent when Microsoft Graph detects changes to a subscribed resource
 * Reference: https://docs.microsoft.com/en-us/graph/webhooks
 */
export interface MicrosoftWebhookPayload {
  // Array of notifications (can contain multiple)
  value: MicrosoftWebhookNotification[];
}

/**
 * Individual Microsoft Graph webhook notification
 */
export interface MicrosoftWebhookNotification {
  // Subscription ID that triggered the notification
  subscriptionId: string;
  // Expiration time of the subscription (ISO 8601)
  subscriptionExpirationDateTime: string;
  // Client state value for validation
  clientState: string;
  // Type of change (created, updated, deleted)
  changeType: string;
  // Resource path (e.g., /me/mailFolders('Inbox')/messages)
  resource: string;
  // Timestamp when the change occurred
  resourceData?: {
    '@odata.type': string;
    '@odata.id': string;
    '@odata.etag': string;
    id: string;
  };
}

/**
 * Webhook verification result
 */
export interface WebhookVerificationResult {
  // Whether the webhook signature/token is valid
  valid: boolean;
  // Error message if invalid
  error?: string;
  // Decoded payload data
  data?: GoogleWebhookData | MicrosoftWebhookNotification;
}

/**
 * Webhook subscription configuration
 */
export interface WebhookSubscription {
  // Provider type
  provider: 'google' | 'microsoft';
  // Subscription ID from the provider
  subscriptionId: string;
  // Email account ID in our database
  accountId: string;
  // When the subscription expires
  expiresAt: Date;
  // Resource being watched
  resource: string;
  // Client state/validation token
  clientState?: string;
}
