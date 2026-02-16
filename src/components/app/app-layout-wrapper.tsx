'use client';

import { AccountProvider } from '@/contexts/account-context';
import { ReactNode, useState, useEffect } from 'react';
import { KeyboardShortcutsDialog } from '@/components/ui/keyboard-shortcuts-dialog';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

export function AppLayoutWrapper({ children }: { children: ReactNode }) {
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    function handleKeyPress(e: KeyboardEvent) {
      // Show shortcuts on "?"
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        // Don't trigger if user is typing in an input/textarea
        const target = e.target as HTMLElement;
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        ) {
          return;
        }
        e.preventDefault();
        setShowShortcuts(true);
      }

      // Close on Escape
      if (e.key === 'Escape') {
        setShowShortcuts(false);
      }
    }

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AccountProvider>
        {children}
        <KeyboardShortcutsDialog open={showShortcuts} onOpenChange={setShowShortcuts} />
      </AccountProvider>
    </QueryClientProvider>
  );
}
