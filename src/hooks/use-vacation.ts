'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface VacationResponder {
  id: string;
  user_id: string;
  account_id: string;
  enabled: boolean;
  start_date: string | null;
  end_date: string | null;
  message: string;
  created_at: string;
  updated_at: string;
}

interface SetVacationParams {
  accountId: string;
  enabled: boolean;
  startDate?: string | null;
  endDate?: string | null;
  message: string;
}

async function fetchVacationResponder(accountId: string): Promise<VacationResponder | null> {
  const response = await fetch(`/api/vacation/set?accountId=${accountId}`);

  if (!response.ok) {
    throw new Error('Failed to fetch vacation responder');
  }

  const data = await response.json();
  return data.vacationResponder;
}

async function setVacationResponder(params: SetVacationParams): Promise<VacationResponder> {
  const response = await fetch('/api/vacation/set', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to set vacation responder');
  }

  const data = await response.json();
  return data.vacationResponder;
}

export function useVacation(accountId: string) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch vacation responder
  const {
    data: vacationResponder,
    isLoading,
    error,
    refetch,
  } = useQuery<VacationResponder | null>({
    queryKey: ['vacation-responder', accountId],
    queryFn: () => fetchVacationResponder(accountId),
    enabled: !!accountId,
  });

  // Set vacation responder mutation
  const setVacationMutation = useMutation({
    mutationFn: setVacationResponder,
    onSuccess: (data) => {
      queryClient.setQueryData(['vacation-responder', accountId], data);
      toast.success(
        data.enabled
          ? 'Vacation responder enabled'
          : 'Vacation responder disabled'
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update vacation responder');
    },
  });

  const setVacation = useCallback(
    async (params: Omit<SetVacationParams, 'accountId'>) => {
      setIsSubmitting(true);
      try {
        await setVacationMutation.mutateAsync({
          accountId,
          ...params,
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [accountId, setVacationMutation]
  );

  const enableVacation = useCallback(
    async (startDate: string | null, endDate: string | null, message: string) => {
      await setVacation({
        enabled: true,
        startDate,
        endDate,
        message,
      });
    },
    [setVacation]
  );

  const disableVacation = useCallback(async () => {
    if (!vacationResponder) {
      toast.error('No vacation responder found');
      return;
    }

    await setVacation({
      enabled: false,
      startDate: vacationResponder.start_date,
      endDate: vacationResponder.end_date,
      message: vacationResponder.message,
    });
  }, [vacationResponder, setVacation]);

  const isActive = useCallback(() => {
    if (!vacationResponder || !vacationResponder.enabled) {
      return false;
    }

    const now = new Date();
    const startDate = vacationResponder.start_date ? new Date(vacationResponder.start_date) : null;
    const endDate = vacationResponder.end_date ? new Date(vacationResponder.end_date) : null;

    // If no dates specified, it's active
    if (!startDate && !endDate) {
      return true;
    }

    // If only start date, active if current date >= start date
    if (startDate && !endDate) {
      return now >= startDate;
    }

    // If only end date, active if current date <= end date
    if (!startDate && endDate) {
      return now <= endDate;
    }

    // If both dates, active if current date is between them
    if (startDate && endDate) {
      return now >= startDate && now <= endDate;
    }

    return false;
  }, [vacationResponder]);

  return {
    vacationResponder,
    isLoading,
    error,
    isSubmitting,
    isActive: isActive(),
    setVacation,
    enableVacation,
    disableVacation,
    refetch,
  };
}
