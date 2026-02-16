/**
 * Calendar View Page
 * Phase 6, Task 120: Calendar page with month/week/day views
 */

import { Suspense } from 'react';
import { CalendarContent } from './calendar-content';
import { Loader2 } from 'lucide-react';

export const metadata = {
  title: 'Calendar | EaseMail',
  description: 'Manage your calendar events',
};

export default function CalendarPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Calendar</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          View and manage your calendar events
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <Suspense
          fallback={
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          }
        >
          <CalendarContent />
        </Suspense>
      </div>
    </div>
  );
}
