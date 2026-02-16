/**
 * EventList Component
 * Phase 6, Task 122: List calendar events
 */

'use client';

import { Calendar, Clock, MapPin, Users, Video, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CalendarEvent } from '@/lib/providers/types';

interface EventListProps {
  events: CalendarEvent[];
  loading?: boolean;
  onEventClick?: (event: CalendarEvent) => void;
}

/**
 * Format event time for display
 */
function formatEventTime(startTime: string, endTime: string, allDay: boolean): string {
  if (allDay) {
    return new Date(startTime).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  const startStr = start.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const endStr = end.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const dateStr = start.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return `${dateStr}, ${startStr} - ${endStr}`;
}

/**
 * Get status badge color
 */
function getStatusColor(status: CalendarEvent['status']) {
  switch (status) {
    case 'confirmed':
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
    case 'tentative':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
    case 'cancelled':
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
  }
}

export function EventList({ events, loading, onEventClick }: EventListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="animate-pulse space-y-2">
              <div className="h-5 w-3/4 rounded bg-gray-200 dark:bg-gray-700"></div>
              <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-800">
        <Calendar className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
          No events found
        </h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          No events scheduled for this period
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <button
          key={event.id}
          onClick={() => onEventClick?.(event)}
          className="w-full rounded-lg border border-gray-200 bg-white p-4 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-750"
        >
          {/* Title and Status */}
          <div className="flex items-start justify-between gap-3">
            <h3 className="flex-1 text-base font-semibold text-gray-900 dark:text-gray-100">
              {event.title}
              {event.status === 'cancelled' && (
                <span className="ml-2 text-sm line-through opacity-50">(Cancelled)</span>
              )}
            </h3>

            <span
              className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(event.status)}`}
            >
              {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
            </span>
          </div>

          {/* Time */}
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Clock className="h-4 w-4" />
            {formatEventTime(event.start_time, event.end_time, event.all_day)}
            {event.all_day && <span className="text-xs">(All day)</span>}
          </div>

          {/* Location */}
          {event.location && (
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <MapPin className="h-4 w-4" />
              {event.location}
            </div>
          )}

          {/* Online Meeting */}
          {event.is_online_meeting && event.meeting_url && (
            <div className="mt-2 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
              <Video className="h-4 w-4" />
              <a
                href={event.meeting_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Join meeting ({event.meeting_provider || 'online'})
              </a>
            </div>
          )}

          {/* Attendees */}
          {event.attendees && event.attendees.length > 0 && (
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Users className="h-4 w-4" />
              {event.attendees.length} attendee{event.attendees.length !== 1 && 's'}
            </div>
          )}

          {/* Description (truncated) */}
          {event.description && (
            <p className="mt-2 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
              {event.description}
            </p>
          )}
        </button>
      ))}
    </div>
  );
}
