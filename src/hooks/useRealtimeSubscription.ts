import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook that subscribes to real-time database changes and automatically
 * invalidates React Query cache when data changes.
 * This ensures the UI is always up-to-date without manual refreshes.
 */
export function useRealtimeSubscription() {
  const queryClient = useQueryClient();
  const { gymId } = useAuth();

  const invalidateAllQueries = useCallback(() => {
    // Force immediate refetch of all gym-related queries
    queryClient.invalidateQueries({ refetchType: 'all' });
  }, [queryClient]);

  const invalidateMemberQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['members'], refetchType: 'all' });
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'], refetchType: 'all' });
    queryClient.invalidateQueries({ queryKey: ['expiring-members'], refetchType: 'all' });
  }, [queryClient]);

  const invalidateAttendanceQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['attendance'], refetchType: 'all' });
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'], refetchType: 'all' });
    queryClient.invalidateQueries({ queryKey: ['daily-attendance'], refetchType: 'all' });
  }, [queryClient]);

  const invalidatePaymentQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['payments'], refetchType: 'all' });
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'], refetchType: 'all' });
    queryClient.invalidateQueries({ queryKey: ['monthly-revenue'], refetchType: 'all' });
  }, [queryClient]);

  const invalidateExpenseQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['expenses'], refetchType: 'all' });
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'], refetchType: 'all' });
    queryClient.invalidateQueries({ queryKey: ['monthly-expenses'], refetchType: 'all' });
  }, [queryClient]);

  const invalidatePlanQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['membership-plans'], refetchType: 'all' });
  }, [queryClient]);

  useEffect(() => {
    if (!gymId) return;

    console.log('Setting up realtime subscription for gym:', gymId);

    // Create a single channel for all table subscriptions
    const channel = supabase
      .channel(`gym-${gymId}-realtime-v2`)
      // Members table changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'members',
          filter: `gym_id=eq.${gymId}`,
        },
        (payload) => {
          console.log('Realtime: Members change detected:', payload.eventType);
          invalidateMemberQueries();
        }
      )
      // Attendance table changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
          filter: `gym_id=eq.${gymId}`,
        },
        (payload) => {
          console.log('Realtime: Attendance change detected:', payload.eventType);
          invalidateAttendanceQueries();
        }
      )
      // Payments table changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `gym_id=eq.${gymId}`,
        },
        (payload) => {
          console.log('Realtime: Payments change detected:', payload.eventType);
          invalidatePaymentQueries();
        }
      )
      // Expenses table changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `gym_id=eq.${gymId}`,
        },
        (payload) => {
          console.log('Realtime: Expenses change detected:', payload.eventType);
          invalidateExpenseQueries();
        }
      )
      // Membership plans table changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'membership_plans',
          filter: `gym_id=eq.${gymId}`,
        },
        (payload) => {
          console.log('Realtime: Plans change detected:', payload.eventType);
          invalidatePlanQueries();
        }
      )
      .subscribe((status, err) => {
        console.log('Realtime subscription status:', status);
        if (err) {
          console.error('Realtime subscription error:', err);
        }
        if (status === 'SUBSCRIBED') {
          console.log('Realtime subscription active for gym:', gymId);
        }
      });

    // Cleanup subscription on unmount
    return () => {
      console.log('Unsubscribing from realtime for gym:', gymId);
      supabase.removeChannel(channel);
    };
  }, [gymId, invalidateMemberQueries, invalidateAttendanceQueries, invalidatePaymentQueries, invalidateExpenseQueries, invalidatePlanQueries]);

  return { invalidateAllQueries };
}
