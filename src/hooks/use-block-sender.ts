/**
 * useBlockSender Hook
 * Phase 6, Task 119: Block/unblock sender hook
 */

'use client';

import { useState } from 'react';
import { toast } from 'sonner';

export function useBlockSender() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Block a sender by email address
   */
  const blockSender = async (email: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/senders/block', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          block: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to block sender');
      }

      const result = await response.json();

      if (result.success) {
        toast.success(`Blocked ${email}`, {
          description: 'You will no longer see emails from this sender',
        });
        return true;
      }

      return false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to block sender';
      setError(errorMessage);
      toast.error('Failed to block sender', {
        description: errorMessage,
      });
      console.error('Error blocking sender:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Unblock a sender by email address
   */
  const unblockSender = async (email: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/senders/block', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          block: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to unblock sender');
      }

      const result = await response.json();

      if (result.success) {
        toast.success(`Unblocked ${email}`, {
          description: 'You will now see emails from this sender',
        });
        return true;
      }

      return false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unblock sender';
      setError(errorMessage);
      toast.error('Failed to unblock sender', {
        description: errorMessage,
      });
      console.error('Error unblocking sender:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    blockSender,
    unblockSender,
    loading,
    error,
  };
}
