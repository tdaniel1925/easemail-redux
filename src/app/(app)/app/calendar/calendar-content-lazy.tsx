'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

export const CalendarContent = dynamic(
  () => import('./calendar-content').then((mod) => ({ default: mod.CalendarContent })),
  {
    loading: () => (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading calendar...</p>
        </div>
      </div>
    ),
  }
);
