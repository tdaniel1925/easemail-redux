// MessageView component - Full email message display
// Phase 1, Task 10

'use client';

import { MessageHeader } from './message-header';
import { MessageBody } from './message-body';
import { MessageActions } from './message-actions';
import type { Message } from '@/types/message';

interface MessageViewProps {
  message: Message;
}

export function MessageView({ message }: MessageViewProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Actions bar */}
      <div className="p-4">
        <MessageActions message={message} />
      </div>

      {/* Message content */}
      <div className="flex-1 overflow-y-auto px-6">
        <MessageHeader message={message} />
        <MessageBody message={message} />
      </div>
    </div>
  );
}
