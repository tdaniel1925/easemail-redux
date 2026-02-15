'use client';

/**
 * Signature selector dropdown for composer
 * Allows user to select which signature to insert
 */

import { useState } from 'react';
import { useSignature } from '@/hooks/use-signature';
import type { Signature } from '@/types/database';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface SignatureSelectorProps {
  // Email account ID to filter signatures
  accountId?: string;
  // Currently selected signature ID
  value?: string | null;
  // Callback when signature changes
  onChange?: (signature: Signature | null) => void;
  // Whether to show "No signature" option
  allowNone?: boolean;
}

export function SignatureSelector({
  accountId,
  value,
  onChange,
  allowNone = true,
}: SignatureSelectorProps) {
  const { signatures, defaultSignature, isLoading } = useSignature({
    accountId,
    autoSelectDefault: false,
  });

  // Local state for controlled component
  const [selectedId, setSelectedId] = useState<string>(
    value || defaultSignature?.id || 'none'
  );

  const handleChange = (newValue: string) => {
    setSelectedId(newValue);

    if (newValue === 'none') {
      onChange?.(null);
    } else {
      const signature = signatures.find((sig) => sig.id === newValue);
      onChange?.(signature || null);
    }
  };

  if (isLoading) {
    return (
      <div className="w-[200px] h-10 bg-gray-100 animate-pulse rounded-md" />
    );
  }

  return (
    <Select value={selectedId} onValueChange={handleChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select signature" />
      </SelectTrigger>
      <SelectContent>
        {allowNone && (
          <SelectItem value="none">No signature</SelectItem>
        )}
        {signatures.map((signature) => (
          <SelectItem key={signature.id} value={signature.id}>
            {signature.name}
            {signature.is_default && (
              <span className="ml-2 text-xs text-gray-500">(Default)</span>
            )}
          </SelectItem>
        ))}
        {signatures.length === 0 && !allowNone && (
          <SelectItem value="none" disabled>
            No signatures available
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
