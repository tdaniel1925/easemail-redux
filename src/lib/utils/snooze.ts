/**
 * Snooze Utility
 * Provides preset snooze times for email snoozing
 */

export interface SnoozePreset {
  label: string;
  value: string; // 'later_today' | 'tomorrow' | 'next_week' | 'custom'
  getDate: () => Date;
  description: string;
}

/**
 * Get snooze time presets
 * Returns common snooze options with calculated dates
 */
export function snoozeTimePresets(): SnoozePreset[] {
  const now = new Date();

  return [
    {
      label: 'Later today',
      value: 'later_today',
      description: '4 hours from now',
      getDate: () => {
        const date = new Date(now);
        date.setHours(now.getHours() + 4);
        return date;
      },
    },
    {
      label: 'Tomorrow',
      value: 'tomorrow',
      description: '9:00 AM tomorrow',
      getDate: () => {
        const date = new Date(now);
        date.setDate(now.getDate() + 1);
        date.setHours(9, 0, 0, 0);
        return date;
      },
    },
    {
      label: 'Next week',
      value: 'next_week',
      description: '9:00 AM next Monday',
      getDate: () => {
        const date = new Date(now);
        const currentDay = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const daysUntilMonday = currentDay === 0 ? 1 : 8 - currentDay; // If Sunday, 1 day; else days to next Monday
        date.setDate(now.getDate() + daysUntilMonday);
        date.setHours(9, 0, 0, 0);
        return date;
      },
    },
    {
      label: 'Custom',
      value: 'custom',
      description: 'Pick a date and time',
      getDate: () => {
        // Placeholder - will be replaced by user-selected date
        const date = new Date(now);
        date.setHours(now.getHours() + 1);
        return date;
      },
    },
  ];
}

/**
 * Format snooze time for display
 * @param date - The snooze until date
 * @returns Formatted string like "Tomorrow at 9:00 AM"
 */
export function formatSnoozeTime(date: Date): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const isToday = date.toDateString() === now.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (isToday) {
    return `Today at ${timeStr}`;
  } else if (isTomorrow) {
    return `Tomorrow at ${timeStr}`;
  } else {
    const dateStr = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    return `${dateStr} at ${timeStr}`;
  }
}
