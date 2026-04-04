import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { mapDatabaseError } from "@/lib/errorMapper";

export type EmailLeadStatus = "new" | "contacted" | "interested" | "trial" | "negotiation" | "converted" | "not_interested";
export type EmailLeadTemperature = "hot" | "warm" | "cold";

export interface EmailLead {
  id: string;
  gym_id: string;
  sender_email: string;
  sender_name: string | null;
  subject: string | null;
  email_body: string | null;
  lead_status: EmailLeadStatus;
  temperature: EmailLeadTemperature;
  source: string;
  gmail_thread_id: string | null;
  gmail_message_id: string | null;
  assigned_to: string | null;
  notes: string | null;
  converted_member_id: string | null;
  next_follow_up_at: string | null;
  last_contacted_at: string | null;
  follow_up_count: number;
  created_at: string;
  updated_at: string;
}

export interface EmailLeadFilter {
  id: string;
  gym_id: string;
  keyword: string;
  filter_location: string;
  is_active: boolean;
}

export function useEmailLeads(statusFilter?: EmailLeadStatus | null) {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["email-leads", gymId, statusFilter],
    queryFn: async () => {
      if (!gymId) return [];
      let query = supabase
        .from("email_leads")
        .select("*")
        .eq("gym_id", gymId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(200);
      
      if (statusFilter) {
        query = query.eq("lead_status", statusFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as EmailLead[];
    },
    enabled: !!gymId,
  });
}

export function useUpdateEmailLead() {
  const { gymId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EmailLead> & { id: string }) => {
      const { data, error } = await supabase
        .from("email_leads")
        .update(updates)
        .eq("id", id)
        .eq("gym_id", gymId!)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-leads"] });
      toast.success("Lead updated!");
    },
    onError: (error: Error) => {
      toast.error(mapDatabaseError(error));
    },
  });
}

export function useReplyToLead() {
  const { gymId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ lead_id, message }: { lead_id: string; message: string }) => {
      if (!gymId) throw new Error("No gym selected");
      const { data, error } = await supabase.functions.invoke("gmail-reply", {
        body: { lead_id, message, gym_id: gymId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-leads"] });
      queryClient.invalidateQueries({ queryKey: ["email-reply-logs"] });
      toast.success("Reply sent!");
    },
    onError: (error: Error) => {
      toast.error(`Reply failed: ${error.message}`);
    },
  });
}

export function useEmailLeadFilters() {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["email-lead-filters", gymId],
    queryFn: async () => {
      if (!gymId) return [];
      const { data, error } = await supabase
        .from("lead_email_filters")
        .select("*")
        .eq("gym_id", gymId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as EmailLeadFilter[];
    },
    enabled: !!gymId,
  });
}

export function useCreateEmailFilter() {
  const { gymId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (filter: { keyword: string; filter_location: string }) => {
      if (!gymId) throw new Error("No gym selected");
      const { error } = await supabase
        .from("lead_email_filters")
        .insert({ gym_id: gymId, ...filter });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-lead-filters"] });
      toast.success("Filter added!");
    },
    onError: (error: Error) => {
      toast.error(mapDatabaseError(error));
    },
  });
}

export function useDeleteEmailFilter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (filterId: string) => {
      const { error } = await supabase
        .from("lead_email_filters")
        .delete()
        .eq("id", filterId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-lead-filters"] });
      toast.success("Filter removed");
    },
    onError: (error: Error) => {
      toast.error(mapDatabaseError(error));
    },
  });
}

export function useEmailReplyLogs(leadId: string) {
  return useQuery({
    queryKey: ["email-reply-logs", leadId],
    queryFn: async () => {
      if (!leadId) return [];
      const { data, error } = await supabase
        .from("email_reply_logs")
        .select("*")
        .eq("email_lead_id", leadId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!leadId,
  });
}

export function useLeadFollowups(leadId?: string) {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["lead-followups", gymId, leadId],
    queryFn: async () => {
      if (!gymId) return [];
      let query = supabase
        .from("lead_followups")
        .select("*")
        .eq("gym_id", gymId)
        .order("follow_up_at", { ascending: true });
      
      if (leadId) query = query.eq("email_lead_id", leadId);
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!gymId,
  });
}

export function useCreateFollowup() {
  const { gymId, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email_lead_id, follow_up_at, notes }: {
      email_lead_id: string;
      follow_up_at: string;
      notes?: string;
    }) => {
      if (!gymId) throw new Error("No gym selected");
      const { error } = await supabase.from("lead_followups").insert({
        email_lead_id,
        gym_id: gymId,
        follow_up_at,
        assigned_to: user?.id || null,
        notes: notes || null,
      });
      if (error) throw error;

      // Also update the lead's next_follow_up_at
      await supabase
        .from("email_leads")
        .update({ next_follow_up_at: follow_up_at })
        .eq("id", email_lead_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-followups"] });
      queryClient.invalidateQueries({ queryKey: ["email-leads"] });
      toast.success("Follow-up scheduled!");
    },
    onError: (error: Error) => {
      toast.error(mapDatabaseError(error));
    },
  });
}
