import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemberAuth } from '@/contexts/MemberAuthContext';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { toast } from 'sonner';

/**
 * Hook that subscribes to real-time database changes for the member portal.
 * Automatically invalidates React Query cache when member-specific data changes.
 * Also triggers haptic feedback when QR code is scanned.
 */
export function useMemberRealtimeSubscription() {
  const queryClient = useQueryClient();
  const { member } = useMemberAuth();
  const { triggerScanSuccess } = useHapticFeedback();

  const invalidateMemberData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['member-data'], refetchType: 'all' });
  }, [queryClient]);

  const invalidateAttendance = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['member-attendance'], refetchType: 'all' });
    queryClient.invalidateQueries({ queryKey: ['member-data'], refetchType: 'all' });
  }, [queryClient]);

  const invalidatePayments = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['member-payments'], refetchType: 'all' });
  }, [queryClient]);

  useEffect(() => {
    if (!member?.id) return;

    console.log('Setting up member realtime subscription for member:', member.id);

    const channel = supabase
      .channel(`member-${member.id}-realtime-v2`)
      // Member record changes
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'members',
          filter: `id=eq.${member.id}`,
        },
        (payload) => {
          console.log('Realtime: Member data change detected:', payload.eventType);
          invalidateMemberData();
        }
      )
      // Attendance changes - triggers haptic feedback when QR is scanned
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance',
          filter: `member_id=eq.${member.id}`,
        },
        (payload) => {
          console.log('Realtime: Member attendance change detected:', payload.eventType);
          
          // Trigger haptic feedback for successful check-in
          triggerScanSuccess();
          
          // Show toast notification
          toast.success('Check-in recorded! 💪', {
            description: 'Your attendance has been logged.',
            duration: 3000,
          });
          
          invalidateAttendance();
        }
      )
      // Payment changes
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'payments',
          filter: `member_id=eq.${member.id}`,
        },
        (payload) => {
          console.log('Realtime: Member payment change detected:', payload.eventType);
          invalidatePayments();
        }
      )
      .subscribe((status, err) => {
        console.log('Member realtime subscription status:', status);
        if (err) {
          console.error('Member realtime subscription error:', err);
        }
        if (status === 'SUBSCRIBED') {
          console.log('Member realtime subscription active for member:', member.id);
        }
      });

    return () => {
      console.log('Unsubscribing member realtime for member:', member.id);
      supabase.removeChannel(channel);
    };
  }, [member?.id, invalidateMemberData, invalidateAttendance, invalidatePayments]);
}
