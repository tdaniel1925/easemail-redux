'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BellOff, Check, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import type { Notification } from '@/types/notification';
import type { EmailAccount } from '@/types/database';

interface NotificationDropdownProps {
  onClose: () => void;
}

type NotificationWithAccount = Notification & {
  email_account?: EmailAccount | null;
};

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationWithAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
    const supabase = createClient();
    const { data } = await supabase
      .from('notification_queue')
      .select(`
        *,
        email_account:email_accounts(id, email, provider)
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    setNotifications((data as unknown as NotificationWithAccount[]) || []);
    setLoading(false);
  }

  async function markAsRead(id: string) {
    const supabase = createClient();
    await supabase
      .from('notification_queue')
      .update({ read: true })
      .eq('id', id);

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }

  async function markAllAsRead() {
    const supabase = createClient();
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);

    if (unreadIds.length === 0) return;

    await supabase
      .from('notification_queue')
      .update({ read: true })
      .in('id', unreadIds);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function handleNotificationClick(notification: NotificationWithAccount) {
    markAsRead(notification.id);
    if (notification.link) {
      // If notification has an associated account, include it in the URL
      let targetUrl = notification.link;
      if (notification.email_account?.id) {
        const separator = notification.link.includes('?') ? '&' : '?';
        targetUrl = `${notification.link}${separator}accountId=${notification.email_account.id}`;
      }
      router.push(targetUrl);
      onClose();
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <BellOff className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">No notifications</p>
        <p className="text-xs text-muted-foreground">
          You&apos;re all caught up!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="font-semibold">Notifications</h3>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllAsRead}
            className="h-auto p-0 text-xs"
          >
            <Check className="mr-1 h-3 w-3" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Notification list */}
      <ScrollArea className="h-96">
        <div className="divide-y">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-accent ${
                !notification.read ? 'bg-primary/5' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">{notification.title}</p>
                {!notification.read && (
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {notification.message}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant={
                    notification.type === 'error'
                      ? 'destructive'
                      : notification.type === 'warning'
                      ? 'default'
                      : 'secondary'
                  }
                  className="text-[10px]"
                >
                  {notification.type}
                </Badge>
                {notification.email_account && (
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span>{notification.email_account.email}</span>
                  </div>
                )}
                <span className="text-[10px] text-muted-foreground">
                  {notification.created_at ? formatTime(notification.created_at) : 'Unknown'}
                </span>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}
