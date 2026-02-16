/**
 * Email Types
 * Type definitions for email operations (reply, forward, send)
 */

export interface Recipient {
  email: string;
  name?: string | null;
}

export interface ReplyPayload {
  messageId: string;
  body_html: string;
  body_text?: string | null;
  to_all?: boolean; // false = reply, true = reply all
  cc?: Recipient[];
  bcc?: Recipient[];
}

export interface SendEmailPayload {
  email_account_id: string;
  to: Recipient[];
  cc?: Recipient[];
  bcc?: Recipient[];
  subject: string;
  body_html: string;
  body_text?: string | null;
  reply_to_message_id?: string;
  attachments?: {
    name: string;
    content: Buffer | string;
    content_type: string;
  }[];
}

export interface ForwardPayload {
  messageId: string;
  to: Recipient[];
  comment?: string;
  cc?: Recipient[];
  bcc?: Recipient[];
}

export interface QueuedSend {
  id: string;
  user_id: string;
  account_id: string;
  to_addresses: Recipient[];
  cc_addresses?: Recipient[] | null;
  bcc_addresses?: Recipient[] | null;
  subject: string;
  body: string;
  body_html?: string | null;
  attachments?: {
    name: string;
    size: number;
    content_type: string;
    url: string;
  }[] | null;
  signature_id?: string | null;
  in_reply_to?: string | null;
  references?: string | null;
  send_at: string; // ISO timestamp
  canceled: boolean;
  sent: boolean;
  error?: string | null;
  created_at: string;
  updated_at: string;
}
