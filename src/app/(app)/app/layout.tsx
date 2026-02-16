/**
 * Main app layout
 * Shared layout for all authenticated app pages
 */

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppNav } from '@/components/app/app-nav';
import { SignOutButton } from '@/components/auth/signout-button';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { ShortcutsProvider } from '@/components/keyboard/shortcuts-provider';
import { AppLayoutWrapper } from '@/components/app/app-layout-wrapper';
import { AccountSwitcher } from '@/components/app/account-switcher';
import { MobileSidebar } from '@/components/app/mobile-sidebar';
import { designTokens } from '@/lib/design-tokens';
import { HydrationTest } from '@/components/debug/hydration-test';
import { RouterDiagnostic } from '@/components/debug/router-diagnostic';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/signin');
  }

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();

  // Redirect to onboarding if not completed
  if (profile && !(profile as any).onboarding_completed) {
    // TODO: redirect to /onboarding when that's built (Stage 4)
  }

  return (
    <AppLayoutWrapper>
      <ShortcutsProvider>
        <HydrationTest />
        <RouterDiagnostic />
        <div className="flex min-h-screen">
          {/* Desktop Sidebar - Hidden on mobile */}
          <aside className="hidden md:block w-64 border-r border-border bg-card p-6">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className={designTokens.typography.sectionHeading}>EaseMail</h1>
                <p className="text-xs text-muted-foreground mt-1">{(profile as any)?.email}</p>
              </div>
              <NotificationBell />
            </div>

            {/* Account Switcher */}
            <div className="mb-6">
              <AccountSwitcher />
            </div>

            <AppNav />

            {/* User Menu */}
            <div className="mt-8 pt-8 border-t border-border">
              <SignOutButton />
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            {/* Mobile Header with Hamburger */}
            <header className="md:hidden sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
              <div className="flex items-center justify-between">
                <MobileSidebar userEmail={(profile as any)?.email} />
                <h1 className={designTokens.typography.sectionHeading}>EaseMail</h1>
                <NotificationBell />
              </div>
            </header>

            {children}
          </main>
        </div>
      </ShortcutsProvider>
    </AppLayoutWrapper>
  );
}
