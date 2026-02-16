/**
 * Undo Send Toast Component
 * Displays a toast with undo button for queued email sends
 */

'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Undo2 } from 'lucide-react';

interface UndoSendToastProps {
  queueId: string;
  sendAt: string;
  onUndo: (queueId: string) => void;
  onExpire?: () => void;
}

export function UndoSendToast({
  queueId,
  sendAt,
  onUndo,
  onExpire,
}: UndoSendToastProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    // Calculate time remaining
    const calculateTimeRemaining = () => {
      const sendTime = new Date(sendAt).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((sendTime - now) / 1000));
      return remaining;
    };

    setTimeRemaining(calculateTimeRemaining());

    // Update countdown every second
    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sendAt, onExpire]);

  const handleUndo = () => {
    onUndo(queueId);
  };

  return (
    <div className="flex items-center justify-between gap-4 min-w-[300px]">
      <div className="flex-1">
        <p className="text-sm font-medium">Email scheduled to send</p>
        <p className="text-xs text-muted-foreground">
          Sending in {timeRemaining} second{timeRemaining !== 1 ? 's' : ''}
        </p>
      </div>
      <Button
        size="sm"
        variant="secondary"
        onClick={handleUndo}
        className="flex items-center gap-1.5"
      >
        <Undo2 className="h-3.5 w-3.5" />
        Undo
      </Button>
    </div>
  );
}

/**
 * Helper function to show undo send toast
 * Uses sonner's toast.custom() for custom JSX
 */
export function showUndoSendToast(
  queueId: string,
  sendAt: string,
  onUndo: (queueId: string) => void,
  toast: any // sonner toast instance
): string | number {
  const toastId = toast.custom(
    (t: any) => (
      <div className="bg-background border border-border rounded-lg p-4 shadow-lg">
        <UndoSendToast
          queueId={queueId}
          sendAt={sendAt}
          onUndo={(id) => {
            onUndo(id);
            toast.dismiss(t);
          }}
          onExpire={() => {
            toast.dismiss(t);
          }}
        />
      </div>
    ),
    {
      duration: 6000, // 6 seconds (slightly longer than 5 second send delay)
    }
  );

  return toastId;
}
