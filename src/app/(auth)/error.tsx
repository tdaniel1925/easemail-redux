'use client';

/**
 * Error Boundary for Auth Routes
 * Catches runtime errors in authentication pages
 */

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console for debugging
    console.error('Auth route error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="max-w-md p-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-destructive flex-shrink-0 mt-1" />
          <div className="space-y-4 flex-1">
            <div>
              <h2 className="text-xl font-semibold">Authentication Error</h2>
              <p className="text-sm text-muted-foreground mt-2">
                {error.message || 'An error occurred during authentication. Please try again.'}
              </p>
              {error.digest && (
                <p className="text-xs text-muted-foreground mt-2">
                  Error ID: {error.digest}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={reset} variant="default">
                Try again
              </Button>
              <Button onClick={() => window.location.href = '/auth/signin'} variant="outline">
                Back to sign in
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
