/**
 * Email Header Utilities
 * RFC 2822 compliant email header construction for threading
 */

export interface EmailHeaders {
  'In-Reply-To'?: string;
  References?: string;
  Subject?: string;
}

/**
 * Builds reply headers for email threading
 * Constructs In-Reply-To and References headers according to RFC 2822
 *
 * @param originalMessageId - The Message-ID of the email being replied to
 * @param originalReferences - The References header from the original email (if any)
 * @returns Email headers object with In-Reply-To and References
 *
 * @example
 * const headers = buildReplyHeaders('<abc@example.com>', '<xyz@example.com>');
 * // Result: {
 * //   'In-Reply-To': '<abc@example.com>',
 * //   'References': '<xyz@example.com> <abc@example.com>'
 * // }
 */
export function buildReplyHeaders(
  originalMessageId: string,
  originalReferences?: string | null
): EmailHeaders {
  const headers: EmailHeaders = {};

  // In-Reply-To contains the Message-ID of the message being replied to
  headers['In-Reply-To'] = originalMessageId;

  // References contains all message IDs in the thread
  // Format: <oldest> <second> ... <parent>
  if (originalReferences) {
    // Append the original message ID to the existing references
    headers.References = `${originalReferences} ${originalMessageId}`;
  } else {
    // Start a new references chain with just the original message
    headers.References = originalMessageId;
  }

  return headers;
}

/**
 * Builds forward subject line with "Fwd:" prefix
 * Avoids duplicate "Fwd:" prefixes
 *
 * @param originalSubject - The subject line of the email being forwarded
 * @returns Subject line with "Fwd:" prefix
 */
export function buildForwardSubject(originalSubject: string): string {
  if (originalSubject.startsWith('Fwd:') || originalSubject.startsWith('FW:')) {
    return originalSubject;
  }
  return `Fwd: ${originalSubject}`;
}

/**
 * Builds reply subject line with "Re:" prefix
 * Avoids duplicate "Re:" prefixes
 *
 * @param originalSubject - The subject line of the email being replied to
 * @returns Subject line with "Re:" prefix
 */
export function buildReplySubject(originalSubject: string): string {
  if (originalSubject.startsWith('Re:') || originalSubject.startsWith('RE:')) {
    return originalSubject;
  }
  return `Re: ${originalSubject}`;
}
