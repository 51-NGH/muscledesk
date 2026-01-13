import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Types
export type MemberStatus = "active" | "expiring_soon" | "expired" | "blocked";
export type PaymentMode = "cash" | "upi" | "card";
export type PaymentStatus = "completed" | "pending" | "failed";
export type ExpenseCategory = "rent" | "salary" | "electricity" | "maintenance" | "other";

// ============= USER PROFILE =============
export function useUserProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user_profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, email, avatar_url")
        .eq("id", user.id)
        .single();

      if (error) return null;
      return data;
    },
    enabled: !!user?.id,
  });
}

export interface Member {
  id: string;
  gym_id: string;
  member_id: string;
  qr_token: string;
  full_name: string;
  phone: string;
  email: string | null;
  plan_id: string | null;
  plan_name: string | null;
  start_date: string;
  expiry_date: string;
  custom_price: number | null;
  status: MemberStatus;
  is_blocked: boolean;
  block_reason: string | null;
  total_visits: number;
  last_visit_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  gym_id: string;
  member_id: string;
  amount: number;
  payment_mode: PaymentMode;
  status: PaymentStatus;
  transaction_id: string | null;
  plan_id: string | null;
  plan_name: string | null;
  new_start_date: string | null;
  new_expiry_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface PaymentWithMember extends Payment {
  member: { full_name: string; member_id: string } | null;
}

export interface Expense {
  id: string;
  gym_id: string;
  category: ExpenseCategory;
  amount: number;
  description: string | null;
  expense_date: string;
  created_at: string;
}

export interface Attendance {
  id: string;
  gym_id: string;
  member_id: string;
  check_in_at: string;
  source: "qr" | "manual";
}

export interface AttendanceWithMember extends Attendance {
  member: { full_name: string; member_id: string; status: MemberStatus } | null;
}

export interface MembershipPlan {
  id: string;
  gym_id: string;
  name: string;
  description: string | null;
  duration_days: number;
  price: number;
  is_active: boolean;
}

// ============= MEMBERS =============
export function useMembers() {
  const { gymId } = useAuth();

  return useQuery({
    queryKey: ["members", gymId],
    queryFn: async () => {
      if (!gymId) return [];
      
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .eq("gym_id", gymId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as Member[];
    },
    enabled: !!gymId,
  });
}

export function useMember(memberId: string) {
  const { gymId } = useAuth();

  return useQuery({
    queryKey: ["member", memberId],
    queryFn: async () => {
      if (!gymId || !memberId) return null;
      
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .eq("id", memberId)
        .eq("gym_id", gymId)
        .single();

      if (error) throw error;
      return data as Member;
    },
    enabled: !!gymId && !!memberId,
  });
}

export function useCreateMember() {
  const { gymId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (member: {
      full_name: string;
      phone: string;
      email?: string;
      plan_id?: string;
      plan_name?: string;
      start_date?: string;
      expiry_date: string;
      custom_price?: number;
      notes?: string;
    }) => {
      if (!gymId) throw new Error("No gym selected");

      const insertData = {
        gym_id: gymId,
        full_name: member.full_name,
        phone: member.phone,
        email: member.email || null,
        plan_id: member.plan_id || null,
        plan_name: member.plan_name || null,
        start_date: member.start_date || new Date().toISOString().split("T")[0],
        expiry_date: member.expiry_date,
        custom_price: member.custom_price || null,
        notes: member.notes || null,
        member_id: '',
        qr_token: '',
      };

      const { data, error } = await supabase
        .from("members")
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      // Send welcome email if member has email
      if (data && member.email) {
        try {
          const { error: emailError } = await supabase.functions.invoke('send-member-welcome', {
            body: { member_id: data.id }
          });
          
          if (emailError) {
            console.error('Failed to send welcome email:', emailError);
            // Don't throw - member was created successfully, email is optional
          }
        } catch (emailErr) {
          console.error('Failed to send welcome email:', emailErr);
          // Don't throw - member was created successfully, email is optional
        }
      }

      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["members", gymId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_stats", gymId] });
      if (variables.email) {
        toast.success("Member added! Welcome email sent.");
      } else {
        toast.success("Member added successfully!");
      }
    },
    onError: (error: Error) => {
      if (error.message.includes("members_gym_phone_unique")) {
        toast.error("A member with this phone number already exists");
      } else {
        toast.error(error.message);
      }
    },
  });
}

export function useUpdateMember() {
  const { gymId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Member> & { id: string }) => {
      const { data, error } = await supabase
        .from("members")
        .update(updates)
        .eq("id", id)
        .eq("gym_id", gymId!)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", gymId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_stats", gymId] });
      toast.success("Member updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteMember() {
  const { gymId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      // First, delete related records to avoid foreign key constraints
      // Delete attendance records
      const { error: attendanceError } = await supabase
        .from("attendance")
        .delete()
        .eq("member_id", memberId);

      if (attendanceError) {
        console.error("Error deleting attendance:", attendanceError);
      }

      // Delete payment records
      const { error: paymentsError } = await supabase
        .from("payments")
        .delete()
        .eq("member_id", memberId);

      if (paymentsError) {
        console.error("Error deleting payments:", paymentsError);
      }

      // Delete notification logs
      const { error: notificationError } = await supabase
        .from("notification_logs")
        .delete()
        .eq("member_id", memberId);

      if (notificationError) {
        console.error("Error deleting notification logs:", notificationError);
      }

      // Delete push subscriptions
      const { error: pushError } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("member_id", memberId);

      if (pushError) {
        console.error("Error deleting push subscriptions:", pushError);
      }

      // Hard delete the member
      const { error } = await supabase
        .from("members")
        .delete()
        .eq("id", memberId)
        .eq("gym_id", gymId!);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", gymId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_stats", gymId] });
      toast.success("Member permanently deleted!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// ============= PAYMENTS =============
export function usePayments() {
  const { gymId } = useAuth();

  return useQuery({
    queryKey: ["payments", gymId],
    queryFn: async () => {
      if (!gymId) return [];

      const { data, error } = await supabase
        .from("payments")
        .select("*, member:members(full_name, member_id)")
        .eq("gym_id", gymId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as PaymentWithMember[];
    },
    enabled: !!gymId,
  });
}

export function useCreatePayment() {
  const { gymId, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payment: {
      member_id: string;
      amount: number;
      payment_mode: PaymentMode;
      plan_id?: string;
      plan_name?: string;
      new_start_date?: string;
      new_expiry_date?: string;
      notes?: string;
    }) => {
      if (!gymId) throw new Error("No gym selected");

      const { data, error } = await supabase
        .from("payments")
        .insert([{
          gym_id: gymId,
          created_by: user?.id || null,
          member_id: payment.member_id,
          amount: payment.amount,
          payment_mode: payment.payment_mode,
          plan_id: payment.plan_id || null,
          plan_name: payment.plan_name || null,
          new_start_date: payment.new_start_date || null,
          new_expiry_date: payment.new_expiry_date || null,
          notes: payment.notes || null,
        }])
        .select()
        .single();

      if (error) throw error;

      // Update member expiry if renewal - NEVER change start_date (joining date)
      if (payment.new_expiry_date) {
        await supabase
          .from("members")
          .update({
            expiry_date: payment.new_expiry_date,
            plan_id: payment.plan_id || null,
            plan_name: payment.plan_name || null,
          })
          .eq("id", payment.member_id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments", gymId] });
      queryClient.invalidateQueries({ queryKey: ["members", gymId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_stats", gymId] });
      toast.success("Payment recorded successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// ============= EXPENSES =============
export function useExpenses() {
  const { gymId } = useAuth();

  return useQuery({
    queryKey: ["expenses", gymId],
    queryFn: async () => {
      if (!gymId) return [];

      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("gym_id", gymId)
        .order("expense_date", { ascending: false });

      if (error) throw error;
      return (data || []) as Expense[];
    },
    enabled: !!gymId,
  });
}

export function useCreateExpense() {
  const { gymId, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expense: {
      category: ExpenseCategory;
      amount: number;
      description?: string;
      expense_date?: string;
    }) => {
      if (!gymId) throw new Error("No gym selected");

      const { data, error } = await supabase
        .from("expenses")
        .insert([{
          gym_id: gymId,
          created_by: user?.id || null,
          category: expense.category,
          amount: expense.amount,
          description: expense.description || null,
          expense_date: expense.expense_date || new Date().toISOString().split("T")[0],
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", gymId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_stats", gymId] });
      toast.success("Expense recorded successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// ============= ATTENDANCE =============
export function useAttendance(date?: string) {
  const { gymId } = useAuth();

  return useQuery({
    queryKey: ["attendance", gymId, date],
    queryFn: async () => {
      if (!gymId) return [];

      let query = supabase
        .from("attendance")
        .select("*, member:members(full_name, member_id, status)")
        .eq("gym_id", gymId)
        .order("check_in_at", { ascending: false });

      if (date) {
        query = query.gte("check_in_at", `${date}T00:00:00`).lt("check_in_at", `${date}T23:59:59`);
      }

      const { data, error } = await query.limit(500);

      if (error) throw error;
      return (data || []) as unknown as AttendanceWithMember[];
    },
    enabled: !!gymId,
  });
}

export function useRecordAttendance() {
  const { gymId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, source = "manual" }: { memberId: string; source?: "qr" | "manual" }) => {
      if (!gymId) throw new Error("No gym selected");

      const { data, error } = await supabase
        .from("attendance")
        .insert([{
          gym_id: gymId,
          member_id: memberId,
          source,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", gymId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_stats", gymId] });
      toast.success("Attendance recorded!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// ============= MEMBERSHIP PLANS =============
export function useMembershipPlans() {
  const { gymId } = useAuth();

  return useQuery({
    queryKey: ["membership_plans", gymId],
    queryFn: async () => {
      if (!gymId) return [];

      const { data, error } = await supabase
        .from("membership_plans")
        .select("*")
        .eq("gym_id", gymId)
        .eq("is_active", true)
        .order("price", { ascending: true });

      if (error) throw error;
      return (data || []) as MembershipPlan[];
    },
    enabled: !!gymId,
  });
}

export function useCreatePlan() {
  const { gymId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (plan: {
      name: string;
      price: number;
      duration_days: number;
      description?: string;
    }) => {
      if (!gymId) throw new Error("No gym selected");

      const { data, error } = await supabase
        .from("membership_plans")
        .insert([{
          gym_id: gymId,
          name: plan.name,
          price: plan.price,
          duration_days: plan.duration_days,
          description: plan.description || null,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membership_plans", gymId] });
      toast.success("Plan created successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdatePlan() {
  const { gymId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MembershipPlan> & { id: string }) => {
      const { data, error } = await supabase
        .from("membership_plans")
        .update(updates)
        .eq("id", id)
        .eq("gym_id", gymId!)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membership_plans", gymId] });
      toast.success("Plan updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeletePlan() {
  const { gymId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planId: string) => {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from("membership_plans")
        .update({ is_active: false })
        .eq("id", planId)
        .eq("gym_id", gymId!);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membership_plans", gymId] });
      toast.success("Plan deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// ============= DASHBOARD STATS =============
export function useDashboardStats() {
  const { gymId } = useAuth();

  return useQuery({
    queryKey: ["dashboard_stats", gymId],
    queryFn: async () => {
      if (!gymId) return null;

      // Use the RPC function for efficient stats
      const { data, error } = await supabase.rpc("get_gym_dashboard_stats", {
        _gym_id: gymId,
      });

      if (error) {
        // Fallback to manual queries if RPC fails
        const { data: members } = await supabase
          .from("members")
          .select("id, status")
          .eq("gym_id", gymId)
          .is("deleted_at", null);

        const totalMembers = members?.length || 0;
        const activeMembers = members?.filter((m) => m.status === "active").length || 0;
        const expiringMembers = members?.filter((m) => m.status === "expiring_soon").length || 0;
        const expiredMembers = members?.filter((m) => m.status === "expired").length || 0;

        const today = new Date().toISOString().split("T")[0];
        const { data: todayAttendance } = await supabase
          .from("attendance")
          .select("id")
          .eq("gym_id", gymId)
          .gte("check_in_at", `${today}T00:00:00`)
          .lt("check_in_at", `${today}T23:59:59`);

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data: monthPayments } = await supabase
          .from("payments")
          .select("amount")
          .eq("gym_id", gymId)
          .eq("status", "completed")
          .gte("created_at", startOfMonth.toISOString());

        const monthlyRevenue = monthPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

        const { data: monthExpenses } = await supabase
          .from("expenses")
          .select("amount")
          .eq("gym_id", gymId)
          .gte("expense_date", startOfMonth.toISOString().split("T")[0]);

        const monthlyExpenses = monthExpenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

        return {
          totalMembers,
          activeMembers,
          expiringMembers,
          expiredMembers,
          todayAttendance: todayAttendance?.length || 0,
          monthlyRevenue,
          monthlyExpenses,
          profit: monthlyRevenue - monthlyExpenses,
        };
      }

      // Map RPC response
      const stats = data?.[0];
      return {
        totalMembers: Number(stats?.total_members || 0),
        activeMembers: Number(stats?.active_members || 0),
        expiringMembers: Number(stats?.expiring_soon_members || 0),
        expiredMembers: Number(stats?.expired_members || 0),
        todayAttendance: Number(stats?.today_attendance || 0),
        monthlyRevenue: Number(stats?.monthly_revenue || 0),
        monthlyExpenses: Number(stats?.monthly_expenses || 0),
        profit: Number(stats?.net_profit || 0),
      };
    },
    enabled: !!gymId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

// ============= EXPIRING MEMBERS =============
export function useExpiringMembers(daysAhead: number = 7) {
  const { gymId } = useAuth();

  return useQuery({
    queryKey: ["expiring_members", gymId, daysAhead],
    queryFn: async () => {
      if (!gymId) return [];

      const { data, error } = await supabase.rpc("get_expiring_members", {
        _gym_id: gymId,
        _days_ahead: daysAhead,
      });

      if (error) throw error;
      return data || [];
    },
    enabled: !!gymId,
  });
}

// ============= REVENUE DATA =============
export function useMonthlyRevenue(monthsBack: number = 6) {
  const { gymId } = useAuth();

  return useQuery({
    queryKey: ["monthly_revenue", gymId, monthsBack],
    queryFn: async () => {
      if (!gymId) return [];

      const { data, error } = await supabase.rpc("get_monthly_revenue", {
        _gym_id: gymId,
        _months_back: monthsBack,
      });

      if (error) throw error;
      return data || [];
    },
    enabled: !!gymId,
  });
}

// ============= MONTHLY EXPENSES =============
export function useMonthlyExpenses(monthsBack: number = 6) {
  const { gymId } = useAuth();

  return useQuery({
    queryKey: ["monthly_expenses", gymId, monthsBack],
    queryFn: async () => {
      if (!gymId) return [];

      const { data, error } = await supabase.rpc("get_monthly_expenses", {
        _gym_id: gymId,
        _months_back: monthsBack,
      });

      if (error) throw error;
      return data || [];
    },
    enabled: !!gymId,
  });
}

// ============= DAILY ATTENDANCE =============
export function useDailyAttendance(daysBack: number = 7) {
  const { gymId } = useAuth();

  return useQuery({
    queryKey: ["daily_attendance", gymId, daysBack],
    queryFn: async () => {
      if (!gymId) return [];

      const { data, error } = await supabase.rpc("get_daily_attendance", {
        _gym_id: gymId,
        _days_back: daysBack,
      });

      if (error) throw error;
      return data || [];
    },
    enabled: !!gymId,
  });
}
