'use client';

import { PageHeader } from '@/components/layout/page-header';
import { FolderView } from '@/components/inbox/folder-view';
import { RealtimeIndicator } from '@/components/inbox/realtime-indicator';
import { useRealtimeSync } from '@/hooks/use-realtime-sync';
import { useState } from 'react';

interface SentContentProps {
  userId: string;
}

export function SentContent({ userId }: SentContentProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  // Set up real-time sync
  useRealtimeSync((event) => {
    console.log('[Sent] Real-time event received:', event);
    // Refresh sent folder when new messages arrive or updates occur
    if (event.eventType === 'INSERT' || event.eventType === 'UPDATE') {
      setRefreshKey((prev) => prev + 1);
    }
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <PageHeader title="Sent" description="Sent messages" />
        <RealtimeIndicator showText={true} />
      </div>
      <div className="mt-6">
        <FolderView key={refreshKey} userId={userId} folderType="sent" />
      </div>
    </div>
  );
}
