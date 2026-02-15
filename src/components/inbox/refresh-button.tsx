'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { triggerManualSync } from './actions';

export function RefreshButton({ userId }: { userId: string }) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function handleRefresh() {
    setIsRefreshing(true);

    try {
      const result = await triggerManualSync(userId);

      if (result.success) {
        toast.success('Inbox synced successfully', {
          description: result.changesCount
            ? `${result.changesCount} ${result.changesCount === 1 ? 'change' : 'changes'} detected`
            : 'Your inbox is up to date',
        });
        // Trigger a page reload to show new messages
        window.location.reload();
      } else {
        toast.error('Sync failed', {
          description: result.error || 'Failed to sync inbox',
        });
      }
    } catch (error: any) {
      toast.error('Sync error', {
        description: error.message || 'An unexpected error occurred',
      });
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleRefresh}
      disabled={isRefreshing}
      title="Refresh inbox"
    >
      <RefreshCw
        className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
      />
    </Button>
  );
}
