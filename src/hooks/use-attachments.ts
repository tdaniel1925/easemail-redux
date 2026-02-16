'use client';

/**
 * Hook for managing email attachments
 * Handles uploading, tracking, and removing attachments in composer
 */

import { useState, useCallback } from 'react';
import type { AttachmentMetadata, AttachmentState } from '@/types/attachment';

export interface UseAttachmentsOptions {
  /** Message or draft ID for grouping attachments */
  messageId: string;
  /** Maximum file size in bytes (default: 50 MB) */
  maxFileSize?: number;
  /** Maximum number of attachments (default: 10) */
  maxAttachments?: number;
  /** Callback when upload completes */
  onUploadComplete?: (attachment: AttachmentMetadata) => void;
  /** Callback when upload fails */
  onUploadError?: (error: string) => void;
}

/**
 * Hook to manage email attachments
 *
 * @param options - Configuration options
 * @returns Attachment state and mutation functions
 *
 * @example
 * ```tsx
 * const { attachments, upload, remove, isUploading } = useAttachments({
 *   messageId: draftId,
 *   maxFileSize: 50 * 1024 * 1024, // 50 MB
 *   onUploadComplete: (attachment) => console.log('Uploaded:', attachment),
 * });
 * ```
 */
export function useAttachments(options: UseAttachmentsOptions) {
  const {
    messageId,
    maxFileSize = 50 * 1024 * 1024, // 50 MB
    maxAttachments = 10,
    onUploadComplete,
    onUploadError,
  } = options;

  // Local state for attachments
  const [attachments, setAttachments] = useState<AttachmentState[]>([]);

  /**
   * Upload a file
   */
  const upload = useCallback(
    async (file: File): Promise<void> => {
      // Validate file size
      if (file.size > maxFileSize) {
        const error = `File size exceeds ${(maxFileSize / 1024 / 1024).toFixed(0)} MB limit`;
        onUploadError?.(error);
        throw new Error(error);
      }

      // Validate max attachments
      if (attachments.length >= maxAttachments) {
        const error = `Maximum ${maxAttachments} attachments allowed`;
        onUploadError?.(error);
        throw new Error(error);
      }

      // Create temporary attachment state
      const tempId = crypto.randomUUID();
      const tempAttachment: AttachmentState = {
        metadata: {
          id: tempId,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          storage_path: '', // Will be set after upload
          uploaded_at: new Date().toISOString(),
        },
        progress: 0,
        status: 'pending',
      };

      // Add to state
      setAttachments((prev) => [...prev, tempAttachment]);

      // Update status to uploading
      setAttachments((prev) =>
        prev.map((att) => (att.metadata.id === tempId ? { ...att, status: 'uploading' as const } : att))
      );

      try {
        // Create FormData
        const formData = new FormData();
        formData.append('file', file);
        formData.append('message_id', messageId);

        // Upload via API
        const response = await fetch('/api/attachments/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Upload failed');
        }

        const data = await response.json();

        if (!data.success || !data.attachment) {
          throw new Error('Upload failed');
        }

        // Update state with successful upload
        setAttachments((prev) =>
          prev.map((att) =>
            att.metadata.id === tempId
              ? {
                  ...att,
                  metadata: data.attachment,
                  progress: 100,
                  status: 'completed' as const,
                }
              : att
          )
        );

        // Call success callback
        onUploadComplete?.(data.attachment);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';

        // Update state with error
        setAttachments((prev) =>
          prev.map((att) =>
            att.metadata.id === tempId
              ? {
                  ...att,
                  status: 'error' as const,
                  error: errorMessage,
                }
              : att
          )
        );

        // Call error callback
        onUploadError?.(errorMessage);

        throw err;
      }
    },
    [messageId, maxFileSize, maxAttachments, attachments.length, onUploadComplete, onUploadError]
  );

  /**
   * Upload multiple files
   */
  const uploadMultiple = useCallback(
    async (files: File[]): Promise<void> => {
      for (const file of files) {
        try {
          await upload(file);
        } catch (err) {
          // Continue uploading other files even if one fails
          console.error('Failed to upload file:', file.name, err);
        }
      }
    },
    [upload]
  );

  /**
   * Remove an attachment
   */
  const remove = useCallback((attachmentId: string) => {
    setAttachments((prev) => prev.filter((att) => att.metadata.id !== attachmentId));
  }, []);

  /**
   * Clear all attachments
   */
  const clear = useCallback(() => {
    setAttachments([]);
  }, []);

  /**
   * Get completed attachments (for sending email)
   */
  const getCompletedAttachments = useCallback((): AttachmentMetadata[] => {
    return attachments.filter((att) => att.status === 'completed').map((att) => att.metadata);
  }, [attachments]);

  /**
   * Check if any uploads are in progress
   */
  const isUploading = attachments.some((att) => att.status === 'uploading');

  /**
   * Check if any uploads have errors
   */
  const hasErrors = attachments.some((att) => att.status === 'error');

  /**
   * Get total size of all attachments
   */
  const totalSize = attachments.reduce((sum, att) => sum + att.metadata.size, 0);

  return {
    /** List of all attachments with state */
    attachments,
    /** Upload a single file */
    upload,
    /** Upload multiple files */
    uploadMultiple,
    /** Remove an attachment by ID */
    remove,
    /** Clear all attachments */
    clear,
    /** Get completed attachments (for sending) */
    getCompletedAttachments,
    /** Whether any upload is in progress */
    isUploading,
    /** Whether any upload has errors */
    hasErrors,
    /** Total size of all attachments in bytes */
    totalSize,
    /** Whether max attachments limit reached */
    isMaxAttachments: attachments.length >= maxAttachments,
  };
}
