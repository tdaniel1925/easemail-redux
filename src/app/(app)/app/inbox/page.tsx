/**
 * Inbox Page - Smart Inbox with sections
 * Stage 6: Automation layer
 */

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { SmartInbox } from '@/components/inbox/smart-inbox';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/layout/empty-state';
import { Inbox } from 'lucide-react';

export default async function InboxPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/signin');
  }

  // Check if user has any messages
  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('folder_type', 'inbox');

  const hasMessages = (count || 0) > 0;

  return (
    <div className="p-8">
      <PageHeader
        title="Inbox"
        description="Your incoming messages organized by priority"
      />

      {hasMessages ? (
        <SmartInbox userId={user.id} />
      ) : (
        <Card className="p-6">
          <EmptyState
            icon={<Inbox className="h-12 w-12" />}
            title="No messages in inbox"
            description="Connect an email account to start syncing messages"
            action={{
              label: "Connect Email Account",
              href: "/app/settings"
            }}
          />
        </Card>
      )}
    </div>
  );
}
