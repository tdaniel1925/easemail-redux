/**
 * EMERGENCY WORKAROUND - App navigation with hard navigation
 * Using window.location.href instead of Next.js Link since router is broken
 */

'use client';

import { usePathname } from 'next/navigation';
import {
  Inbox,
  Send,
  FileText,
  Clock,
  Users,
  Tag,
  Settings,
  Bookmark,
  Folder,
  Archive,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { designTokens } from '@/lib/design-tokens';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState, useCallback } from 'react';
import { useAccount } from '@/hooks/use-account';

const navItems = [
  {
    title: 'Inbox',
    href: '/app/inbox',
    icon: Inbox,
  },
  {
    title: 'Sent',
    href: '/app/sent',
    icon: Send,
  },
  {
    title: 'Drafts',
    href: '/app/drafts',
    icon: FileText,
  },
  {
    title: 'Archive',
    href: '/app/archive',
    icon: Archive,
  },
  {
    title: 'Trash',
    href: '/app/trash',
    icon: Trash2,
  },
];

const bottomNavItems = [
  {
    title: 'Scheduled',
    href: '/app/scheduled',
    icon: Clock,
  },
  {
    title: 'Templates',
    href: '/app/templates',
    icon: Bookmark,
  },
  {
    title: 'Contacts',
    href: '/app/contacts',
    icon: Users,
  },
  {
    title: 'Labels',
    href: '/app/labels',
    icon: Tag,
  },
  {
    title: 'Settings',
    href: '/app/settings',
    icon: Settings,
  },
];

interface CustomFolder {
  id: string;
  provider_folder_id: string;
  folder_name: string;
  folder_type: string;
}

export function AppNavHardNav() {
  const pathname = usePathname();
  const { selectedAccountId } = useAccount();
  const [customFolders, setCustomFolders] = useState<CustomFolder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomFolders = useCallback(async () => {
    if (!selectedAccountId) return;

    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get all custom folders (folder_type = 'custom') for selected account
    const { data } = await supabase
      .from('folder_mappings')
      .select('id, provider_folder_id, folder_name, folder_type')
      .eq('user_id', user.id)
      .eq('email_account_id', selectedAccountId)
      .eq('is_active', true)
      .eq('folder_type', 'custom')
      .order('folder_name');

    setCustomFolders(data || []);
    setLoading(false);
  }, [selectedAccountId]);

  useEffect(() => {
    if (selectedAccountId) {
      fetchCustomFolders();
    } else {
      setCustomFolders([]);
      setLoading(false);
    }
  }, [selectedAccountId, fetchCustomFolders]);

  const handleNavigation = (href: string) => {
    window.location.href = href;
  };

  return (
    <nav className="space-y-6">
      {/* Main folders */}
      <div className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <button
              key={item.href}
              onClick={() => handleNavigation(item.href)}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full text-left',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className={designTokens.iconSizes.sm} />
              {item.title}
            </button>
          );
        })}
      </div>

      {/* Custom folders */}
      {!loading && customFolders.length > 0 && (
        <div className="space-y-1">
          <div className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Folders
          </div>
          {customFolders.map((folder) => {
            const isActive = pathname === `/app/folder/${folder.provider_folder_id}`;

            return (
              <button
                key={folder.id}
                onClick={() => handleNavigation(`/app/folder/${folder.provider_folder_id}`)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full text-left',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Folder className={designTokens.iconSizes.sm} />
                {folder.folder_name}
              </button>
            );
          })}
        </div>
      )}

      {/* Bottom items */}
      <div className="space-y-1 pt-6 border-t border-border">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <button
              key={item.href}
              onClick={() => handleNavigation(item.href)}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full text-left',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className={designTokens.iconSizes.sm} />
              {item.title}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
