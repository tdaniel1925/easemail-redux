'use client';

import { cn } from '@/lib/utils';

interface MessageRowSkeletonProps {
  count?: number;
}

export function MessageRowSkeleton({ count = 5 }: MessageRowSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'flex w-full items-start gap-3 rounded-lg border-l-4 border-l-transparent px-4 py-3 min-h-[60px] bg-background'
          )}
        >
          {/* Star icon skeleton */}
          <div className="flex-shrink-0 pt-0.5">
            <div className="h-4 w-4 rounded bg-muted animate-pulse" />
          </div>

          {/* Message content skeleton */}
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {/* From name skeleton */}
            <div className="flex items-center gap-2">
              <div className="h-4 w-32 rounded bg-muted animate-pulse" />
            </div>

            {/* Subject skeleton */}
            <div className="flex items-center gap-2">
              <div className="h-4 w-48 rounded bg-muted animate-pulse" />
            </div>

            {/* Snippet skeleton */}
            <div className="h-3 w-64 rounded bg-muted animate-pulse" />
          </div>

          {/* Date skeleton */}
          <div className="flex-shrink-0 pt-0.5">
            <div className="h-3 w-12 rounded bg-muted animate-pulse" />
          </div>
        </div>
      ))}
    </>
  );
}
