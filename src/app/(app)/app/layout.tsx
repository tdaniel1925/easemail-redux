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
import { designTokens } from '@/lib/design-tokens';

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
    <ShortcutsProvider>
      <div className="flex min-h-screen">
        {/* Main Sidebar */}
        <aside className="w-64 border-r border-border bg-card p-6">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className={designTokens.typography.sectionHeading}>EaseMail</h1>
              <p className="text-xs text-muted-foreground mt-1">{(profile as any)?.email}</p>
            </div>
            <NotificationBell />
          </div>
          <AppNav />

          {/* User Menu */}
          <div className="mt-8 pt-8 border-t border-border">
            <SignOutButton />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </ShortcutsProvider>
  );
}
