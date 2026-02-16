'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { InboxTabsView } from '@/components/inbox/inbox-tabs-view';
import { MessageRowSkeleton } from '@/components/inbox/message-row-skeleton';
import { RefreshButton } from '@/components/inbox/refresh-button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/layout/empty-state';
import { Inbox, Calendar } from 'lucide-react';
import { useAccount } from '@/hooks/use-account';
import { createClient } from '@/lib/supabase/client';
import { RealtimeIndicator } from '@/components/inbox/realtime-indicator';
import { useRealtimeSync } from '@/hooks/use-realtime-sync';
import { useVacation } from '@/hooks/use-vacation';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface InboxContentProps {
  userId: string;
}

export function InboxContent({ userId }: InboxContentProps) {
  const { selectedAccountId } = useAccount();
  const [hasMessages, setHasMessages] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  // Check vacation responder status
  const { vacationResponder, isActive } = useVacation(selectedAccountId || '');

  const checkMessages = useCallback(async () => {
    if (!selectedAccountId) return;

    setLoading(true);
    const supabase = createClient();

    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('email_account_id', selectedAccountId)
      .eq('folder_type', 'inbox');

    setHasMessages((count || 0) > 0);
    setLoading(false);
  }, [selectedAccountId, userId]);

  // Set up real-time sync
  useRealtimeSync((event) => {
    // Refresh inbox when new messages arrive
    if (event.eventType === 'INSERT' || event.eventType === 'UPDATE') {
      checkMessages();
    }
  });

  useEffect(() => {
    if (selectedAccountId) {
      checkMessages();
    } else {
      setLoading(true);
    }
  }, [selectedAccountId, checkMessages]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <PageHeader
          title="Inbox"
          description="Your incoming messages organized by priority"
        />
        <div className="flex items-center gap-4">
          <RealtimeIndicator showText={true} />
          <RefreshButton userId={userId} />
        </div>
      </div>

      {/* Vacation Responder Active Banner */}
      {isActive && vacationResponder && (
        <Alert className="mb-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-900 dark:text-blue-100">
            <strong>Vacation responder is active.</strong> Automatic replies are being sent to incoming emails.
            {vacationResponder.start_date && vacationResponder.end_date && (
              <span className="ml-1">
                (
                {new Date(vacationResponder.start_date).toLocaleDateString()} -
                {new Date(vacationResponder.end_date).toLocaleDateString()}
                )
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">
          <MessageRowSkeleton count={8} />
        </div>
      ) : hasMessages ? (
        <InboxTabsView userId={userId} />
      ) : (
        <Card className="p-6">
          <EmptyState
            icon={<Inbox className="h-12 w-12" />}
            title="No messages in inbox"
            description="This account has no messages in the inbox"
          />
        </Card>
      )}
    </div>
  );
}
