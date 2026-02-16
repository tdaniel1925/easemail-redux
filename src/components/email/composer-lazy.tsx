'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

export const EmailComposer = dynamic(
  () => import('./composer').then((mod) => ({ default: mod.EmailComposer })),
  {
    loading: () => (
      <Card className="fixed inset-0 md:inset-4 z-50 flex items-center justify-center bg-background shadow-2xl md:rounded-lg rounded-none">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading composer...</p>
        </div>
      </Card>
    ),
    ssr: false, // TipTap editor requires client-side rendering
  }
);
