/**
 * useUndoSend Hook
 * Manages undo send state and actions
 */

'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { Recipient } from '@/types/email';

export interface QueueEmailParams {
  account_id: string;
  to_addresses: Recipient[];
  cc_addresses?: Recipient[];
  bcc_addresses?: Recipient[];
  subject: string;
  body_text: string;
  body_html?: string;
  attachments?: any[];
  signature_id?: string;
  in_reply_to?: string;
  references?: string;
  delay_seconds?: number;
  read_receipt_enabled?: boolean;
}

export interface QueuedEmail {
  id: string;
  send_at: string;
}

interface UseUndoSendReturn {
  queuedEmail: QueuedEmail | null;
  isQueueing: boolean;
  isCanceling: boolean;
  queueSend: (params: QueueEmailParams) => Promise<QueuedEmail | null>;
  cancelSend: (queueId: string) => Promise<boolean>;
  clearQueue: () => void;
}

export function useUndoSend(): UseUndoSendReturn {
  const [queuedEmail, setQueuedEmail] = useState<QueuedEmail | null>(null);
  const [isQueueing, setIsQueueing] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  const queueSend = useCallback(
    async (params: QueueEmailParams): Promise<QueuedEmail | null> => {
      setIsQueueing(true);

      try {
        const response = await fetch('/api/emails/queue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to queue email');
        }

        const result = await response.json();
        const queued: QueuedEmail = {
          id: result.id,
          send_at: result.send_at,
        };

        setQueuedEmail(queued);
        return queued;
      } catch (error: any) {
        toast.error(error.message || 'Failed to queue email');
        return null;
      } finally {
        setIsQueueing(false);
      }
    },
    []
  );

  const cancelSend = useCallback(
    async (queueId: string): Promise<boolean> => {
      setIsCanceling(true);

      try {
        const response = await fetch('/api/emails/cancel-send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ queue_id: queueId }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to cancel send');
        }

        toast.success('Send canceled successfully');
        setQueuedEmail(null);
        return true;
      } catch (error: any) {
        toast.error(error.message || 'Failed to cancel send');
        return false;
      } finally {
        setIsCanceling(false);
      }
    },
    []
  );

  const clearQueue = useCallback(() => {
    setQueuedEmail(null);
  }, []);

  return {
    queuedEmail,
    isQueueing,
    isCanceling,
    queueSend,
    cancelSend,
    clearQueue,
  };
}
