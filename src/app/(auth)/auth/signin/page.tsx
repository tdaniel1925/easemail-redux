import { Metadata } from 'next';
import { Suspense } from 'react';
import { SignInForm } from '@/components/auth/signin-form';

export const metadata: Metadata = {
  title: 'Sign In - EaseMail',
  description: 'Sign in to your EaseMail account',
};

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to your EaseMail account
          </p>
        </div>

        <Suspense fallback={<div className="text-center text-sm text-muted-foreground">Loading...</div>}>
          <SignInForm />
        </Suspense>
      </div>
    </div>
  );
}
