import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemberAuth } from '@/contexts/MemberAuthContext';

/**
 * Hook for member portal real-time subscriptions.
 * Automatically updates member data when changes occur.
 */
export function useMemberRealtimeSubscription() {
  const queryClient = useQueryClient();
  const { member } = useMemberAuth();

  useEffect(() => {
    if (!member?.id) return;

    const channel = supabase
      .channel(`member-${member.id}-realtime`)
      // Member's own record changes
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'members',
          filter: `id=eq.${member.id}`,
        },
        () => {
          console.log('Member record updated');
          queryClient.invalidateQueries({ queryKey: ['member-data'] });
        }
      )
      // Member's attendance changes
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance',
          filter: `member_id=eq.${member.id}`,
        },
        () => {
          console.log('New attendance recorded');
          queryClient.invalidateQueries({ queryKey: ['member-attendance'] });
          queryClient.invalidateQueries({ queryKey: ['member-data'] });
        }
      )
      // Member's payment changes
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'payments',
          filter: `member_id=eq.${member.id}`,
        },
        () => {
          console.log('New payment recorded');
          queryClient.invalidateQueries({ queryKey: ['member-payments'] });
          queryClient.invalidateQueries({ queryKey: ['member-data'] });
        }
      )
      .subscribe((status) => {
        console.log('Member realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [member?.id, queryClient]);
}
