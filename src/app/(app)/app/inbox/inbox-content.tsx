'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { SmartInbox } from '@/components/inbox/smart-inbox';
import { RefreshButton } from '@/components/inbox/refresh-button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/layout/empty-state';
import { Inbox } from 'lucide-react';
import { useAccount } from '@/hooks/use-account';
import { createClient } from '@/lib/supabase/client';

interface InboxContentProps {
  userId: string;
}

export function InboxContent({ userId }: InboxContentProps) {
  const { selectedAccountId } = useAccount();
  const [hasMessages, setHasMessages] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedAccountId) {
      checkMessages();
    } else {
      setLoading(true);
    }
  }, [selectedAccountId]);

  async function checkMessages() {
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
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <PageHeader
          title="Inbox"
          description="Your incoming messages organized by priority"
        />
        <RefreshButton userId={userId} />
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground">Loading inbox...</p>
        </div>
      ) : hasMessages ? (
        <SmartInbox userId={userId} />
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
