'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CalendarPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);

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

  const handleCreateEvent = async () => {
    // TODO: Integrate with calendar creation API
    // For now, just show success
    toast.success('Event extraction complete. Calendar integration coming soon!');
    setDialogOpen(false);
    onEventCreated?.();
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

      {eventDetails && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Calendar Event</DialogTitle>
              <DialogDescription>
                Review and edit the extracted event details before creating
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Event Title</Label>
                <Input
                  id="title"
                  value={eventDetails.title || ''}
                  onChange={(e) =>
                    setEventDetails({ ...eventDetails, title: e.target.value })
                  }
                  placeholder="Meeting title"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={eventDetails.date || ''}
                    onChange={(e) =>
                      setEventDetails({ ...eventDetails, date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={eventDetails.location || ''}
                    onChange={(e) =>
                      setEventDetails({ ...eventDetails, location: e.target.value })
                    }
                    placeholder="Meeting location or URL"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_time">Start Time</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={eventDetails.start_time || ''}
                    onChange={(e) =>
                      setEventDetails({ ...eventDetails, start_time: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="end_time">End Time</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={eventDetails.end_time || ''}
                    onChange={(e) =>
                      setEventDetails({ ...eventDetails, end_time: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={eventDetails.description || ''}
                  onChange={(e) =>
                    setEventDetails({ ...eventDetails, description: e.target.value })
                  }
                  placeholder="Event description"
                  rows={3}
                />
              </div>

              {eventDetails.attendees && eventDetails.attendees.length > 0 && (
                <div>
                  <Label>Attendees</Label>
                  <div className="mt-2 space-y-1">
                    {eventDetails.attendees.map((attendee, idx) => (
                      <div key={idx} className="text-sm">
                        {attendee.name} ({attendee.email})
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleCreateEvent} className="flex-1">
                  Create Event
                </Button>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
