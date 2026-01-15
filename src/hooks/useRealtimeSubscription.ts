import { useEffect } from 'react';
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

  useEffect(() => {
    if (!gymId) return;

    // Create a single channel for all table subscriptions
    const channel = supabase
      .channel(`gym-${gymId}-realtime`)
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
          console.log('Members change:', payload.eventType);
          // Invalidate all member-related queries
          queryClient.invalidateQueries({ queryKey: ['members'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          queryClient.invalidateQueries({ queryKey: ['expiring-members'] });
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
          console.log('Attendance change:', payload.eventType);
          // Invalidate attendance and dashboard queries
          queryClient.invalidateQueries({ queryKey: ['attendance'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          queryClient.invalidateQueries({ queryKey: ['daily-attendance'] });
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
          console.log('Payments change:', payload.eventType);
          // Invalidate payment and revenue queries
          queryClient.invalidateQueries({ queryKey: ['payments'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          queryClient.invalidateQueries({ queryKey: ['monthly-revenue'] });
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
          console.log('Expenses change:', payload.eventType);
          // Invalidate expense queries
          queryClient.invalidateQueries({ queryKey: ['expenses'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          queryClient.invalidateQueries({ queryKey: ['monthly-expenses'] });
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
          console.log('Plans change:', payload.eventType);
          // Invalidate plan queries
          queryClient.invalidateQueries({ queryKey: ['membership-plans'] });
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    // Cleanup subscription on unmount
    return () => {
      console.log('Unsubscribing from realtime');
      supabase.removeChannel(channel);
    };
  }, [gymId, queryClient]);
}
