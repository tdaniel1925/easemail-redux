'use client';

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InboxSearchProps {
  onSearch: (query: string) => void;
  initialQuery?: string;
}

export interface InboxSearchRef {
  focus: () => void;
}

export const InboxSearch = forwardRef<InboxSearchRef, InboxSearchProps>(
  ({ onSearch, initialQuery = '' }, ref) => {
    const [searchValue, setSearchValue] = useState(initialQuery);
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        inputRef.current?.focus();
      },
    }));

  // Debounced search - wait 500ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(searchValue);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchValue, onSearch]);

  const handleClear = useCallback(() => {
    setSearchValue('');
    onSearch('');
  }, [onSearch]);

    return (
      <div className="relative w-full max-w-md" role="search">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search messages..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-9 pr-9"
          aria-label="Search messages by sender, subject, or content"
        />
        {searchValue && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            aria-label="Clear search"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    );
  }
);

InboxSearch.displayName = 'InboxSearch';
