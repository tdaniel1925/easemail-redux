/**
 * Message normalization utilities
 * Additional helpers for working with normalized messages
 */

import type { NormalizedMessage, FolderType } from './types';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(html: string | null): string | null {
  if (!html) return null;

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'code', 'pre',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'div', 'span', 'img',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style'],
  });
}

/**
 * Convert HTML to plain text
 */
export function htmlToPlainText(html: string | null): string | null {
  if (!html) return null;

  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}

/**
 * Create snippet from body text (first ~200 characters)
 */
export function createSnippet(bodyText: string | null, maxLength = 200): string | null {
  if (!bodyText) return null;

  const trimmed = bodyText.trim();
  if (trimmed.length <= maxLength) return trimmed;

  return trimmed.substring(0, maxLength).trim() + '...';
}

/**
 * Validate and clean email address
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Parse display name and email from string like "John Doe <john@example.com>"
 */
export function parseEmailAddress(str: string): { email: string; name: string | null } {
  const match = str.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return {
      name: match[1].trim(),
      email: match[2].trim(),
    };
  }
  return {
    name: null,
    email: str.trim(),
  };
}

/**
 * Format email address for display
 */
export function formatEmailAddress(email: string, name: string | null): string {
  if (name) {
    return `${name} <${email}>`;
  }
  return email;
}

/**
 * Deduplicate recipients by email address
 */
export function deduplicateRecipients(
  recipients: { email: string; name?: string | null }[]
): { email: string; name?: string | null }[] {
  const seen = new Set<string>();
  const unique: { email: string; name?: string | null }[] = [];

  for (const recipient of recipients) {
    const email = recipient.email.toLowerCase();
    if (!seen.has(email)) {
      seen.add(email);
      unique.push(recipient);
    }
  }

  return unique;
}

/**
 * Check if message matches folder type
 */
export function matchesFolderType(
  message: NormalizedMessage,
  folderType: FolderType
): boolean {
  return message.folder_type === folderType;
}

/**
 * Get total attachment size
 */
export function getTotalAttachmentSize(message: NormalizedMessage): number {
  return message.attachments.reduce((total, att) => total + att.size, 0);
}

/**
 * Format attachment size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}

/**
 * Check if message is recent (within last 24 hours)
 */
export function isRecentMessage(message: NormalizedMessage): boolean {
  const messageDate = new Date(message.message_date);
  const now = new Date();
  const diff = now.getTime() - messageDate.getTime();
  const hours = diff / (1000 * 60 * 60);
  return hours < 24;
}

/**
 * Get friendly time string
 */
export function formatMessageTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = diff / (1000 * 60 * 60);

  if (hours < 1) {
    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes}m ago`;
  }

  if (hours < 24) {
    return `${Math.floor(hours)}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }

  return date.toLocaleDateString();
}

/**
 * Extract all unique email addresses from a message
 */
export function extractAllEmails(message: NormalizedMessage): string[] {
  const emails = new Set<string>();

  emails.add(message.from_email);
  message.to_recipients.forEach((r) => emails.add(r.email));
  message.cc_recipients.forEach((r) => emails.add(r.email));
  message.bcc_recipients.forEach((r) => emails.add(r.email));
  message.reply_to.forEach((r) => emails.add(r.email));

  return Array.from(emails);
}
