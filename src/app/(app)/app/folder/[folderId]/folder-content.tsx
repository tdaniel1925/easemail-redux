'use client';

import { PageHeader } from '@/components/layout/page-header';
import { FolderView } from '@/components/inbox/folder-view';
import { RealtimeIndicator } from '@/components/inbox/realtime-indicator';
import { useRealtimeSync } from '@/hooks/use-realtime-sync';
import { useState } from 'react';

interface FolderContentProps {
  userId: string;
  folderId: string;
  folderName: string;
}

export function FolderContent({ userId, folderId, folderName }: FolderContentProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  // Set up real-time sync
  useRealtimeSync((event) => {
    console.log('[Folder] Real-time event received:', event);
    // Refresh folder when new messages arrive or updates occur
    if (event.eventType === 'INSERT' || event.eventType === 'UPDATE') {
      setRefreshKey((prev) => prev + 1);
    }
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <PageHeader title={folderName} description="Custom folder" />
        <RealtimeIndicator showText={true} />
      </div>
      <div className="mt-6">
        <FolderView key={refreshKey} userId={userId} folderId={folderId} />
      </div>
    </div>
  );
}
