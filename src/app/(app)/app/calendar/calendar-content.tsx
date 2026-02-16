/**
 * CalendarContent Component
 * Phase 6, Task 120: Client-side calendar view with event management
 * Phase 6, Task 131: Wires CalendarView → useCalendar (handled in EventForm)
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { EventForm } from '@/components/calendar/event-form';
import { EventList } from '@/components/calendar/event-list';
import { Plus, Calendar as CalendarIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { CalendarEvent, CalendarMetadata } from '@/lib/providers/types';

export function CalendarContent() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [calendars, setCalendars] = useState<CalendarMetadata[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Fetch user's email accounts
  useEffect(() => {
    async function fetchAccounts() {
      try {
        const response = await fetch('/api/accounts');
        if (!response.ok) throw new Error('Failed to fetch accounts');
        const data = await response.json();
        setAccounts(data.accounts || []);

        // Auto-select first account
        if (data.accounts && data.accounts.length > 0) {
          setSelectedAccountId(data.accounts[0].id);
        }
      } catch (error) {
        console.error('Error fetching accounts:', error);
        toast.error('Failed to load email accounts');
      } finally {
        setLoading(false);
      }
    }

    fetchAccounts();
  }, []);

  // Fetch calendars when account changes
  useEffect(() => {
    if (!selectedAccountId) return;

    async function fetchCalendars() {
      try {
        const response = await fetch(`/api/calendars?accountId=${selectedAccountId}`);
        if (!response.ok) throw new Error('Failed to fetch calendars');
        const data = await response.json();
        setCalendars(data.calendars || []);

        // Auto-select primary calendar
        const primary = data.calendars?.find((c: CalendarMetadata) => c.is_primary);
        if (primary) {
          setSelectedCalendarId(primary.id);
        } else if (data.calendars && data.calendars.length > 0) {
          setSelectedCalendarId(data.calendars[0].id);
        }
      } catch (error) {
        console.error('Error fetching calendars:', error);
        toast.error('Failed to load calendars');
      }
    }

    fetchCalendars();
  }, [selectedAccountId]);

  // Fetch events when calendar changes
  useEffect(() => {
    if (!selectedAccountId || !selectedCalendarId) return;

    async function fetchEvents() {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/calendars/events?accountId=${selectedAccountId}&calendarId=${selectedCalendarId}`
        );
        if (!response.ok) throw new Error('Failed to fetch events');
        const data = await response.json();
        setEvents(data.events || []);
      } catch (error) {
        console.error('Error fetching events:', error);
        toast.error('Failed to load events');
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, [selectedAccountId, selectedCalendarId]);

  const handleEventCreated = (event: CalendarEvent) => {
    setEvents((prev) => [...prev, event]);
    setShowCreateDialog(false);
  };

  const handleEventUpdated = (event: CalendarEvent) => {
    setEvents((prev) => prev.map((e) => (e.id === event.id ? event : e)));
    setSelectedEvent(null);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  if (!accounts || accounts.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-800">
        <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
          No email accounts connected
        </h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Connect an email account to access your calendar
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Account & Calendar Selector + Create Button */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Account Selector */}
          <div className="w-full sm:w-48">
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Calendar Selector */}
          <div className="w-full sm:w-48">
            <Select value={selectedCalendarId} onValueChange={setSelectedCalendarId}>
              <SelectTrigger>
                <SelectValue placeholder="Select calendar" />
              </SelectTrigger>
              <SelectContent>
                {calendars.map((calendar) => (
                  <SelectItem key={calendar.id} value={calendar.id}>
                    {calendar.name}
                    {calendar.is_primary && ' (Primary)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Create Event Button */}
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Event
        </Button>
      </div>

      {/* Event List */}
      {selectedCalendarId && (
        <EventList events={events} loading={loading} onEventClick={handleEventClick} />
      )}

      {/* Create Event Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Event</DialogTitle>
            <DialogDescription>
              Add a new event to your calendar
            </DialogDescription>
          </DialogHeader>
          <EventForm
            accountId={selectedAccountId}
            calendarId={selectedCalendarId}
            onSuccess={handleEventCreated}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>
              Update event details
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <EventForm
              accountId={selectedAccountId}
              calendarId={selectedCalendarId}
              event={selectedEvent}
              onSuccess={handleEventUpdated}
              onCancel={() => setSelectedEvent(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
