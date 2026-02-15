import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SentContent } from './sent-content';

export default async function SentPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/signin');
  }

  return <SentContent userId={user.id} />;
}
