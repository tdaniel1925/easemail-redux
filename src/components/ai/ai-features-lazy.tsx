'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

export const AIRemixDialog = dynamic(
  () => import('./ai-remix-dialog').then((mod) => ({ default: mod.AIRemixDialog })),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    ),
  }
);

export const AIDictateButton = dynamic(
  () => import('./ai-dictate-button').then((mod) => ({ default: mod.AIDictateButton })),
  {
    loading: () => null,
  }
);

export const AIExtractEventButton = dynamic(
  () => import('./ai-extract-event-button').then((mod) => ({ default: mod.AIExtractEventButton })),
  {
    loading: () => null,
  }
);
