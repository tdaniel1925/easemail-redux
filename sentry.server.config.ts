import * as Sentry from '@sentry/nextjs';

// TEMPORARILY DISABLED TO DEBUG NAVIGATION ISSUE
// Sentry.init({
//   dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
//   tracesSampleRate: 1.0,
//   debug: false,
//   environment: process.env.NODE_ENV,
//   enabled: process.env.NODE_ENV === 'production',
// });
