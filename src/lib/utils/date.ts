// Date formatting utilities
// Phase 1, Task 8

/**
 * Formats a date as a relative time string (e.g., "2 hours ago", "Yesterday", "Jan 15")
 * @param date - Date string or Date object
 * @returns Formatted date string
 */
export function formatEmailDate(date: string | Date): string {
  const now = new Date();
  const inputDate = typeof date === 'string' ? new Date(date) : date;

  // Invalid date check
  if (isNaN(inputDate.getTime())) {
    return 'Invalid date';
  }

  const diffMs = now.getTime() - inputDate.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  // Less than 1 minute ago
  if (diffSeconds < 60) {
    return 'Just now';
  }

  // Less than 1 hour ago
  if (diffMinutes < 60) {
    return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
  }

  // Less than 24 hours ago
  if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  }

  // Yesterday
  if (diffDays === 1) {
    return 'Yesterday';
  }

  // Less than 7 days ago
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  // Same year - show month and day
  if (inputDate.getFullYear() === now.getFullYear()) {
    return inputDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

  // Different year - show month, day, and year
  return inputDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Formats a date as a full datetime string
 * @param date - Date string or Date object
 * @returns Formatted datetime string (e.g., "Jan 15, 2024 at 3:45 PM")
 */
export function formatFullDateTime(date: string | Date): string {
  const inputDate = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(inputDate.getTime())) {
    return 'Invalid date';
  }

  return inputDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
