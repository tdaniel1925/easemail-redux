'use client';

/**
 * AttachmentList Component
 *
 * Displays list of attachments with previews, progress, and remove buttons
 */

import { X, File, FileText, Image, FileArchive, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AttachmentState } from '@/types/attachment';
import { cn } from '@/lib/utils';

interface AttachmentListProps {
  /** List of attachments with state */
  attachments: AttachmentState[];
  /** Callback when remove button clicked */
  onRemove: (attachmentId: string) => void;
  /** Whether to show remove buttons */
  showRemove?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Get icon for file type
 */
function getFileIcon(type: string) {
  if (type.startsWith('image/')) return Image;
  if (type.startsWith('text/') || type.includes('pdf')) return FileText;
  if (type.includes('zip') || type.includes('tar') || type.includes('rar')) return FileArchive;
  return File;
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function AttachmentList({
  attachments,
  onRemove,
  showRemove = true,
  className,
}: AttachmentListProps) {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)}>
      {attachments.map((attachment) => {
        const Icon = getFileIcon(attachment.metadata.type);
        const isError = attachment.status === 'error';
        const isUploading = attachment.status === 'uploading';
        const isCompleted = attachment.status === 'completed';

        return (
          <div
            key={attachment.metadata.id}
            className={cn(
              'flex items-center gap-3 rounded-lg border p-3 transition-colors',
              isError && 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950',
              !isError && 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
            )}
          >
            {/* File icon */}
            <div
              className={cn(
                'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md',
                isError && 'bg-red-100 dark:bg-red-900',
                !isError && 'bg-gray-100 dark:bg-gray-700'
              )}
            >
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              ) : isError ? (
                <AlertCircle className="h-5 w-5 text-red-500" />
              ) : (
                <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              )}
            </div>

            {/* File info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'truncate text-sm font-medium',
                      isError && 'text-red-900 dark:text-red-100',
                      !isError && 'text-gray-900 dark:text-gray-100'
                    )}
                    title={attachment.metadata.name}
                  >
                    {attachment.metadata.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(attachment.metadata.size)}
                  </p>
                </div>

                {/* Remove button */}
                {showRemove && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(attachment.metadata.id)}
                    className="h-6 w-6 flex-shrink-0 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
                    title="Remove attachment"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Progress bar (for uploading) */}
              {isUploading && (
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${attachment.progress}%` }}
                  />
                </div>
              )}

              {/* Error message */}
              {isError && attachment.error && (
                <p className="mt-1 text-xs text-red-700 dark:text-red-300">{attachment.error}</p>
              )}

              {/* Success indicator */}
              {isCompleted && (
                <p className="mt-1 text-xs text-green-600 dark:text-green-400">Uploaded successfully</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
