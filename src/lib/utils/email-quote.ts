/**
 * Email Quoting Utilities
 * Formats quoted text for email replies
 */

/**
 * Quotes an email body for replies (plain text)
 * Prefixes each line with "> " according to email conventions
 *
 * @param body - The original email body (plain text)
 * @returns Quoted text with "> " prefix on each line
 *
 * @example
 * quoteEmailBody("Hello\nHow are you?")
 * // Returns: "> Hello\n> How are you?"
 */
export function quoteEmailBody(body: string): string {
  if (!body) return '';

  // Split into lines, prefix each with "> ", rejoin
  return body
    .split('\n')
    .map(line => `> ${line}`)
    .join('\n');
}

/**
 * Quotes an HTML email body for replies
 * Wraps the original HTML in a blockquote with styling
 *
 * @param bodyHtml - The original email body (HTML)
 * @param from - The sender's name or email
 * @param date - The date the original email was sent
 * @returns Quoted HTML with attribution header
 *
 * @example
 * quoteEmailBodyHtml("<p>Hello</p>", "John Doe", "2024-01-15")
 * // Returns HTML blockquote with original content
 */
export function quoteEmailBodyHtml(
  bodyHtml: string,
  from: string,
  date: string
): string {
  if (!bodyHtml) return '';

  // Format the date nicely
  const formattedDate = new Date(date).toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return `
<br/>
<br/>
<div style="border-left: 3px solid #ccc; padding-left: 12px; margin-left: 0; color: #666;">
  <div style="margin-bottom: 8px; font-size: 14px; color: #888;">
    On ${formattedDate}, ${from} wrote:
  </div>
  ${bodyHtml}
</div>
  `.trim();
}

/**
 * Builds a forward email body with attribution header
 *
 * @param bodyHtml - The original email body (HTML)
 * @param from - The sender's name or email
 * @param date - The date the original email was sent
 * @param subject - The subject of the original email
 * @param comment - Optional comment to prepend before forwarded content
 * @returns HTML with forward header and original content
 */
export function buildForwardBody(
  bodyHtml: string,
  from: string,
  date: string,
  subject: string,
  comment?: string
): string {
  const formattedDate = new Date(date).toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  let content = '';

  if (comment) {
    content += `<p>${comment}</p><br/>`;
  }

  content += `
<br/>
<div style="border-top: 1px solid #ccc; padding-top: 12px; margin-top: 12px; color: #666;">
  <div style="margin-bottom: 8px; font-weight: bold;">---------- Forwarded message ----------</div>
  <div style="margin-bottom: 4px;"><strong>From:</strong> ${from}</div>
  <div style="margin-bottom: 4px;"><strong>Date:</strong> ${formattedDate}</div>
  <div style="margin-bottom: 12px;"><strong>Subject:</strong> ${subject}</div>
  <div>${bodyHtml}</div>
</div>
  `.trim();

  return content;
}
