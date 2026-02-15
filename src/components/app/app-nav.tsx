/**
 * Main app navigation sidebar
 */

'use client';

import Link from 'next/link';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { designTokens } from '@/lib/design-tokens';

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

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className={designTokens.iconSizes.sm} />
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
