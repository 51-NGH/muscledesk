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
          // Invalidate and refetch all member-related queries immediately
          queryClient.invalidateQueries({ queryKey: ['members'], refetchType: 'all' });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'], refetchType: 'all' });
          queryClient.invalidateQueries({ queryKey: ['expiring-members'], refetchType: 'all' });
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
          // Invalidate and refetch attendance and dashboard queries immediately
          queryClient.invalidateQueries({ queryKey: ['attendance'], refetchType: 'all' });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'], refetchType: 'all' });
          queryClient.invalidateQueries({ queryKey: ['daily-attendance'], refetchType: 'all' });
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
          // Invalidate and refetch payment and revenue queries immediately
          queryClient.invalidateQueries({ queryKey: ['payments'], refetchType: 'all' });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'], refetchType: 'all' });
          queryClient.invalidateQueries({ queryKey: ['monthly-revenue'], refetchType: 'all' });
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
          // Invalidate and refetch expense queries immediately
          queryClient.invalidateQueries({ queryKey: ['expenses'], refetchType: 'all' });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'], refetchType: 'all' });
          queryClient.invalidateQueries({ queryKey: ['monthly-expenses'], refetchType: 'all' });
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
          // Invalidate and refetch plan queries immediately
          queryClient.invalidateQueries({ queryKey: ['membership-plans'], refetchType: 'all' });
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
