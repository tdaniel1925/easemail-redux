'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';

interface GatekeeperCardProps {
  senderId: string;
  senderEmail: string;
  senderName: string | null;
  messageCount: number;
  onAction: (action: 'accept' | 'block') => void;
}

export function GatekeeperCard({
  senderId,
  senderEmail,
  senderName,
  messageCount,
  onAction,
}: GatekeeperCardProps) {
  const [loading, setLoading] = useState(false);

  async function handleAccept() {
    setLoading(true);
    const supabase = createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Add to priority senders (not blocked)
    await supabase.from('priority_senders').upsert({
      id: senderId,
      user_id: user.id,
      email: senderEmail,
      name: senderName,
      is_blocked: false,
    });

    onAction('accept');
    setLoading(false);
  }

  async function handleBlock() {
    setLoading(true);
    const supabase = createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Add to priority senders (blocked)
    await supabase.from('priority_senders').upsert({
      id: senderId,
      user_id: user.id,
      email: senderEmail,
      name: senderName,
      is_blocked: true,
    });

    onAction('block');
    setLoading(false);
  }

  return (
    <Card className="flex items-center justify-between p-4">
      <div className="flex flex-col gap-1">
        <p className="font-medium">{senderName || senderEmail}</p>
        {senderName && (
          <p className="text-sm text-muted-foreground">{senderEmail}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {messageCount} {messageCount === 1 ? 'message' : 'messages'}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleAccept}
          disabled={loading}
        >
          <Check className="mr-1 h-3 w-3" />
          Accept
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleBlock}
          disabled={loading}
        >
          <X className="mr-1 h-3 w-3" />
          Block
        </Button>
      </div>
    </Card>
  );
}
