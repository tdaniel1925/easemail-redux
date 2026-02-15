'use client';

import { useState, useEffect } from 'react';
import { MessageRow } from './message-row';
import { GatekeeperCard } from './gatekeeper-card';
import { createClient } from '@/lib/supabase/client';
import type { Message } from '@/types/message';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SmartInboxProps {
  userId: string;
}

interface MessageSection {
  id: string;
  title: string;
  messages: Message[];
  collapsed: boolean;
  count: number;
}

export function SmartInbox({ userId }: SmartInboxProps) {
  const [sections, setSections] = useState<MessageSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInboxSections();
  }, [userId]);

  async function fetchInboxSections() {
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
      .eq('folder_type', 'inbox')
      .contains('categories', ['newsletter'])
      .order('message_date', { ascending: false })
      .limit(50);

    // 4. Notifications (category='notification')
    const { data: notificationMessages } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', userId)
      .eq('folder_type', 'inbox')
      .contains('categories', ['notification'])
      .order('message_date', { ascending: false })
      .limit(50);

    // 5. Promotions (category='promotion')
    const { data: promotionMessages } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', userId)
      .eq('folder_type', 'inbox')
      .contains('categories', ['promotion'])
      .order('message_date', { ascending: false })
      .limit(50);

    setSections([
      {
        id: 'priority',
        title: 'Priority',
        messages: priorityMessages,
        collapsed: false,
        count: priorityMessages.length,
      },
      {
        id: 'people',
        title: 'People',
        messages: (peopleMessages as Message[]) || [],
        collapsed: false,
        count: peopleMessages?.length || 0,
      },
      {
        id: 'newsletters',
        title: 'Newsletters',
        messages: (newsletterMessages as Message[]) || [],
        collapsed: true,
        count: newsletterMessages?.length || 0,
      },
      {
        id: 'notifications',
        title: 'Notifications',
        messages: (notificationMessages as Message[]) || [],
        collapsed: true,
        count: notificationMessages?.length || 0,
      },
      {
        id: 'promotions',
        title: 'Promotions',
        messages: (promotionMessages as Message[]) || [],
        collapsed: true,
        count: promotionMessages?.length || 0,
      },
    ]);

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

  if (loading) {
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

            {/* Messages */}
            {!section.collapsed && (
              <div className="flex flex-col gap-0.5">
                {section.messages.map((message) => (
                  <MessageRow
                    key={message.id}
                    message={message}
                    isPriority={section.id === 'priority'}
                  />
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
