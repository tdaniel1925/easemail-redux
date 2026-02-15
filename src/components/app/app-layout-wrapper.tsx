'use client';

import { AccountProvider } from '@/contexts/account-context';
import { ReactNode } from 'react';

export function AppLayoutWrapper({ children }: { children: ReactNode }) {
  return <AccountProvider>{children}</AccountProvider>;
}
