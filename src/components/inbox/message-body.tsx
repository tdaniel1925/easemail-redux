// MessageBody component - renders sanitized HTML email body
// Phase 1, Task 12

'use client';

import DOMPurify from 'isomorphic-dompurify';
import type { Message } from '@/types/message';

interface MessageBodyProps {
  message: Message;
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
    </div>
  );
}
