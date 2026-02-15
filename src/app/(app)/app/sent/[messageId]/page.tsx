// Individual sent message view page
// Phase 1, Task 17

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { MessageView } from '@/components/inbox/message-view';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function SentMessagePage({
  params,
}: {
  params: { messageId: string };
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/signin');
  }

  // Fetch the message
  const { data: message, error } = await supabase
    .from('messages')
    .select('*')
    .eq('id', params.messageId)
    .eq('user_id', user.id)
    .single();

  if (error || !message) {
    redirect('/app/sent');
  }

  return (
    <div className="flex h-full flex-col">
      {/* Back button */}
      <div className="border-b p-4">
        <Link href="/app/sent">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Sent
          </Button>
        </Link>
      </div>

      {/* Message view */}
      <div className="flex-1 overflow-hidden">
        <MessageView message={message as any} />
      </div>
    </div>
  );
}
