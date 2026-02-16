// MessageActions component - reply, archive, trash, etc.
// Phase 2: Reply/Forward handlers implemented
// Phase 6: Print and block sender buttons added (Tasks 125, 127)
// Phase 6: AI extract event button added (Task 123)

'use client';

import { Button } from '@/components/ui/button';
import { Reply, ReplyAll, Forward, Archive, Trash2, Star, Clock, Printer, Ban } from 'lucide-react';
import { AIExtractEventButton } from '@/components/ai/ai-extract-event-button';
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
    // Archive clicked - to be implemented in future phase
  };

  const handleTrash = () => {
    // Trash clicked - to be implemented in future phase
  };

  const handleStar = () => {
    // Star clicked - to be implemented in future phase
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-b pb-4">
      <Button
        variant="outline"
        size="sm"
        onClick={handleReply}
        className="gap-2 min-h-[44px]"
      >
        <Reply className="h-4 w-4" />
        <span className="hidden sm:inline">Reply</span>
        <span className="sm:hidden">Reply</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleReplyAll}
        className="gap-2 min-h-[44px]"
      >
        <ReplyAll className="h-4 w-4" />
        <span className="hidden sm:inline">Reply All</span>
        <span className="sm:hidden">All</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleForward}
        className="gap-2 min-h-[44px]"
      >
        <Forward className="h-4 w-4" />
        <span className="hidden sm:inline">Forward</span>
        <span className="sm:hidden">Fwd</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleSnooze}
        className="gap-2 min-h-[44px]"
      >
        <Clock className="h-4 w-4" />
        <span className="hidden sm:inline">Snooze</span>
        <span className="sm:hidden sr-only">Snooze</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handlePrint}
        className="gap-2 min-h-[44px]"
        title="Print email"
      >
        <Printer className="h-4 w-4" />
        <span className="hidden sm:inline">Print</span>
        <span className="sm:hidden sr-only">Print</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleBlockSender}
        className="gap-2 min-h-[44px]"
        title="Block sender"
      >
        <Ban className="h-4 w-4" />
        <span className="hidden sm:inline">Block</span>
        <span className="sm:hidden sr-only">Block</span>
      </Button>

      {/* Phase 6, Task 123: AI Extract Event */}
      <AIExtractEventButton
        emailBody={message.body_html || message.body_text || ''}
        emailSubject={message.subject || ''}
        fromEmail={message.from_email}
      />

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
