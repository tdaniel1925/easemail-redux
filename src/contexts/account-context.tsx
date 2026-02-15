'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';

interface EmailAccount {
  id: string;
  email: string;
  provider: string;
  is_primary: boolean | null;
  archived_at: string | null;
}

interface AccountContextType {
  selectedAccountId: string | null;
  setSelectedAccount: (accountId: string) => void;
  accounts: EmailAccount[];
  loading: boolean;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

const STORAGE_KEY = 'easemail_selected_account';

export function AccountProvider({ children }: { children: ReactNode }) {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Load accounts from database
  useEffect(() => {
    loadAccounts();
  }, []);

  // Load selected account from localStorage on mount
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (stored && accounts.find(acc => acc.id === stored)) {
        // Use stored account if it exists
        setSelectedAccountId(stored);
      } else {
        // Default to primary account, or first account if no primary
        const primaryAccount = accounts.find(acc => acc.is_primary);
        const defaultAccount = primaryAccount || accounts[0];
        setSelectedAccountId(defaultAccount.id);
        localStorage.setItem(STORAGE_KEY, defaultAccount.id);
      }
    }
  }, [accounts, selectedAccountId]);

  async function loadAccounts() {
    try {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('email_accounts')
        .select('id, email, provider, is_primary, archived_at')
        .eq('user_id', user.id)
        .is('archived_at', null)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to load email accounts:', error);
        setLoading(false);
        return;
      }

      setAccounts(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading accounts:', error);
      setLoading(false);
    }
  }

  function setSelectedAccount(accountId: string) {
    setSelectedAccountId(accountId);
    localStorage.setItem(STORAGE_KEY, accountId);
  }

  return (
    <AccountContext.Provider
      value={{
        selectedAccountId,
        setSelectedAccount,
        accounts,
        loading,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccountContext() {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccountContext must be used within an AccountProvider');
  }
  return context;
}
