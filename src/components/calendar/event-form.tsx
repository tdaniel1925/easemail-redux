/**
 * EventForm Component
 * Phase 6, Task 121: Create/edit calendar event form
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useCalendar } from '@/hooks/use-calendar';
import { Loader2, Calendar, Clock, MapPin, Users, Video } from 'lucide-react';
import { toast } from 'sonner';
import type { CalendarEvent } from '@/lib/providers/types';

interface EventFormProps {
  accountId: string;
  calendarId: string;
  event?: CalendarEvent | null; // For editing existing event
  initialData?: Partial<EventFormData>; // For AI-extracted data
  onSuccess?: (event: CalendarEvent) => void;
  onCancel?: () => void;
}

interface EventFormData {
  title: string;
  description: string;
  location: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  timezone: string;
  attendees: string; // Comma-separated emails
  is_online_meeting: boolean;
}

export function EventForm({
  accountId,
  calendarId,
  event,
  initialData,
  onSuccess,
  onCancel,
}: EventFormProps) {
  const { createEvent, updateEvent, loading, error } = useCalendar();

  // Initialize form data
  const [formData, setFormData] = useState<EventFormData>({
    title: event?.title || initialData?.title || '',
    description: event?.description || initialData?.description || '',
    location: event?.location || initialData?.location || '',
    start_time: event?.start_time || initialData?.start_time || '',
    end_time: event?.end_time || initialData?.end_time || '',
    all_day: event?.all_day || initialData?.all_day || false,
    timezone: event?.timezone || initialData?.timezone || 'UTC',
    attendees:
      event?.attendees?.map((a) => a.email).join(', ') ||
      initialData?.attendees ||
      '',
    is_online_meeting: event?.is_online_meeting || initialData?.is_online_meeting || false,
  });

  // Update form when initialData changes (e.g., AI extraction completes)
  useEffect(() => {
    if (initialData && !event) {
      setFormData((prev) => ({
        ...prev,
        ...initialData,
        attendees: initialData.attendees || prev.attendees,
      }));
    }
  }, [initialData, event]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.title) {
      toast.error('Please enter an event title');
      return;
    }

    if (!formData.start_time || !formData.end_time) {
      toast.error('Please enter start and end times');
      return;
    }

    // Parse attendees
    const attendees = formData.attendees
      .split(',')
      .map((email) => email.trim())
      .filter((email) => email.length > 0)
      .map((email) => ({ email }));

    if (event) {
      // Update existing event
      const updated = await updateEvent({
        accountId,
        calendarId,
        eventId: event.id,
        title: formData.title,
        description: formData.description || null,
        location: formData.location || null,
        start_time: formData.start_time,
        end_time: formData.end_time,
        all_day: formData.all_day,
        timezone: formData.timezone,
        attendees: attendees.length > 0 ? attendees : undefined,
      });

      if (updated) {
        toast.success('Event updated successfully');
        onSuccess?.(updated);
      }
    } else {
      // Create new event
      const created = await createEvent({
        accountId,
        calendarId,
        title: formData.title,
        description: formData.description || null,
        location: formData.location || null,
        start_time: formData.start_time,
        end_time: formData.end_time,
        all_day: formData.all_day,
        timezone: formData.timezone,
        attendees: attendees.length > 0 ? attendees : undefined,
        is_online_meeting: formData.is_online_meeting,
      });

      if (created) {
        toast.success('Event created successfully');
        onSuccess?.(created);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title" className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Event Title *
        </Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Team Meeting"
          required
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Discuss Q1 goals and objectives"
          rows={3}
        />
      </div>

      {/* Date & Time */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_time" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Start Time *
          </Label>
          <Input
            id="start_time"
            type="datetime-local"
            value={formData.start_time.slice(0, 16)}
            onChange={(e) =>
              setFormData({ ...formData, start_time: new Date(e.target.value).toISOString() })
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="end_time" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            End Time *
          </Label>
          <Input
            id="end_time"
            type="datetime-local"
            value={formData.end_time.slice(0, 16)}
            onChange={(e) =>
              setFormData({ ...formData, end_time: new Date(e.target.value).toISOString() })
            }
            required
          />
        </div>
      </div>

      {/* All Day */}
      <div className="flex items-center gap-2">
        <Switch
          id="all_day"
          checked={formData.all_day}
          onCheckedChange={(checked) => setFormData({ ...formData, all_day: checked })}
        />
        <Label htmlFor="all_day">All day event</Label>
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label htmlFor="location" className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Location
        </Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="Conference Room A"
        />
      </div>

      {/* Attendees */}
      <div className="space-y-2">
        <Label htmlFor="attendees" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Attendees
        </Label>
        <Input
          id="attendees"
          value={formData.attendees}
          onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
          placeholder="john@example.com, jane@example.com"
        />
        <p className="text-xs text-gray-500">Comma-separated email addresses</p>
      </div>

      {/* Online Meeting */}
      {!event && (
        <div className="flex items-center gap-2">
          <Switch
            id="is_online_meeting"
            checked={formData.is_online_meeting}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, is_online_meeting: checked })
            }
          />
          <Label htmlFor="is_online_meeting" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            Add online meeting link
          </Label>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {event ? 'Update Event' : 'Create Event'}
        </Button>

        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
