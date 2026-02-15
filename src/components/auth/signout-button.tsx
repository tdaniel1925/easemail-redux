'use client';

import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/auth/actions';
import { toast } from 'sonner';

export function SignOutButton() {
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  return (
    <Button onClick={handleSignOut} variant="outline">
      Sign Out
    </Button>
  );
}
