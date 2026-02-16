/**
 * Attachment types for Supabase Storage
 *
 * This module defines types for attachment handling in EaseMail.
 * Attachments are stored in Supabase Storage and metadata is stored in messages.attachments (JSONB).
 */

/**
 * Attachment metadata stored in messages.attachments column (JSONB)
 * This is what gets stored in the database alongside the message
 */
export interface AttachmentMetadata {
  /** Unique ID for the attachment (UUID) */
  id: string;
  /** Original filename */
  name: string;
  /** File size in bytes */
  size: number;
  /** MIME type (e.g., 'application/pdf', 'image/png') */
  type: string;
  /** Storage path in Supabase Storage bucket */
  storage_path: string;
  /** When the attachment was uploaded */
  uploaded_at: string;
}

/**
 * Attachment upload request payload
 */
export interface AttachmentUploadPayload {
  /** The file to upload */
  file: File;
  /** User ID (for storage path isolation) */
  user_id: string;
  /** Message ID or draft ID (for grouping attachments) */
  message_id: string;
}

/**
 * Attachment upload response
 */
export interface AttachmentUploadResponse {
  /** Success status */
  success: boolean;
  /** Attachment metadata (if successful) */
  attachment?: AttachmentMetadata;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Attachment download request
 */
export interface AttachmentDownloadRequest {
  /** Attachment ID */
  id: string;
  /** Storage path in Supabase Storage */
  storage_path: string;
  /** Original filename (for download filename) */
  name: string;
}

/**
 * Client-side attachment state (used in UI)
 * Tracks upload progress and errors
 */
export interface AttachmentState {
  /** Attachment metadata */
  metadata: AttachmentMetadata;
  /** Upload progress (0-100) */
  progress: number;
  /** Upload status */
  status: 'pending' | 'uploading' | 'completed' | 'error';
  /** Error message (if status is 'error') */
  error?: string;
}

/**
 * Type guard to check if attachment is from provider (has content)
 * vs. stored attachment (has storage_path)
 */
export function isProviderAttachment(
  attachment: unknown
): attachment is { id: string; name: string; content: Buffer; content_type: string; size: number } {
  return (
    typeof attachment === 'object' &&
    attachment !== null &&
    'content' in attachment &&
    Buffer.isBuffer((attachment as any).content)
  );
}

/**
 * Type guard to check if attachment is stored attachment
 */
export function isStoredAttachment(attachment: unknown): attachment is AttachmentMetadata {
  return (
    typeof attachment === 'object' &&
    attachment !== null &&
    'storage_path' in attachment &&
    typeof (attachment as any).storage_path === 'string'
  );
}
