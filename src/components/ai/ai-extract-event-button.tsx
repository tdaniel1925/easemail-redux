'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EventForm } from '@/components/calendar/event-form';
import { CalendarPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAccount } from '@/hooks/use-account';
import type { CalendarEvent, CalendarMetadata } from '@/lib/providers/types';

interface EventDetails {
  title: string | null;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  attendees: Array<{ email: string; name: string }> | null;
  description: string | null;
}

interface AIExtractEventButtonProps {
  emailBody: string;
  emailSubject: string;
  fromEmail: string;
  onEventCreated?: () => void;
}

export function AIExtractEventButton({
  emailBody,
  emailSubject,
  fromEmail,
  onEventCreated,
}: AIExtractEventButtonProps) {
  const { selectedAccountId } = useAccount();
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);
  const [calendars, setCalendars] = useState<CalendarMetadata[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('');

  // Fetch calendars when account is selected
  useEffect(() => {
    if (selectedAccountId) {
      fetchCalendars();
    }
  }, [selectedAccountId]);

  const fetchCalendars = async () => {
    if (!selectedAccountId) return;

    try {
      const response = await fetch(`/api/calendars?accountId=${selectedAccountId}`);
      if (!response.ok) return;

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
    }
  };

  const handleExtract = async () => {
    setLoading(true);
    setEventDetails(null);

    try {
      const response = await fetch('/api/ai/extract-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_body: emailBody,
          email_subject: emailSubject,
          from_email: fromEmail,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to extract event');
      }

      const data = await response.json();
      setEventDetails(data);
      setDialogOpen(true);
    } catch (error) {
      console.error('Extract event error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to extract event details');
    } finally {
      setLoading(false);
    }
  };

  const handleEventCreated = (event: CalendarEvent) => {
    toast.success('Calendar event created successfully!');
    setDialogOpen(false);
    setEventDetails(null);
    onEventCreated?.();
  };

  // Transform extracted event details to EventForm initialData format
  const getInitialData = (): Partial<{
    title: string;
    description: string;
    location: string;
    start_time: string;
    end_time: string;
    all_day: boolean;
    timezone: string;
    attendees: string;
    is_online_meeting: boolean;
  }> | undefined => {
    if (!eventDetails) return undefined;

    // Combine date and time into ISO datetime strings
    const combineDateTime = (date: string | null, time: string | null): string => {
      if (!date) return new Date().toISOString();

      if (time) {
        // Combine date (YYYY-MM-DD) with time (HH:MM)
        return new Date(`${date}T${time}:00`).toISOString();
      }

      // Default to 9:00 AM if no time provided
      return new Date(`${date}T09:00:00`).toISOString();
    };

    const start_time = combineDateTime(eventDetails.date, eventDetails.start_time);
    const end_time = combineDateTime(
      eventDetails.date,
      eventDetails.end_time || (eventDetails.start_time ?
        `${parseInt(eventDetails.start_time.split(':')[0]) + 1}:${eventDetails.start_time.split(':')[1]}` :
        null)
    );

    return {
      title: eventDetails.title || emailSubject,
      description: eventDetails.description || '',
      location: eventDetails.location || '',
      start_time,
      end_time,
      attendees: eventDetails.attendees?.map(a => a.email).join(', ') || '',
      timezone: 'UTC',
      all_day: false,
      is_online_meeting: false,
    };
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleExtract}
        disabled={loading}
        title="Extract calendar event"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CalendarPlus className="h-4 w-4" />
        )}
        <span className="ml-2">Create Event</span>
      </Button>

      {eventDetails && selectedAccountId && selectedCalendarId && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Calendar Event</DialogTitle>
              <DialogDescription>
                Review and edit the AI-extracted event details
              </DialogDescription>
            </DialogHeader>

            <EventForm
              accountId={selectedAccountId}
              calendarId={selectedCalendarId}
              initialData={getInitialData()}
              onSuccess={handleEventCreated}
              onCancel={() => setDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {eventDetails && (!selectedAccountId || !selectedCalendarId) && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Calendar Not Available</DialogTitle>
              <DialogDescription>
                Please connect an email account and ensure you have calendar access to create events.
              </DialogDescription>
            </DialogHeader>
            <Button onClick={() => setDialogOpen(false)}>Close</Button>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
