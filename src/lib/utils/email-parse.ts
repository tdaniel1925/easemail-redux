/**
 * Email Parsing Utilities
 * Phase 6, Task 128: Unsubscribe detector
 */

export interface UnsubscribeInfo {
  hasUnsubscribe: boolean;
  unsubscribeUrl: string | null;
  unsubscribeEmail: string | null;
  unsubscribeMethod: 'http' | 'mailto' | 'both' | null;
}

/**
 * Detect unsubscribe information from email headers and body
 * Implements RFC 2369 (List-Unsubscribe header) and RFC 8058 (One-Click Unsubscribe)
 *
 * @param headers - Raw email headers as key-value pairs
 * @param bodyHtml - HTML email body (optional, for fallback detection)
 * @returns UnsubscribeInfo object
 */
export function detectUnsubscribe(
  headers: Record<string, string>,
  bodyHtml?: string | null
): UnsubscribeInfo {
  // Check for List-Unsubscribe header (RFC 2369)
  const listUnsubscribe = headers['list-unsubscribe'] || headers['List-Unsubscribe'];

  if (listUnsubscribe) {
    // Parse List-Unsubscribe header
    // Format: <mailto:unsubscribe@example.com>, <https://example.com/unsubscribe?id=123>
    const urlMatch = listUnsubscribe.match(/<(https?:\/\/[^>]+)>/);
    const emailMatch = listUnsubscribe.match(/<mailto:([^>]+)>/);

    const unsubscribeUrl = urlMatch ? urlMatch[1] : null;
    const unsubscribeEmail = emailMatch ? emailMatch[1] : null;

    let method: 'http' | 'mailto' | 'both' | null = null;
    if (unsubscribeUrl && unsubscribeEmail) {
      method = 'both';
    } else if (unsubscribeUrl) {
      method = 'http';
    } else if (unsubscribeEmail) {
      method = 'mailto';
    }

    return {
      hasUnsubscribe: true,
      unsubscribeUrl,
      unsubscribeEmail,
      unsubscribeMethod: method,
    };
  }

  // Fallback: Search body HTML for common unsubscribe link patterns
  if (bodyHtml) {
    const commonPatterns = [
      /href="([^"]*unsubscribe[^"]*)"/i,
      /href="([^"]*opt-out[^"]*)"/i,
      /href="([^"]*remove[^"]*)"/i,
    ];

    for (const pattern of commonPatterns) {
      const match = bodyHtml.match(pattern);
      if (match && match[1]) {
        return {
          hasUnsubscribe: true,
          unsubscribeUrl: match[1],
          unsubscribeEmail: null,
          unsubscribeMethod: 'http',
        };
      }
    }
  }

  // No unsubscribe info found
  return {
    hasUnsubscribe: false,
    unsubscribeUrl: null,
    unsubscribeEmail: null,
    unsubscribeMethod: null,
  };
}

/**
 * Extract email headers from a raw email message
 * Useful for parsing provider responses that include headers
 *
 * @param rawHeaders - Array of header objects from provider (e.g., Gmail)
 * @returns Record of header name → value
 */
export function parseEmailHeaders(
  rawHeaders: Array<{ name: string; value: string }>
): Record<string, string> {
  const headers: Record<string, string> = {};

  for (const header of rawHeaders) {
    // Normalize header names to lowercase for easier lookup
    headers[header.name.toLowerCase()] = header.value;
  }

  return headers;
}

/**
 * Check if email is promotional/marketing based on headers
 * Used to show unsubscribe UI only for marketing emails
 *
 * @param headers - Email headers
 * @returns true if email appears to be promotional
 */
export function isPromotionalEmail(headers: Record<string, string>): boolean {
  // Check for List-Unsubscribe header (strong signal)
  if (headers['list-unsubscribe'] || headers['List-Unsubscribe']) {
    return true;
  }

  // Check for marketing-related headers
  const precedence = (headers['precedence'] || '').toLowerCase();
  const listId = headers['list-id'] || headers['List-ID'];
  const bulkPrecedence = headers['X-Precedence'] || headers['x-precedence'];

  if (precedence === 'bulk' || precedence === 'list') {
    return true;
  }

  if (listId) {
    return true;
  }

  if (bulkPrecedence && bulkPrecedence.toLowerCase() === 'bulk') {
    return true;
  }

  return false;
}
