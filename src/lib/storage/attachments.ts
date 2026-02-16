/**
 * Attachment storage utilities for Supabase Storage
 *
 * Handles uploading and downloading attachments to/from Supabase Storage.
 * Files are stored in the 'attachments' bucket with path structure: {user_id}/{message_id}/{filename}
 */

import { createClient } from '@/lib/supabase/client';
import type { AttachmentMetadata } from '@/types/attachment';

/**
 * Upload a file to Supabase Storage
 *
 * @param file - The file to upload
 * @param userId - User ID (for path isolation)
 * @param messageId - Message or draft ID (for grouping)
 * @returns Attachment metadata or error
 */
export async function uploadAttachment(
  file: File,
  userId: string,
  messageId: string
): Promise<{ success: boolean; attachment?: AttachmentMetadata; error?: string }> {
  try {
    const supabase = createClient();

    // Generate unique filename to avoid collisions
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}_${sanitizedName}`;

    // Construct storage path: attachments/{user_id}/{message_id}/{filename}
    const storagePath = `${userId}/${messageId}/${filename}`;

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from('attachments')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Attachment upload failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload attachment',
      };
    }

    // Generate attachment metadata
    const attachment: AttachmentMetadata = {
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      storage_path: data.path,
      uploaded_at: new Date().toISOString(),
    };

    return {
      success: true,
      attachment,
    };
  } catch (err) {
    console.error('Attachment upload error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error during upload',
    };
  }
}

/**
 * Download a file from Supabase Storage
 *
 * @param storagePath - Path in Supabase Storage bucket
 * @returns Blob or error
 */
export async function downloadAttachment(
  storagePath: string
): Promise<{ success: boolean; blob?: Blob; error?: string }> {
  try {
    const supabase = createClient();

    // Download file from Supabase Storage
    const { data, error } = await supabase.storage.from('attachments').download(storagePath);

    if (error) {
      console.error('Attachment download failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to download attachment',
      };
    }

    return {
      success: true,
      blob: data,
    };
  } catch (err) {
    console.error('Attachment download error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error during download',
    };
  }
}

/**
 * Delete a file from Supabase Storage
 *
 * @param storagePath - Path in Supabase Storage bucket
 * @returns Success status or error
 */
export async function deleteAttachment(
  storagePath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();

    // Delete file from Supabase Storage
    const { error } = await supabase.storage.from('attachments').remove([storagePath]);

    if (error) {
      console.error('Attachment deletion failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete attachment',
      };
    }

    return {
      success: true,
    };
  } catch (err) {
    console.error('Attachment deletion error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error during deletion',
    };
  }
}

/**
 * Get a public URL for an attachment (if bucket is public)
 * Note: Our 'attachments' bucket is private, so this returns a signed URL
 *
 * @param storagePath - Path in Supabase Storage bucket
 * @param expiresIn - Expiry time in seconds (default: 1 hour)
 * @returns Public or signed URL
 */
export async function getAttachmentUrl(
  storagePath: string,
  expiresIn: number = 3600
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const supabase = createClient();

    // Get signed URL for private bucket
    const { data, error } = await supabase.storage
      .from('attachments')
      .createSignedUrl(storagePath, expiresIn);

    if (error) {
      console.error('Get attachment URL failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to get attachment URL',
      };
    }

    return {
      success: true,
      url: data.signedUrl,
    };
  } catch (err) {
    console.error('Get attachment URL error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error getting URL',
    };
  }
}

/**
 * List all attachments for a message
 *
 * @param userId - User ID
 * @param messageId - Message ID
 * @returns List of file paths
 */
export async function listAttachments(
  userId: string,
  messageId: string
): Promise<{ success: boolean; files?: string[]; error?: string }> {
  try {
    const supabase = createClient();

    const prefix = `${userId}/${messageId}/`;

    const { data, error } = await supabase.storage.from('attachments').list(prefix);

    if (error) {
      console.error('List attachments failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to list attachments',
      };
    }

    const files = data.map((file) => `${prefix}${file.name}`);

    return {
      success: true,
      files,
    };
  } catch (err) {
    console.error('List attachments error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error listing attachments',
    };
  }
}
