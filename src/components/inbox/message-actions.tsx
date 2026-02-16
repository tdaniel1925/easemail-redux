// MessageActions component - reply, archive, trash, etc.
// Phase 2: Reply/Forward handlers implemented
// Phase 6: Print and block sender buttons added (Tasks 125, 127)

'use client';

import { Button } from '@/components/ui/button';
import { Reply, ReplyAll, Forward, Archive, Trash2, Star, Clock, Printer, Ban } from 'lucide-react';
import type { Message } from '@/types/message';

interface MessageActionsProps {
  message: Message;
  onReply?: () => void;
  onReplyAll?: () => void;
  onForward?: () => void;
  onSnooze?: () => void;
  onPrint?: () => void;
  onBlockSender?: () => void;
}

export function MessageActions({ message, onReply, onReplyAll, onForward, onSnooze, onPrint, onBlockSender }: MessageActionsProps) {
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

  // Phase 5: Snooze handler
  const handleSnooze = () => {
    if (onSnooze) {
      onSnooze();
    }
  };

  // Phase 6: Print handler (Task 125, Task 132)
  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    }
  };

  // Phase 6: Block sender handler (Task 127, Task 133)
  const handleBlockSender = () => {
    if (onBlockSender) {
      onBlockSender();
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

      <Button
        variant="outline"
        size="sm"
        onClick={handleSnooze}
        className="gap-2"
      >
        <Clock className="h-4 w-4" />
        Snooze
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handlePrint}
        className="gap-2"
        title="Print email"
      >
        <Printer className="h-4 w-4" />
        Print
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleBlockSender}
        className="gap-2"
        title="Block sender"
      >
        <Ban className="h-4 w-4" />
        Block
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
