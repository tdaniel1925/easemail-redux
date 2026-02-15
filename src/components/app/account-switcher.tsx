'use client';

import { useAccount } from '@/hooks/use-account';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function AccountSwitcher() {
  const { selectedAccountId, setSelectedAccount, accounts, loading } = useAccount();
  const [open, setOpen] = useState(false);

  const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        Loading accounts...
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <Link href="/app/settings/accounts">
        <Button variant="outline" className="w-full justify-start">
          <Plus className="mr-2 h-4 w-4" />
          Add Email Account
        </Button>
      </Link>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className="truncate">
            {selectedAccount?.email || 'Select account...'}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandList>
            <CommandEmpty>No accounts found.</CommandEmpty>
            <CommandGroup heading="Email Accounts">
              {accounts.map((account) => (
                <CommandItem
                  key={account.id}
                  value={account.id}
                  onSelect={() => {
                    setSelectedAccount(account.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selectedAccountId === account.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm">{account.email}</span>
                    {account.is_primary && (
                      <span className="text-xs text-muted-foreground">Primary</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem asChild>
                <Link
                  href="/app/settings/accounts"
                  className="flex items-center cursor-pointer"
                  onClick={() => setOpen(false)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Account
                </Link>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
