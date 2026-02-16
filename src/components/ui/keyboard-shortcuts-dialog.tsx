'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

interface Shortcut {
  key: string;
  description: string;
  category: 'navigation' | 'actions' | 'composer';
}

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
  }, []);

  const modKey = isMac ? '⌘' : 'Ctrl';

  const shortcuts: Shortcut[] = [
    // Navigation
    { key: 'C', description: 'Compose new email', category: 'navigation' },
    { key: '/', description: 'Focus search', category: 'navigation' },
    { key: '?', description: 'Show keyboard shortcuts', category: 'navigation' },
    { key: 'Esc', description: 'Close modal or dialog', category: 'navigation' },

    // Actions
    { key: 'R', description: 'Reply to email', category: 'actions' },
    { key: 'F', description: 'Forward email', category: 'actions' },
    { key: 'A', description: 'Archive email', category: 'actions' },
    { key: '#', description: 'Delete email', category: 'actions' },
    { key: 'S', description: 'Star email', category: 'actions' },

    // Composer
    { key: `${modKey}+Enter`, description: 'Send email', category: 'composer' },
    { key: `${modKey}+S`, description: 'Save draft', category: 'composer' },
    { key: 'Tab', description: 'Accept AI suggestion', category: 'composer' },
  ];

  const categories = {
    navigation: 'Navigation',
    actions: 'Email Actions',
    composer: 'Composer',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate and perform actions faster
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {Object.entries(categories).map(([category, label]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase">
                {label}
              </h3>
              <div className="space-y-2">
                {shortcuts
                  .filter((s) => s.category === category)
                  .map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <kbd className="px-2 py-1 text-xs font-mono bg-muted border border-border rounded">
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
