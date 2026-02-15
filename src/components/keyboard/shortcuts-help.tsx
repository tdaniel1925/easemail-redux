'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

interface ShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  {
    category: 'Global',
    items: [
      { keys: ['c'], description: 'New compose' },
      { keys: ['g', 'i'], description: 'Go to inbox' },
      { keys: ['g', 's'], description: 'Go to sent' },
      { keys: ['g', 'd'], description: 'Go to drafts' },
      { keys: ['g', 't'], description: 'Go to trash' },
      { keys: ['/'], description: 'Toggle sidebar' },
      { keys: ['⌘', 'K'], description: 'Open command palette' },
      { keys: ['?'], description: 'Show this help' },
    ],
  },
  {
    category: 'Message View',
    items: [
      { keys: ['j', 'k'], description: 'Next / previous message' },
      { keys: ['o', 'Enter'], description: 'Open message' },
      { keys: ['r'], description: 'Reply' },
      { keys: ['a'], description: 'Reply all' },
      { keys: ['f'], description: 'Forward' },
      { keys: ['e'], description: 'Archive' },
      { keys: ['#'], description: 'Delete (move to trash)' },
      { keys: ['s'], description: 'Star/unstar' },
      { keys: ['u'], description: 'Mark unread' },
      { keys: ['l'], description: 'Label (open label picker)' },
      { keys: ['v'], description: 'Move to folder' },
      { keys: ['z'], description: 'Undo last action' },
    ],
  },
];

export function ShortcutsHelp({ open, onOpenChange }: ShortcutsHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                {section.category}
              </h3>
              <div className="grid gap-2">
                {section.items.map((shortcut, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border px-4 py-2"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, j) => (
                        <span key={j} className="flex items-center gap-1">
                          <kbd className="inline-flex h-6 min-w-[24px] items-center justify-center rounded border border-border bg-muted px-2 text-xs font-medium">
                            {key}
                          </kbd>
                          {j < shortcut.keys.length - 1 && (
                            <span className="text-xs text-muted-foreground">
                              then
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
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
