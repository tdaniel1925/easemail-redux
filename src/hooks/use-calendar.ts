/**
 * useCalendar Hook
 * Phase 6, Task 118: Calendar event management hook
 */

'use client';

import { useState } from 'react';
import type { CalendarEvent } from '@/lib/providers/types';

interface CreateEventData {
  accountId: string;
  calendarId: string;
  title: string;
  description?: string | null;
  location?: string | null;
  start_time: string;
  end_time: string;
  all_day?: boolean;
  timezone?: string;
  attendees?: { email: string; name?: string | null }[];
  is_online_meeting?: boolean;
  reminders?: { minutes_before: number; method: string }[];
}

interface UpdateEventData {
  accountId: string;
  calendarId: string;
  eventId: string;
  title?: string;
  description?: string | null;
  location?: string | null;
  start_time?: string;
  end_time?: string;
  all_day?: boolean;
  timezone?: string;
  attendees?: { email: string; name?: string | null }[];
  status?: 'confirmed' | 'tentative' | 'cancelled';
}

export function useCalendar() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Create a new calendar event
   */
  const createEvent = async (data: CreateEventData): Promise<CalendarEvent | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/calendar/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create event');
      }

      const result = await response.json();
      return result.event;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create event';
      setError(errorMessage);
      console.error('Error creating event:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update an existing calendar event
   */
  const updateEvent = async (data: UpdateEventData): Promise<CalendarEvent | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/calendar/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update event');
      }

      const result = await response.json();
      return result.event;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update event';
      setError(errorMessage);
      console.error('Error updating event:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cancel a calendar event
   */
  const cancelEvent = async (
    accountId: string,
    calendarId: string,
    eventId: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/calendar/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId,
          calendarId,
          eventId,
          status: 'cancelled',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel event');
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel event';
      setError(errorMessage);
      console.error('Error cancelling event:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    createEvent,
    updateEvent,
    cancelEvent,
    loading,
    error,
  };
}
