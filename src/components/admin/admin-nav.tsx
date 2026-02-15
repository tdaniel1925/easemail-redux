/**
 * Admin navigation sidebar
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Building2, Settings, FileText, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { designTokens } from '@/lib/design-tokens';

const navItems = [
  {
    title: 'Users',
    href: '/app/admin/users',
    icon: Users,
  },
  {
    title: 'Organizations',
    href: '/app/admin/organizations',
    icon: Building2,
  },
  {
    title: 'System Settings',
    href: '/app/admin/settings',
    icon: Settings,
  },
  {
    title: 'Audit Logs',
    href: '/app/admin/audit-logs',
    icon: FileText,
  },
  {
    title: 'Activity',
    href: '/app/admin/activity',
    icon: Activity,
  },
];

export function AdminNav() {
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
