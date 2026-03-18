import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { mapDatabaseError } from "@/lib/errorMapper";

export type LeadStatus = "new" | "contacted" | "trial_booked" | "trial_done" | "interested" | "not_interested" | "converted";
export type LeadTemperature = "hot" | "warm" | "cold";
export type LeadSource = "instagram" | "walk_in" | "referral" | "website" | "other";
export type LeadActivityType = "call" | "whatsapp" | "visit" | "trial" | "note" | "status_change";

export interface Lead {
  id: string;
  gym_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  source: LeadSource;
  interest_plan: string | null;
  status: LeadStatus;
  temperature: LeadTemperature;
  assigned_to: string | null;
  next_follow_up_at: string | null;
  last_contacted_at: string | null;
  follow_up_count: number;
  notes: string | null;
  converted_member_id: string | null;
  trial_scheduled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadActivity {
  id: string;
  gym_id: string;
  lead_id: string;
  activity_type: LeadActivityType;
  description: string | null;
  performed_by: string | null;
  created_at: string;
}

export interface LeadAnalytics {
  total_leads: number;
  new_leads_this_month: number;
  converted_leads_this_month: number;
  conversion_rate: number;
  hot_leads_count: number;
  overdue_followups_count: number;
  average_conversion_time_days: number;
}

export function useLeads() {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["leads", gymId],
    queryFn: async () => {
      if (!gymId) return [];
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("gym_id", gymId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as Lead[];
    },
    enabled: !!gymId,
  });
}

export function useLeadActivities(leadId: string) {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["lead-activities", leadId],
    queryFn: async () => {
      if (!gymId || !leadId) return [];
      const { data, error } = await supabase
        .from("lead_activities")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as LeadActivity[];
    },
    enabled: !!gymId && !!leadId,
  });
}

export function useLeadAnalytics() {
  const { gymId } = useAuth();
  return useQuery({
    queryKey: ["lead-analytics", gymId],
    queryFn: async () => {
      if (!gymId) return null;
      const { data, error } = await supabase.rpc("get_lead_analytics", { _gym_id: gymId });
      if (error) throw error;
      return (data as unknown as LeadAnalytics[])?.[0] || null;
    },
    enabled: !!gymId,
    staleTime: 60_000,
  });
}

export function useCreateLead() {
  const { gymId, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lead: {
      full_name: string;
      phone: string;
      email?: string;
      source: LeadSource;
      interest_plan?: string;
      notes?: string;
      assigned_to?: string;
    }) => {
      if (!gymId) throw new Error("No gym selected");

      const nextFollowUp = new Date();
      nextFollowUp.setDate(nextFollowUp.getDate() + 1);

      const { data, error } = await supabase
        .from("leads")
        .insert([{
          gym_id: gymId,
          full_name: lead.full_name,
          phone: lead.phone,
          email: lead.email?.toLowerCase().trim() || null,
          source: lead.source,
          interest_plan: lead.interest_plan || null,
          notes: lead.notes || null,
          assigned_to: lead.assigned_to || null,
          status: 'new' as const,
          temperature: 'warm' as const,
          next_follow_up_at: nextFollowUp.toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;

      // Log creation activity
      await supabase.from("lead_activities").insert({
        gym_id: gymId,
        lead_id: data.id,
        activity_type: 'note' as const,
        description: `Lead created from ${lead.source}`,
        performed_by: user?.id || null,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead-analytics"] });
      toast.success("Lead added successfully!");
    },
    onError: (error: Error) => {
      toast.error(mapDatabaseError(error));
    },
  });
}

export function useUpdateLead() {
  const { gymId, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Lead> & { id: string }) => {
      const { data, error } = await supabase
        .from("leads")
        .update(updates)
        .eq("id", id)
        .eq("gym_id", gymId!)
        .select()
        .single();
      if (error) throw error;

      // Log status change
      if (updates.status) {
        await supabase.from("lead_activities").insert({
          gym_id: gymId!,
          lead_id: id,
          activity_type: 'status_change' as const,
          description: `Status changed to ${updates.status}`,
          performed_by: user?.id || null,
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["lead-activities"] });
      toast.success("Lead updated!");
    },
    onError: (error: Error) => {
      toast.error(mapDatabaseError(error));
    },
  });
}

export function useDeleteLead() {
  const { gymId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await supabase
        .from("leads")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", leadId)
        .eq("gym_id", gymId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead-analytics"] });
      toast.success("Lead removed");
    },
    onError: (error: Error) => {
      toast.error(mapDatabaseError(error));
    },
  });
}

export function useLogLeadActivity() {
  const { gymId, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activity: {
      lead_id: string;
      activity_type: LeadActivityType;
      description: string;
    }) => {
      if (!gymId) throw new Error("No gym selected");
      const { error } = await supabase.from("lead_activities").insert({
        gym_id: gymId,
        lead_id: activity.lead_id,
        activity_type: activity.activity_type,
        description: activity.description,
        performed_by: user?.id || null,
      });
      if (error) throw error;

      // Update last_contacted_at
      if (['call', 'whatsapp', 'visit'].includes(activity.activity_type)) {
        await supabase
          .from("leads")
          .update({ last_contacted_at: new Date().toISOString() })
          .eq("id", activity.lead_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-activities"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (error: Error) => {
      toast.error(mapDatabaseError(error));
    },
  });
}

export function useConvertLead() {
  const { gymId, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, planId, planName, expiryDate }: {
      leadId: string;
      planId?: string;
      planName?: string;
      expiryDate: string;
    }) => {
      if (!gymId) throw new Error("No gym selected");

      // Get lead data
      const { data: lead, error: leadError } = await supabase
        .from("leads")
        .select("*")
        .eq("id", leadId)
        .single();
      if (leadError || !lead) throw new Error("Lead not found");

      // Create member
      const { data: member, error: memberError } = await supabase
        .from("members")
        .insert([{
          gym_id: gymId,
          full_name: lead.full_name,
          phone: lead.phone,
          email: lead.email || null,
          plan_id: planId || null,
          plan_name: planName || null,
          expiry_date: expiryDate,
          member_id: '',
          qr_token: '',
        }])
        .select()
        .single();
      if (memberError) throw memberError;

      // Update lead as converted
      await supabase
        .from("leads")
        .update({
          status: 'converted' as const,
          converted_member_id: member.id,
          next_follow_up_at: null,
        })
        .eq("id", leadId);

      // Log conversion
      await supabase.from("lead_activities").insert({
        gym_id: gymId,
        lead_id: leadId,
        activity_type: 'status_change' as const,
        description: `Converted to member: ${member.member_id}`,
        performed_by: user?.id || null,
      });

      // Auto-action: Send welcome WhatsApp (fire-and-forget, don't block conversion)
      try {
        await supabase.functions.invoke("send-member-welcome", {
          body: { member_id: member.id },
        });
      } catch (e) {
        console.warn("Welcome message failed (non-blocking):", e);
      }

      // Auto-action: Generate portal access if member has email
      if (member.email) {
        try {
          await supabase.functions.invoke("create-member-portal-access", {
            body: { member_id: member.id },
          });
        } catch (e) {
          console.warn("Portal access creation failed (non-blocking):", e);
        }
      }

      return member;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["lead-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Lead converted to member! 🎉 Welcome message sent.");
    },
    onError: (error: Error) => {
      toast.error(mapDatabaseError(error));
    },
  });
}
