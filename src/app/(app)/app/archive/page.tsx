import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { FolderView } from '@/components/inbox/folder-view';

export default async function ArchivePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/signin');
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Archive"
        description="Archived messages"
      />
      <div className="mt-6">
        <FolderView userId={user.id} folderType="archive" />
      </div>
    </div>
  );
}
