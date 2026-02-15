import { useAccountContext } from '@/contexts/account-context';

/**
 * Custom hook for accessing account selection state
 *
 * @returns {Object} Account context with selectedAccountId, setSelectedAccount, accounts, and loading state
 *
 * @example
 * const { selectedAccountId, setSelectedAccount, accounts, loading } = useAccount();
 */
export function useAccount() {
  return useAccountContext();
}
