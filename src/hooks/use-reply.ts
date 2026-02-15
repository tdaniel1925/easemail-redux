/**
 * useReply Hook
 * Manages reply/reply-all/forward state and actions
 */

'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { Message } from '@/types/message';
import type { ReplyPayload } from '@/types/email';

type ReplyMode = 'reply' | 'replyAll' | 'forward';

interface ReplyDraft {
  mode: ReplyMode;
  originalMessage: Message;
  body_html: string;
  to?: string[];
  cc?: string[];
  bcc?: string[];
}

interface UseReplyReturn {
  replyDraft: ReplyDraft | null;
  isReplying: boolean;
  startReply: (message: Message, mode: ReplyMode) => void;
  sendReply: (body_html: string) => Promise<boolean>;
  cancelReply: () => void;
}

export function useReply(): UseReplyReturn {
  const [replyDraft, setReplyDraft] = useState<ReplyDraft | null>(null);
  const [isReplying, setIsReplying] = useState(false);

  const startReply = (message: Message, mode: ReplyMode) => {
    setReplyDraft({
      mode,
      originalMessage: message,
      body_html: '',
    });
  };

  const sendReply = async (body_html: string): Promise<boolean> => {
    if (!replyDraft) {
      toast.error('No reply draft found');
      return false;
    }

    setIsReplying(true);

    try {
      const { originalMessage, mode } = replyDraft;

      let endpoint = '/api/emails/reply';
      if (mode === 'replyAll') {
        endpoint = '/api/emails/reply-all';
      } else if (mode === 'forward') {
        endpoint = '/api/emails/forward';
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: originalMessage.id,
          body_html,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send reply');
      }

      const result = await response.json();

      toast.success(
        mode === 'reply'
          ? 'Reply sent successfully'
          : mode === 'replyAll'
          ? 'Reply sent to all recipients'
          : 'Email forwarded successfully'
      );

      setReplyDraft(null);
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reply');
      return false;
    } finally {
      setIsReplying(false);
    }
  };

  const cancelReply = () => {
    setReplyDraft(null);
  };

  return {
    replyDraft,
    isReplying,
    startReply,
    sendReply,
    cancelReply,
  };
}
