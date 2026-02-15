import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If authenticated, redirect to inbox
  if (user) {
    redirect('/app/inbox');
  }

  // If not authenticated, redirect to signin
  redirect('/auth/signin');
}
