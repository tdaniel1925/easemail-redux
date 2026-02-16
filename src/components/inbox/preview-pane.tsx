/**
 * Preview Pane Component
 * Displays email preview in a split-view layout
 */

'use client';

import { MessageHeader } from './message-header';
import { MessageBody } from './message-body';
import { MessageActions } from './message-actions';
import type { Message } from '@/types/message';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PreviewPaneProps {
  message: Message | null;
  onClose?: () => void;
  onReply?: (message: Message) => void;
  onReplyAll?: (message: Message) => void;
  onForward?: (message: Message) => void;
  onSnooze?: (message: Message) => void;
}

export function PreviewPane({
  message,
  onClose,
  onReply,
  onReplyAll,
  onForward,
  onSnooze,
}: PreviewPaneProps) {
  if (!message) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/30 border-l">
        <div className="text-center text-muted-foreground">
          <p className="text-sm">Select an email to preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background border-l">
      {/* Header with close button */}
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="text-sm font-medium">Preview</h3>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Actions bar */}
      <div className="p-3 border-b">
        <MessageActions
          message={message}
          onReply={onReply ? () => onReply(message) : undefined}
          onReplyAll={onReplyAll ? () => onReplyAll(message) : undefined}
          onForward={onForward ? () => onForward(message) : undefined}
          onSnooze={onSnooze ? () => onSnooze(message) : undefined}
        />
      </div>

      {/* Message content - scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        <MessageHeader message={message} />
        <div className="mt-4">
          <MessageBody message={message} />
        </div>
      </div>
    </div>
  );
}
