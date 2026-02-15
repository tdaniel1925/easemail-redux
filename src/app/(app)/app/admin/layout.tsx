import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminNav } from '@/components/admin/admin-nav';
import { designTokens } from '@/lib/design-tokens';

export default async function AdminLayout({
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

  const { data: profile } = await supabase.from('users').select('is_super_admin').eq('id', user.id).single();

  if (!(profile as any)?.is_super_admin) {
    redirect('/app/inbox');
  }

  return (
    <div className="flex min-h-screen">
      {/* Admin Sidebar */}
      <aside className="w-64 border-r border-border bg-card p-6">
        <div className="mb-8">
          <h2 className={designTokens.typography.sectionHeading}>Admin Panel</h2>
          <p className="text-xs text-muted-foreground mt-1">Super Admin Access</p>
        </div>
        <AdminNav />
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
