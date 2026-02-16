'use client';

/**
 * Mobile Sidebar Component
 * Slide-in sidebar for mobile devices (<768px)
 */

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { AppNav } from '@/components/app/app-nav';
import { AccountSwitcher } from '@/components/app/account-switcher';
import { SignOutButton } from '@/components/auth/signout-button';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { designTokens } from '@/lib/design-tokens';

interface MobileSidebarProps {
  userEmail?: string;
}

export function MobileSidebar({ userEmail }: MobileSidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-6 w-6" />
        <span className="sr-only">Toggle navigation menu</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="fixed inset-y-0 left-0 h-full w-64 max-w-none p-0 rounded-none border-r data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left"
          showCloseButton={false}
        >
          <div className="flex h-full flex-col p-6">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <DialogTitle className={designTokens.typography.sectionHeading}>
                  EaseMail
                </DialogTitle>
                {userEmail && (
                  <p className="text-xs text-muted-foreground mt-1">{userEmail}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <NotificationBell />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setOpen(false)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Account Switcher */}
            <div className="mb-6">
              <AccountSwitcher />
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto" onClick={() => setOpen(false)}>
              <AppNav />
            </div>

            {/* Sign Out Button */}
            <div className="mt-8 pt-8 border-t border-border">
              <SignOutButton />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
