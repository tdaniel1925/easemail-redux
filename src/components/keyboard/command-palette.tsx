'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import {
  Inbox,
  Send,
  FileText,
  Trash,
  Calendar,
  Users,
  Tag,
  Settings,
  Search,
  Mail,
  Archive,
  Star,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { searchContacts } from '@/lib/search';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [recentContacts, setRecentContacts] = useState<
    Array<{ id: string; email: string; name: string | null }>
  >([]);

  useEffect(() => {
    if (open && search.length > 0) {
      // Search contacts
      searchContacts('', search, 5).then((contacts) => {
        setRecentContacts(contacts);
      });
    }
  }, [search, open]);

  function runCommand(command: () => void) {
    onOpenChange(false);
    command();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 shadow-lg">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          <Command.Input
            placeholder="Type a command or search..."
            value={search}
            onValueChange={setSearch}
          />
          <Command.List>
            <Command.Empty>No results found.</Command.Empty>

            {/* Actions */}
            <Command.Group heading="Actions">
              <Command.Item
                onSelect={() =>
                  runCommand(() => router.push('/app/inbox?compose=true'))
                }
              >
                <Mail className="mr-2 h-4 w-4" />
                <span>Compose Email</span>
              </Command.Item>
              <Command.Item
                onSelect={() =>
                  runCommand(() => router.push('/app/inbox?search=true'))
                }
              >
                <Search className="mr-2 h-4 w-4" />
                <span>Search Messages</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push('/app/settings'))}
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Command.Item>
            </Command.Group>

            {/* Navigation */}
            <Command.Group heading="Navigation">
              <Command.Item
                onSelect={() => runCommand(() => router.push('/app/inbox'))}
              >
                <Inbox className="mr-2 h-4 w-4" />
                <span>Inbox</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push('/app/sent'))}
              >
                <Send className="mr-2 h-4 w-4" />
                <span>Sent</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push('/app/drafts'))}
              >
                <FileText className="mr-2 h-4 w-4" />
                <span>Drafts</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push('/app/starred'))}
              >
                <Star className="mr-2 h-4 w-4" />
                <span>Starred</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push('/app/archive'))}
              >
                <Archive className="mr-2 h-4 w-4" />
                <span>Archive</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push('/app/trash'))}
              >
                <Trash className="mr-2 h-4 w-4" />
                <span>Trash</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push('/app/calendar'))}
              >
                <Calendar className="mr-2 h-4 w-4" />
                <span>Calendar</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push('/app/contacts'))}
              >
                <Users className="mr-2 h-4 w-4" />
                <span>Contacts</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push('/app/labels'))}
              >
                <Tag className="mr-2 h-4 w-4" />
                <span>Labels</span>
              </Command.Item>
            </Command.Group>

            {/* Recent Contacts */}
            {recentContacts.length > 0 && (
              <Command.Group heading="Recent Contacts">
                {recentContacts.map((contact) => (
                  <Command.Item
                    key={contact.id}
                    onSelect={() =>
                      runCommand(() =>
                        router.push(
                          `/app/inbox?compose=true&to=${contact.email}`
                        )
                      )
                    }
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    <span>
                      {contact.name || contact.email}
                      {contact.name && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {contact.email}
                        </span>
                      )}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
