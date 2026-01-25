import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook to subscribe to real-time fingerprint attendance updates
 * Automatically refreshes queries when new fingerprint check-ins occur
 */
export function useFingerprintRealtimeSubscription() {
  const { gymId } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!gymId) return;

    // Subscribe to fingerprint attendance inserts
    const channel = supabase
      .channel(`fingerprint-attendance-${gymId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "attendance",
          filter: `gym_id=eq.${gymId}`,
        },
        (payload) => {
          // Only refresh for fingerprint source
          if (payload.new && payload.new.source === "fingerprint") {
            queryClient.invalidateQueries({ queryKey: ["fingerprint-attendance"] });
            queryClient.invalidateQueries({ queryKey: ["attendance"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fingerprint_devices",
          filter: `gym_id=eq.${gymId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["fingerprint-devices"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gymId, queryClient]);
}
