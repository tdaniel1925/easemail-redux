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
