'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { Event } from '@/types/events';

function formatDistanceToNow(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

interface ActivityFeedProps {
  events: Event[];
  limit?: number;
}

const eventTypeLabels: Record<string, string> = {
  'user.created': 'User Created',
  'user.login': 'User Login',
  'user.logout': 'User Logout',
  'user.profile_updated': 'Profile Updated',
  'org.created': 'Organization Created',
  'org.updated': 'Organization Updated',
  'org.member_added': 'Member Added',
  'org.member_removed': 'Member Removed',
  'message.sent': 'Email Sent',
  'message.received': 'Email Received',
  'message.read': 'Email Read',
  'message.starred': 'Email Starred',
  'message.deleted': 'Email Deleted',
  'draft.created': 'Draft Created',
  'draft.updated': 'Draft Updated',
  'draft.auto_saved': 'Draft Auto-Saved',
  'contact.created': 'Contact Created',
  'contact.updated': 'Contact Updated',
  'invite.created': 'Invite Sent',
  'invite.accepted': 'Invite Accepted',
};

const eventTypeColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  'user.created': 'default',
  'user.login': 'default',
  'user.logout': 'secondary',
  'org.created': 'default',
  'org.member_added': 'default',
  'org.member_removed': 'destructive',
  'message.sent': 'default',
  'message.received': 'default',
  'message.deleted': 'destructive',
  'draft.created': 'default',
  'contact.created': 'default',
  'invite.created': 'default',
  'invite.accepted': 'default',
};

function getEventDescription(event: Event): string {
  const payload = event.payload as any;

  switch (event.event_type) {
    case 'user.created':
      return `New user: ${payload.email}`;
    case 'user.login':
      return `Logged in: ${payload.email}`;
    case 'org.created':
      return `Created organization: ${payload.name}`;
    case 'org.member_added':
      return `Added member: ${payload.user_email}`;
    case 'org.member_removed':
      return `Removed member: ${payload.user_email}`;
    case 'message.sent':
      return `Sent email: ${payload.subject || '(no subject)'}`;
    case 'message.received':
      return `Received email from ${payload.from_email}`;
    case 'message.read':
      return `Read email: ${payload.subject || '(no subject)'}`;
    case 'message.starred':
      return `Starred email: ${payload.subject || '(no subject)'}`;
    case 'message.deleted':
      return `Deleted email: ${payload.subject || '(no subject)'}`;
    case 'draft.created':
      return `Created draft: ${payload.subject || '(no subject)'}`;
    case 'draft.auto_saved':
      return `Auto-saved draft: ${payload.subject || '(no subject)'}`;
    case 'contact.created':
      return `Added contact: ${payload.name || payload.email}`;
    case 'contact.updated':
      return `Updated contact: ${payload.name || payload.email}`;
    case 'invite.created':
      return `Invited: ${payload.email}`;
    case 'invite.accepted':
      return `Accepted invite: ${payload.email}`;
    default:
      return event.event_type;
  }
}

export function ActivityFeed({ events, limit = 50 }: ActivityFeedProps) {
  const displayedEvents = events.slice(0, limit);

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Feed</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <div className="space-y-4">
            {displayedEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={eventTypeColors[event.event_type] || 'default'}>
                      {eventTypeLabels[event.event_type] || event.event_type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(event.created_at))}
                    </span>
                  </div>
                  <p className="text-sm">{getEventDescription(event)}</p>
                  {event.entity_type && (
                    <p className="text-xs text-muted-foreground">
                      Entity: {event.entity_type}
                      {event.entity_id && ` • ID: ${event.entity_id.slice(0, 8)}...`}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
