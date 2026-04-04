import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useCallback, useEffect } from "react";

export interface GmailIntegration {
  id: string;
  gym_id: string;
  email_address: string;
  is_active: boolean;
  connected_at: string;
  last_sync_at: string | null;
}

export function useGmailIntegration() {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["gmail-integration", gymId],
    queryFn: async () => {
      if (!gymId) return null;
      const { data, error } = await supabase
        .from("gmail_integrations")
        .select("id, gym_id, email_address, is_active, connected_at, last_sync_at")
        .eq("gym_id", gymId)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data as GmailIntegration | null;
    },
    enabled: !!gymId,
  });
}

export function useConnectGmail() {
  const { gymId } = useAuth();
  const queryClient = useQueryClient();

  const connectMutation = useMutation({
    mutationFn: async () => {
      if (!gymId) throw new Error("No gym selected");
      const { data, error } = await supabase.functions.invoke("gmail-oauth-start", {
        body: { gym_id: gymId },
      });
      if (error) throw error;
      return data.auth_url as string;
    },
    onError: (error: Error) => {
      toast.error(`Failed to start Gmail connection: ${error.message}`);
    },
  });

  // Listen for OAuth callback
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'gmail-oauth-success') {
        toast.success("Gmail connected successfully!");
        queryClient.invalidateQueries({ queryKey: ["gmail-integration"] });
      } else if (event.data?.type === 'gmail-oauth-error') {
        toast.error(event.data.message || "Gmail connection failed");
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [queryClient]);

  const connect = useCallback(async () => {
    const url = await connectMutation.mutateAsync();
    if (url) {
      window.open(url, 'gmail-oauth', 'width=500,height=600,scrollbars=yes');
    }
  }, [connectMutation]);

  return { connect, isConnecting: connectMutation.isPending };
}

export function useDisconnectGmail() {
  const { gymId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!gymId) throw new Error("No gym selected");
      const { error } = await supabase.functions.invoke("gmail-disconnect", {
        body: { gym_id: gymId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gmail-integration"] });
      toast.success("Gmail disconnected");
    },
    onError: (error: Error) => {
      toast.error(`Failed to disconnect: ${error.message}`);
    },
  });
}

export function useSyncGmail() {
  const { gymId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!gymId) throw new Error("No gym selected");
      const { data, error } = await supabase.functions.invoke("gmail-sync", {
        body: { gym_id: gymId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const result = data?.results?.[0];
      if (result?.error) {
        toast.error(`Sync error: ${result.error}`);
      } else {
        toast.success(`Synced: ${result?.synced || 0} new leads found`);
      }
      queryClient.invalidateQueries({ queryKey: ["email-leads"] });
      queryClient.invalidateQueries({ queryKey: ["gmail-integration"] });
    },
    onError: (error: Error) => {
      toast.error(`Sync failed: ${error.message}`);
    },
  });
}
