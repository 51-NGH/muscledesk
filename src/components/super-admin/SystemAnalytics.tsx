import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Building2, Users, DollarSign, TrendingUp, Activity, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export function SystemAnalytics() {
  // Fetch all gyms
  const { data: gyms, isLoading: gymsLoading } = useQuery({
    queryKey: ["super-admin-gyms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gyms")
        .select("*")
        .is("deleted_at", null);
      if (error) throw error;
      return data;
    },
  });

  // Fetch all members
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["super-admin-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("*, gym_id")
        .is("deleted_at", null);
      if (error) throw error;
      return data;
    },
  });

  // Fetch all payments
  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["super-admin-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("status", "completed");
      if (error) throw error;
      return data;
    },
  });

  // Fetch all attendance
  const { data: attendance, isLoading: attendanceLoading } = useQuery({
    queryKey: ["super-admin-attendance"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .gte("check_in_at", today);
      if (error) throw error;
      return data;
    },
  });

  // Fetch user roles
  const { data: userRoles, isLoading: rolesLoading } = useQuery({
    queryKey: ["super-admin-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  const isLoading = gymsLoading || membersLoading || paymentsLoading || attendanceLoading || rolesLoading;

  const totalRevenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const activeMembers = members?.filter(m => m.status === "active").length || 0;
  const expiredMembers = members?.filter(m => m.status === "expired").length || 0;
  const todayCheckins = attendance?.length || 0;

  const gymOwners = userRoles?.filter(r => r.role === "gym_owner").length || 0;
  const staffCount = userRoles?.filter(r => r.role === "staff").length || 0;

  // Calculate gym-wise stats
  const gymStats = gyms?.map(gym => {
    const gymMembers = members?.filter(m => m.gym_id === gym.id) || [];
    const gymPayments = payments?.filter(p => p.gym_id === gym.id) || [];
    const gymRevenue = gymPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const gymActiveMembers = gymMembers.filter(m => m.status === "active").length;
    
    return {
      ...gym,
      memberCount: gymMembers.length,
      activeMembers: gymActiveMembers,
      revenue: gymRevenue,
    };
  }) || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Level Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Gyms"
          value={gyms?.length || 0}
          icon={Building2}
          subtitle={`${gymOwners} owners, ${staffCount} staff`}
        />
        <StatCard
          title="Total Members"
          value={members?.length || 0}
          icon={Users}
          subtitle={`${activeMembers} active, ${expiredMembers} expired`}
        />
        <StatCard
          title="Total Revenue"
          value={`₹${totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          subtitle="All-time across all gyms"
        />
        <StatCard
          title="Today's Check-ins"
          value={todayCheckins}
          icon={Activity}
          subtitle="Across all gyms"
        />
      </div>

      {/* Gym-wise Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Gym Performance Overview
          </CardTitle>
          <CardDescription>
            Revenue and member statistics for each gym
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {gymStats.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No gyms registered yet</p>
            ) : (
              <div className="grid gap-4">
                {gymStats.map((gym) => (
                  <div
                    key={gym.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{gym.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {gym.city || "No city"} • {gym.plan.toUpperCase()} plan
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-6 text-sm">
                      <div className="text-center">
                        <p className="font-semibold text-lg">{gym.memberCount}</p>
                        <p className="text-muted-foreground">Members</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-lg text-green-600">{gym.activeMembers}</p>
                        <p className="text-muted-foreground">Active</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-lg">₹{gym.revenue.toLocaleString()}</p>
                        <p className="text-muted-foreground">Revenue</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          gym.is_active ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                        }`}>
                          {gym.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Plan Distribution */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Lite Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {gyms?.filter(g => g.plan === "lite").length || 0}
            </div>
            <p className="text-xs text-muted-foreground">gyms (100 members limit)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Standard Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {gyms?.filter(g => g.plan === "standard").length || 0}
            </div>
            <p className="text-xs text-muted-foreground">gyms (500 members limit)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pro Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {gyms?.filter(g => g.plan === "pro").length || 0}
            </div>
            <p className="text-xs text-muted-foreground">gyms (unlimited members)</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
