import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { FolderContent } from './folder-content';

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
    <FolderContent
      userId={user.id}
      folderId={params.folderId}
      folderName={folderName}
    />
  );
}
