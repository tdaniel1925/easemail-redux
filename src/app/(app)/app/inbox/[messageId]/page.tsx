// Individual message view page
// Phase 1, Task 16

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { MessageView } from '@/components/inbox/message-view';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function MessagePage({
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
    redirect('/app/inbox');
  }

  // Mark as read
  if (message.is_unread) {
    await supabase
      .from('messages')
      .update({ is_unread: false } as any)
      .eq('id', message.id)
      .eq('user_id', user.id);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Back button */}
      <div className="border-b p-4">
        <Link href="/app/inbox">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Inbox
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
