// MessageView component - Full email message display
// Phase 2: Reply/forward integrated

'use client';

import { useState } from 'react';
import { MessageHeader } from './message-header';
import { MessageBody } from './message-body';
import { MessageActions } from './message-actions';
import { ReplyComposer } from '@/components/email/reply-composer';
import { SnoozeDialog } from './snooze-dialog';
import { useSnooze } from '@/hooks/use-snooze';
import { useRouter } from 'next/navigation';
import type { Message } from '@/types/message';

interface MessageViewProps {
  message: Message;
}

export function MessageView({ message }: MessageViewProps) {
  const [replyMode, setReplyMode] = useState<'reply' | 'replyAll' | 'forward' | null>(null);
  const [showSnoozeDialog, setShowSnoozeDialog] = useState(false);
  const { snoozeEmail, isSnoozing } = useSnooze();
  const router = useRouter();

  const handleReply = () => {
    setReplyMode('reply');
  };

  const handleReplyAll = () => {
    setReplyMode('replyAll');
  };

  const handleForward = () => {
    setReplyMode('forward');
  };

  const handleSnooze = () => {
    setShowSnoozeDialog(true);
  };

  const handleSnoozeSubmit = async (snoozeUntil: Date) => {
    const success = await snoozeEmail({
      messageId: message.id,
      snoozeUntil,
      originalFolderType: 'inbox', // Default to inbox, could be dynamic based on current view
    });

    if (success) {
      setShowSnoozeDialog(false);
      // Refresh the page to reflect the snoozed state
      router.refresh();
    }
  };

  const handleCloseComposer = () => {
    setReplyMode(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Actions bar */}
      <div className="p-4">
        <MessageActions
          message={message}
          onReply={handleReply}
          onReplyAll={handleReplyAll}
          onForward={handleForward}
          onSnooze={handleSnooze}
        />
      </div>

      {/* Message content */}
      <div className="flex-1 overflow-y-auto px-6">
        <MessageHeader message={message} />
        <MessageBody message={message} />
      </div>

      {/* Reply composer overlay */}
      {replyMode && (
        <ReplyComposer
          originalEmail={message}
          mode={replyMode}
          onClose={handleCloseComposer}
          onSent={handleCloseComposer}
        />
      )}

      {/* Snooze dialog */}
      <SnoozeDialog
        open={showSnoozeDialog}
        onOpenChange={setShowSnoozeDialog}
        onSnooze={handleSnoozeSubmit}
        isLoading={isSnoozing}
      />
    </div>
  );
}
