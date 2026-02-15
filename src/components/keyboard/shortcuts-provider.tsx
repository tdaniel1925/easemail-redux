'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CommandPalette } from './command-palette';
import { ShortcutsHelp } from './shortcuts-help';

interface ShortcutsContextType {
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  openHelp: () => void;
}

const ShortcutsContext = createContext<ShortcutsContextType | null>(null);

export function useShortcuts() {
  const context = useContext(ShortcutsContext);
  if (!context) {
    throw new Error('useShortcuts must be used within ShortcutsProvider');
  }
  return context;
}

export function ShortcutsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [navMode, setNavMode] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Command palette: Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      // Help: ?
      if (e.key === '?' && !isInputFocused()) {
        e.preventDefault();
        setHelpOpen(true);
        return;
      }

      // Ignore if input is focused
      if (isInputFocused()) return;

      // Global shortcuts
      switch (e.key) {
        case 'c':
          e.preventDefault();
          router.push('/app/inbox?compose=true');
          break;

        case '/':
          e.preventDefault();
          // Toggle sidebar (handled by layout)
          document.dispatchEvent(new CustomEvent('toggle-sidebar'));
          break;

        case 'g':
          e.preventDefault();
          setNavMode(true);
          // Reset nav mode after 2 seconds
          setTimeout(() => setNavMode(false), 2000);
          break;

        case 'i':
          if (navMode) {
            e.preventDefault();
            router.push('/app/inbox');
            setNavMode(false);
          }
          break;

        case 's':
          if (navMode) {
            e.preventDefault();
            router.push('/app/sent');
            setNavMode(false);
          }
          break;

        case 'd':
          if (navMode) {
            e.preventDefault();
            router.push('/app/drafts');
            setNavMode(false);
          }
          break;

        case 't':
          if (navMode) {
            e.preventDefault();
            router.push('/app/trash');
            setNavMode(false);
          }
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, navMode]);

  function isInputFocused(): boolean {
    const activeElement = document.activeElement;
    return (
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement ||
      activeElement?.getAttribute('contenteditable') === 'true'
    );
  }

  const value = {
    openCommandPalette: () => setCommandPaletteOpen(true),
    closeCommandPalette: () => setCommandPaletteOpen(false),
    openHelp: () => setHelpOpen(true),
  };

  return (
    <ShortcutsContext.Provider value={value}>
      {children}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />
      <ShortcutsHelp open={helpOpen} onOpenChange={setHelpOpen} />
    </ShortcutsContext.Provider>
  );
}
