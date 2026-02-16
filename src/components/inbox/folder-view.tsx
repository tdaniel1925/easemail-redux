'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessageRow } from './message-row';
import { MessageRowSkeleton } from './message-row-skeleton';
import { createClient } from '@/lib/supabase/client';
import type { Message } from '@/types/message';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/layout/empty-state';
import { Inbox } from 'lucide-react';
import { useAccount } from '@/hooks/use-account';

interface FolderViewProps {
  userId: string;
  folderType?: 'inbox' | 'sent' | 'drafts' | 'archive' | 'trash' | 'spam' | 'custom';
  folderId?: string; // provider_folder_id for custom folders
  searchQuery?: string;
}

interface MessageThread {
  id: string;
  messages: Message[];
  latestMessage: Message;
  count: number;
}

export function FolderView({ userId, folderType, folderId, searchQuery }: FolderViewProps) {
  const { selectedAccountId } = useAccount();
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [loading, setLoading] = useState(true);

  const groupMessagesIntoThreads = useCallback((messages: Message[]): MessageThread[] => {
    const threadMap = new Map<string, Message[]>();

    for (const message of messages) {
      const threadId = message.provider_thread_id || `standalone_${message.id}`;

      if (!threadMap.has(threadId)) {
        threadMap.set(threadId, []);
      }
      threadMap.get(threadId)!.push(message);
    }

    const threads: MessageThread[] = [];
    for (const [threadId, msgs] of threadMap.entries()) {
      msgs.sort((a, b) =>
        new Date(a.message_date).getTime() - new Date(b.message_date).getTime()
      );

      const latestMessage = msgs[msgs.length - 1];

      threads.push({
        id: threadId,
        messages: msgs,
        latestMessage,
        count: msgs.length,
      });
    }

    threads.sort((a, b) =>
      new Date(b.latestMessage.message_date).getTime() -
      new Date(a.latestMessage.message_date).getTime()
    );

    return threads;
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!selectedAccountId) return;

    const supabase = createClient();
    setLoading(true);

    let query = supabase
      .from('messages')
      .select('*')
      .eq('user_id', userId)
      .eq('email_account_id', selectedAccountId);

    if (folderId) {
      // Custom folder: filter by provider_folder_id
      query = query.eq('folder_id', folderId);
    } else if (folderType) {
      // Standard folder: filter by folder_type
      query = query.eq('folder_type', folderType);
    }

    // Apply search filter if searchQuery exists
    if (searchQuery) {
      query = query.or(
        `from_email.ilike.%${searchQuery}%,` +
        `from_name.ilike.%${searchQuery}%,` +
        `subject.ilike.%${searchQuery}%,` +
        `body_text.ilike.%${searchQuery}%`
      );
    }

    const { data: messages } = await query
      .order('message_date', { ascending: false })
      .limit(200);

    if (messages) {
      setThreads(groupMessagesIntoThreads(messages as Message[]));
    }

    setLoading(false);
  }, [userId, selectedAccountId, folderId, folderType, searchQuery, groupMessagesIntoThreads]);

  useEffect(() => {
    if (selectedAccountId) {
      fetchMessages();
    }
  }, [selectedAccountId, fetchMessages]);

  if (!selectedAccountId || loading) {
    return (
      <div className="flex flex-col gap-2">
        <MessageRowSkeleton count={8} />
      </div>
    );
  }

  if (threads.length === 0 && searchQuery) {
    return (
      <Card className="p-6">
        <EmptyState
          icon={<Inbox className="h-12 w-12" />}
          title="No messages found"
          description={`No messages match \u201C${searchQuery}\u201D. Try a different search term or clear your search.`}
        />
      </Card>
    );
  }

  if (threads.length === 0) {
    return (
      <Card className="p-6">
        <EmptyState
          icon={<Inbox className="h-12 w-12" />}
          title="No messages"
          description="This folder is empty"
        />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {threads.map((thread) => (
        <MessageRow
          key={thread.id}
          message={thread.latestMessage}
          threadCount={thread.count}
        />
      ))}
    </div>
  );
}
