import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type GymPlan = "lite" | "standard" | "pro";

export interface PlanFeatures {
  plan: GymPlan;
  memberLimit: number;
  hasExpenseTracking: boolean;
  hasAdvancedAnalytics: boolean;
  hasAutomatedAlerts: boolean;
  hasStaffManagement: boolean;
  hasMultiBranch: boolean;
  // Derived features for Lite plan restrictions
  hasQRAttendance: boolean;
  hasPaymentsPage: boolean;
  hasRemindersPage: boolean;
  hasAnalyticsPage: boolean;
  hasMemberPortal: boolean;
  hasCharts: boolean;
  maxPlans: number;
}

const DEFAULT_FEATURES: PlanFeatures = {
  plan: "lite",
  memberLimit: 100,
  hasExpenseTracking: false,
  hasAdvancedAnalytics: false,
  hasAutomatedAlerts: false,
  hasStaffManagement: false,
  hasMultiBranch: false,
  hasQRAttendance: false,
  hasPaymentsPage: false,
  hasRemindersPage: false,
  hasAnalyticsPage: false,
  hasMemberPortal: false,
  hasCharts: false,
  maxPlans: 3,
};

export function useGymPlanFeatures() {
  const { gymId } = useAuth();

  return useQuery({
    queryKey: ["gym_plan_features", gymId],
    queryFn: async (): Promise<PlanFeatures> => {
      if (!gymId) return DEFAULT_FEATURES;

      // Get gym plan
      const { data: gym, error: gymError } = await supabase
        .from("gyms")
        .select("plan")
        .eq("id", gymId)
        .single();

      if (gymError || !gym) {
        console.error("Error fetching gym plan:", gymError);
        return DEFAULT_FEATURES;
      }

      const currentPlan = gym.plan as GymPlan;

      // Get plan limits
      const { data: planLimits, error: limitsError } = await supabase
        .from("plan_limits")
        .select("*")
        .eq("plan", currentPlan)
        .single();

      if (limitsError || !planLimits) {
        console.error("Error fetching plan limits:", limitsError);
        return { ...DEFAULT_FEATURES, plan: currentPlan };
      }

      // Derive features based on plan
      const isLite = currentPlan === "lite";
      const isStandardOrAbove = currentPlan === "standard" || currentPlan === "pro";
      const isPro = currentPlan === "pro";

      return {
        plan: currentPlan,
        memberLimit: planLimits.member_limit,
        hasExpenseTracking: planLimits.has_expense_tracking,
        hasAdvancedAnalytics: planLimits.has_advanced_analytics,
        hasAutomatedAlerts: planLimits.has_automated_alerts,
        hasStaffManagement: planLimits.has_staff_management,
        hasMultiBranch: planLimits.has_multi_branch,
        // Lite restrictions
        hasQRAttendance: isStandardOrAbove, // No QR for lite
        hasPaymentsPage: isStandardOrAbove, // No payments page for lite
        hasRemindersPage: isStandardOrAbove, // No reminders for lite
        hasAnalyticsPage: isStandardOrAbove, // No analytics for lite
        hasMemberPortal: isStandardOrAbove, // No member app/emails for lite
        hasCharts: isStandardOrAbove, // No charts in dashboard for lite
        maxPlans: isLite ? 3 : (isPro ? 999 : 10), // Lite: 3, Standard: 10, Pro: unlimited
      };
    },
    enabled: !!gymId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Helper hook to check if a feature is available
export function useFeatureAccess(feature: keyof PlanFeatures): boolean {
  const { data: features } = useGymPlanFeatures();
  if (!features) return false;
  return !!features[feature];
}
