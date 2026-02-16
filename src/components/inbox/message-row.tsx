'use client';

import { useRouter } from 'next/navigation';
import { Star, Paperclip, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message } from '@/types/message';
import { Badge } from '@/components/ui/badge';

interface MessageRowProps {
  message: Message;
  isPriority?: boolean;
  threadCount?: number;
}

export function MessageRow({ message, isPriority, threadCount }: MessageRowProps) {
  const router = useRouter();

  function handleClick() {
    router.push(`/app/inbox/${message.id}`);
  }

  function formatDate(isoString: string): string {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) {
      // Today - show time
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
    } else if (diffDays < 7) {
      // Last 7 days - show day name
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      // Older - show date
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'group flex w-full items-start gap-3 rounded-lg border-l-4 px-4 py-3 text-left transition-colors hover:bg-accent',
        isPriority
          ? 'border-l-[#FF7F50]' // coral accent for priority
          : 'border-l-transparent',
        message.is_unread ? 'bg-primary/5' : 'bg-background'
      )}
    >
      {/* Star icon */}
      <div className="flex-shrink-0 pt-0.5">
        <Star
          className={cn(
            'h-4 w-4 transition-colors',
            message.is_starred
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-muted-foreground group-hover:text-foreground'
          )}
        />
      </div>

      {/* Message content */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {/* From */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'truncate text-sm',
              message.is_unread ? 'font-semibold' : 'font-normal'
            )}
          >
            {message.from_name || message.from_email}
          </span>
          {message.has_attachments && (
            <Paperclip className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
          )}
        </div>

        {/* Subject */}
        <div className="flex items-center gap-2">
          <p
            className={cn(
              'truncate text-sm',
              message.is_unread ? 'font-medium' : 'text-muted-foreground'
            )}
          >
            {message.subject || '(no subject)'}
          </p>
          {threadCount && threadCount > 1 && (
            <span className="flex-shrink-0 text-xs text-muted-foreground">
              ({threadCount})
            </span>
          )}
          {/* Read receipt badge */}
          {message.read_receipt_enabled && (
            <Badge
              variant={message.read_receipt_opened_at ? 'default' : 'outline'}
              className="flex-shrink-0 text-xs gap-1"
            >
              {message.read_receipt_opened_at ? (
                <>
                  <Eye className="h-3 w-3" />
                  Read
                </>
              ) : (
                <>
                  <EyeOff className="h-3 w-3" />
                  Not Read
                </>
              )}
            </Badge>
          )}
        </div>

        {/* Snippet */}
        <p className="truncate text-xs text-muted-foreground">
          {message.snippet}
        </p>
      </div>

      {/* Date */}
      <div className="flex-shrink-0 pt-0.5">
        <span className="text-xs text-muted-foreground">
          {formatDate(message.message_date)}
        </span>
      </div>
    </button>
  );
}
