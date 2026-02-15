'use client';

import { useState, useEffect } from 'react';
import { MessageRow } from './message-row';
import { GatekeeperCard } from './gatekeeper-card';
import { createClient } from '@/lib/supabase/client';
import type { Message } from '@/types/message';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAccount } from '@/hooks/use-account';

interface SmartInboxProps {
  userId: string;
}

interface MessageThread {
  id: string; // thread_id or message_id for standalone
  messages: Message[];
  latestMessage: Message;
  count: number;
}

interface MessageSection {
  id: string;
  title: string;
  threads: MessageThread[];
  collapsed: boolean;
  count: number;
}

export function SmartInbox({ userId }: SmartInboxProps) {
  const { selectedAccountId } = useAccount();
  const [sections, setSections] = useState<MessageSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedAccountId) {
      fetchInboxSections();
    }
  }, [userId, selectedAccountId]);

  // Helper function to group messages into threads
  function groupMessagesIntoThreads(messages: Message[]): MessageThread[] {
    const threadMap = new Map<string, Message[]>();

    // Group messages by provider_thread_id
    for (const message of messages) {
      const threadId = message.provider_thread_id || `standalone_${message.id}`;

      if (!threadMap.has(threadId)) {
        threadMap.set(threadId, []);
      }
      threadMap.get(threadId)!.push(message);
    }

    // Convert to MessageThread array
    const threads: MessageThread[] = [];
    for (const [threadId, threadMessages] of threadMap) {
      // Sort messages in thread by date (latest first)
      threadMessages.sort((a, b) =>
        new Date(b.message_date).getTime() - new Date(a.message_date).getTime()
      );

      threads.push({
        id: threadId,
        messages: threadMessages,
        latestMessage: threadMessages[0],
        count: threadMessages.length,
      });
    }

    // Sort threads by latest message date
    threads.sort((a, b) =>
      new Date(b.latestMessage.message_date).getTime() -
      new Date(a.latestMessage.message_date).getTime()
    );

    return threads;
  }

  async function fetchInboxSections() {
    if (!selectedAccountId) return;

    const supabase = createClient();

    // 1. Priority messages (from priority_senders)
    const { data: prioritySenders } = await supabase
      .from('priority_senders')
      .select('email')
      .eq('user_id', userId)
      .eq('is_blocked', false);

    const priorityEmails = prioritySenders?.map((ps) => ps.email) || [];

    let priorityMessages: Message[] = [];
    if (priorityEmails.length > 0) {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', userId)
        .eq('email_account_id', selectedAccountId)
        .eq('folder_type', 'inbox')
        .in('from_email', priorityEmails)
        .order('message_date', { ascending: false })
        .limit(20);

      priorityMessages = (data as Message[]) || [];
    }

    // 2. People messages (category='people', not priority)
    const { data: peopleMessages } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', userId)
      .eq('email_account_id', selectedAccountId)
      .eq('folder_type', 'inbox')
      .contains('categories', ['people'])
      .not('from_email', 'in', `(${priorityEmails.join(',')})`)
      .order('message_date', { ascending: false })
      .limit(50);

    // 3. Newsletters (category='newsletter')
    const { data: newsletterMessages } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', userId)
      .eq('email_account_id', selectedAccountId)
      .eq('folder_type', 'inbox')
      .contains('categories', ['newsletter'])
      .order('message_date', { ascending: false })
      .limit(50);

    // 4. Notifications (category='notification')
    const { data: notificationMessages } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', userId)
      .eq('email_account_id', selectedAccountId)
      .eq('folder_type', 'inbox')
      .contains('categories', ['notification'])
      .order('message_date', { ascending: false })
      .limit(50);

    // 5. Promotions (category='promotion')
    const { data: promotionMessages } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', userId)
      .eq('email_account_id', selectedAccountId)
      .eq('folder_type', 'inbox')
      .contains('categories', ['promotion'])
      .order('message_date', { ascending: false })
      .limit(50);

    // 6. Uncategorized messages (categories is empty array) - temporary fallback
    const { data: uncategorizedMessages, error: uncategorizedError } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', userId)
      .eq('email_account_id', selectedAccountId)
      .eq('folder_type', 'inbox')
      .eq('categories', []) // Empty array
      .order('message_date', { ascending: false })
      .limit(100);

    // Group each section's messages into threads
    const allSections = [
      {
        id: 'priority',
        title: 'Priority',
        threads: groupMessagesIntoThreads(priorityMessages),
        collapsed: false,
        count: priorityMessages.length,
      },
      {
        id: 'people',
        title: 'People',
        threads: groupMessagesIntoThreads((peopleMessages as Message[]) || []),
        collapsed: false,
        count: peopleMessages?.length || 0,
      },
      {
        id: 'newsletters',
        title: 'Newsletters',
        threads: groupMessagesIntoThreads((newsletterMessages as Message[]) || []),
        collapsed: true,
        count: newsletterMessages?.length || 0,
      },
      {
        id: 'notifications',
        title: 'Notifications',
        threads: groupMessagesIntoThreads((notificationMessages as Message[]) || []),
        collapsed: true,
        count: notificationMessages?.length || 0,
      },
      {
        id: 'promotions',
        title: 'Promotions',
        threads: groupMessagesIntoThreads((promotionMessages as Message[]) || []),
        collapsed: true,
        count: promotionMessages?.length || 0,
      },
    ];

    // Add uncategorized section if there are any uncategorized messages
    if (uncategorizedMessages && uncategorizedMessages.length > 0) {
      allSections.push({
        id: 'uncategorized',
        title: 'Other',
        threads: groupMessagesIntoThreads(uncategorizedMessages as Message[]),
        collapsed: false,
        count: uncategorizedMessages.length,
      });
    }

    setSections(allSections);

    setLoading(false);
  }

  function toggleSection(sectionId: string) {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? { ...section, collapsed: !section.collapsed }
          : section
      )
    );
  }

  if (!selectedAccountId || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Loading inbox...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Gatekeeper section (if enabled) */}
      {/* TODO: Add gatekeeper logic based on user_preferences */}

      {sections.map((section) => {
        if (section.count === 0) return null;

        return (
          <div key={section.id} className="flex flex-col gap-2">
            {/* Section header */}
            <button
              onClick={() => toggleSection(section.id)}
              className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              {section.collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              {section.title}
              <span className="text-xs">({section.count})</span>
            </button>

            {/* Threads */}
            {!section.collapsed && (
              <div className="flex flex-col gap-0.5">
                {section.threads.map((thread) => (
                  <div key={thread.id} className="relative">
                    <MessageRow
                      message={thread.latestMessage}
                      isPriority={section.id === 'priority'}
                    />
                    {thread.count > 1 && (
                      <Badge
                        variant="secondary"
                        className="absolute right-16 top-3 text-xs"
                      >
                        {thread.count}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Collapsed summary */}
            {section.collapsed && (
              <div className="rounded-lg border bg-muted/30 px-4 py-2 text-sm text-muted-foreground">
                {section.count} {section.count === 1 ? 'message' : 'messages'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
