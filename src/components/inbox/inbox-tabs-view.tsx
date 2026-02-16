'use client';

import { useEffect, useRef } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FolderView } from './folder-view';
import { SmartInbox } from './smart-inbox';
import { InboxSearch, InboxSearchRef } from './inbox-search';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

interface InboxTabsViewProps {
  userId: string;
}

export function InboxTabsView({ userId }: InboxTabsViewProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchRef = useRef<InboxSearchRef>(null);

  // Default to "all" view if no param is set
  const activeView = searchParams.get('view') || 'all';
  const searchQuery = searchParams.get('q') || '';

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('view', value);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSearch = (query: string) => {
    const params = new URLSearchParams(searchParams);
    if (query) {
      params.set('q', query);
    } else {
      params.delete('q');
    }
    params.set('view', activeView); // Preserve current tab
    router.push(`${pathname}?${params.toString()}`);
  };

  // Keyboard shortcut: Cmd+K or Ctrl+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="w-full space-y-6">
      <InboxSearch ref={searchRef} onSearch={handleSearch} initialQuery={searchQuery} />

      <Tabs value={activeView} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="smart">Smart Inbox</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-0">
          <FolderView userId={userId} folderType="inbox" searchQuery={searchQuery} />
        </TabsContent>

        <TabsContent value="smart" className="mt-0">
          <SmartInbox userId={userId} searchQuery={searchQuery} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
