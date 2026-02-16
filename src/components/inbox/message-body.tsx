// MessageBody component - renders sanitized HTML email body
// Phase 1, Task 12
// Phase 4, Task 77: Added attachment download support

'use client';

import DOMPurify from 'isomorphic-dompurify';
import { Download, File, FileText, Image, FileArchive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Message } from '@/types/message';
import type { AttachmentMetadata } from '@/types/attachment';

interface MessageBodyProps {
  message: Message;
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

/**
 * Download attachment
 */
async function handleDownloadAttachment(attachment: AttachmentMetadata) {
  try {
    const url = `/api/attachments/download/${attachment.id}?path=${encodeURIComponent(attachment.storage_path)}&name=${encodeURIComponent(attachment.name)}`;
    window.open(url, '_blank');
  } catch (error) {
    console.error('Failed to download attachment:', error);
  }
}

export function MessageBody({ message }: MessageBodyProps) {
  // Sanitize HTML to prevent XSS attacks
  const sanitizedHtml = message.body_html
    ? DOMPurify.sanitize(message.body_html, {
        ALLOWED_TAGS: [
          'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'ul', 'ol', 'li', 'a', 'img', 'div', 'span', 'blockquote', 'code', 'pre',
          'table', 'thead', 'tbody', 'tr', 'th', 'td',
        ],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style'],
        ALLOW_DATA_ATTR: false,
      })
    : null;

  // Plain text fallback
  const plainTextBody = message.body_text || message.snippet || '';

  // Parse attachments from JSON
  const attachments: AttachmentMetadata[] = message.attachments
    ? Array.isArray(message.attachments)
      ? (message.attachments as unknown as AttachmentMetadata[])
      : []
    : [];

  return (
    <div className="py-6">
      {sanitizedHtml ? (
        <div
          className="prose prose-sm max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      ) : (
        <div className="whitespace-pre-wrap text-sm">{plainTextBody}</div>
      )}

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="mt-6 space-y-2 border-t pt-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Attachments ({attachments.length})
          </h3>
          <div className="space-y-2">
            {attachments.map((attachment) => {
              const Icon = getFileIcon(attachment.type);
              return (
                <div
                  key={attachment.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-750"
                >
                  {/* File icon */}
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-700">
                    <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </div>

                  {/* File info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100" title={attachment.name}>
                      {attachment.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(attachment.size)}
                    </p>
                  </div>

                  {/* Download button */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadAttachment(attachment)}
                    className="gap-2 flex-shrink-0"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
