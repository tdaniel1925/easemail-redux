// MessageHeader component - displays sender, date, and subject
// Phase 1, Task 11

'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatFullDateTime } from '@/lib/utils/date';
import type { Message } from '@/types/message';

interface MessageHeaderProps {
  message: Message;
}

export function MessageHeader({ message }: MessageHeaderProps) {
  // Get initials from sender name or email
  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const initials = getInitials(message.from_name, message.from_email);

  return (
    <div className="border-b pb-4">
      <h1 className="mb-4 text-2xl font-semibold">
        {message.subject || '(no subject)'}
      </h1>

      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary/10 text-sm">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {message.from_name || message.from_email}
            </span>
          </div>

          <div className="mt-0.5 text-sm text-muted-foreground">
            <span>to me</span>
          </div>
        </div>

        <div className="flex-shrink-0 text-sm text-muted-foreground">
          {formatFullDateTime(message.message_date)}
        </div>
      </div>
    </div>
  );
}
