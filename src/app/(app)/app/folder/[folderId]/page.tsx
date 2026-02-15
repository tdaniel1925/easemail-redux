import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { FolderView } from '@/components/inbox/folder-view';

export default async function CustomFolderPage({
  params,
}: {
  params: { folderId: string };
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/signin');
  }

  // Get folder details
  const { data: folder } = await supabase
    .from('folder_mappings')
    .select('folder_name')
    .eq('user_id', user.id)
    .eq('provider_folder_id', params.folderId)
    .single();

  const folderName = folder?.folder_name || 'Folder';

  return (
    <div className="p-8">
      <PageHeader
        title={folderName}
        description="Custom folder"
      />
      <div className="mt-6">
        <FolderView userId={user.id} folderId={params.folderId} />
      </div>
    </div>
  );
}
