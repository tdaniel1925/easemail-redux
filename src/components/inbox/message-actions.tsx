// MessageActions component - reply, archive, trash, etc.
// Phase 2: Reply/Forward handlers implemented

'use client';

import { Button } from '@/components/ui/button';
import { Reply, ReplyAll, Forward, Archive, Trash2, Star } from 'lucide-react';
import type { Message } from '@/types/message';

interface MessageActionsProps {
  message: Message;
  onReply?: () => void;
  onReplyAll?: () => void;
  onForward?: () => void;
}

export function MessageActions({ message, onReply, onReplyAll, onForward }: MessageActionsProps) {
  // Phase 2: Reply/forward handlers
  const handleReply = () => {
    if (onReply) {
      onReply();
    }
  };

  const handleReplyAll = () => {
    if (onReplyAll) {
      onReplyAll();
    }
  };

  const handleForward = () => {
    if (onForward) {
      onForward();
    }
  };

  // Future phase handlers
  const handleArchive = () => {
    console.log('Archive clicked - to be implemented in future phase');
  };

  const handleTrash = () => {
    console.log('Trash clicked - to be implemented in future phase');
  };

  const handleStar = () => {
    console.log('Star clicked - to be implemented in future phase');
  };

  return (
    <div className="flex items-center gap-2 border-b pb-4">
      <Button
        variant="outline"
        size="sm"
        onClick={handleReply}
        className="gap-2"
      >
        <Reply className="h-4 w-4" />
        Reply
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleReplyAll}
        className="gap-2"
      >
        <ReplyAll className="h-4 w-4" />
        Reply All
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleForward}
        className="gap-2"
      >
        <Forward className="h-4 w-4" />
        Forward
      </Button>

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleStar}
          title="Star"
        >
          <Star
            className={message.is_starred ? 'h-4 w-4 fill-yellow-400 text-yellow-400' : 'h-4 w-4'}
          />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleArchive}
          title="Archive"
        >
          <Archive className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleTrash}
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
