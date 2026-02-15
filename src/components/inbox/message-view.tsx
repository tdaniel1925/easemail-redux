// MessageView component - Full email message display
// Phase 2: Reply/forward integrated

'use client';

import { useState } from 'react';
import { MessageHeader } from './message-header';
import { MessageBody } from './message-body';
import { MessageActions } from './message-actions';
import { ReplyComposer } from '@/components/email/reply-composer';
import type { Message } from '@/types/message';

interface MessageViewProps {
  message: Message;
}

export function MessageView({ message }: MessageViewProps) {
  const [replyMode, setReplyMode] = useState<'reply' | 'replyAll' | 'forward' | null>(null);

  const handleReply = () => {
    setReplyMode('reply');
  };

  const handleReplyAll = () => {
    setReplyMode('replyAll');
  };

  const handleForward = () => {
    setReplyMode('forward');
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
    </div>
  );
}
