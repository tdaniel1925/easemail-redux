/**
 * Print View Page
 * Phase 6, Task 124: Print-friendly email view
 */

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DOMPurify from 'isomorphic-dompurify';

interface PrintViewProps {
  params: Promise<{ messageId: string }>;
}

export default async function PrintView({ params }: PrintViewProps) {
  const { messageId } = await params;
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/signin');
  }

  // Fetch message
  const { data: message, error } = await supabase
    .from('messages')
    .select('*')
    .eq('id', messageId)
    .single();

  if (error || !message) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-600">Message not found</h1>
      </div>
    );
  }

  // Sanitize HTML
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

  const plainTextBody = message.body_text || message.snippet || '';

  return (
    <div className="print-container mx-auto max-w-4xl bg-white p-8">
      {/* Header */}
      <div className="border-b-2 border-gray-300 pb-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{message.subject || '(No Subject)'}</h1>
      </div>

      {/* Metadata */}
      <div className="mb-6 space-y-2 text-sm">
        <div className="flex">
          <span className="w-24 font-semibold text-gray-700">From:</span>
          <span className="text-gray-900">
            {message.from_name ? `${message.from_name} <${message.from_email}>` : message.from_email}
          </span>
        </div>

        {message.to_recipients && Array.isArray(message.to_recipients) && (message.to_recipients as any[]).length > 0 && (
          <div className="flex">
            <span className="w-24 font-semibold text-gray-700">To:</span>
            <span className="text-gray-900">
              {(message.to_recipients as any[])
                .map((r: any) => (r.name ? `${r.name} <${r.email}>` : r.email))
                .join(', ')}
            </span>
          </div>
        )}

        {message.cc_recipients && Array.isArray(message.cc_recipients) && (message.cc_recipients as any[]).length > 0 && (
          <div className="flex">
            <span className="w-24 font-semibold text-gray-700">Cc:</span>
            <span className="text-gray-900">
              {(message.cc_recipients as any[])
                .map((r: any) => (r.name ? `${r.name} <${r.email}>` : r.email))
                .join(', ')}
            </span>
          </div>
        )}

        <div className="flex">
          <span className="w-24 font-semibold text-gray-700">Date:</span>
          <span className="text-gray-900">
            {new Date(message.message_date).toLocaleString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="border-t border-gray-200 pt-6">
        {sanitizedHtml ? (
          <div
            className="prose prose-sm max-w-none print-content"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        ) : (
          <div className="whitespace-pre-wrap text-sm text-gray-900">{plainTextBody}</div>
        )}
      </div>

      {/* Auto-trigger print dialog */}
      <script dangerouslySetInnerHTML={{
        __html: `
          window.addEventListener('load', function() {
            setTimeout(function() {
              window.print();
            }, 500);
          });
        `
      }} />
    </div>
  );
}
