import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { MemberAvatar } from "@/components/ui/member-avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { DashboardSkeleton } from "@/components/ui/dashboard-skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { MemberProfile } from "@/components/MemberProfile";
import { DashboardSearch } from "@/components/dashboard/DashboardSearch";
import { UpgradeOverlay } from "@/components/UpgradeOverlay";
import { useAuth } from "@/contexts/AuthContext";
import { useGymPlanFeatures } from "@/hooks/useGymPlanFeatures";
import { useDashboardStats, useMembers, useAttendance, useMonthlyRevenue, useExpiringMembers, useUserProfile, useDailyAttendance, usePayments, Member } from "@/hooks/useGymData";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useEffect, useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  DollarSign,
  Calendar,
  TrendingUp,
  Search,
  UserPlus,
  Activity,
  ArrowUpRight,
  Clock,
  CheckCircle2,
} from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

// Get greeting based on time of day
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

// Get first name from full name
function getFirstName(fullName: string | null | undefined): string {
  if (!fullName) return "";
  return fullName.split(" ")[0];
}

export default function Dashboard() {
  const { gymId } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: features } = useGymPlanFeatures();
  const { data: stats, isLoading: statsLoading, isFetching: statsFetching } = useDashboardStats();
  const { data: members = [], isLoading: membersLoading } = useMembers();
  const { data: todayAttendance = [], isLoading: attendanceLoading } = useAttendance(new Date().toISOString().split("T")[0]);
  const { data: monthlyRevenue = [] } = useMonthlyRevenue(6);
  const { data: expiringMembers = [] } = useExpiringMembers(7);
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const { data: dailyAttendance = [] } = useDailyAttendance(7);
  const { data: payments = [] } = usePayments();

  // Real-time subscription for instant dashboard updates
  useEffect(() => {
    if (!gymId) return;

    const channel = supabase
      .channel(`dashboard-${gymId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
          filter: `gym_id=eq.${gymId}`,
        },
        () => {
          // Instantly invalidate all dashboard-related queries
          queryClient.invalidateQueries({ queryKey: ['attendance'], refetchType: 'all' });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'], refetchType: 'all' });
          queryClient.invalidateQueries({ queryKey: ['daily-attendance'], refetchType: 'all' });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'members',
          filter: `gym_id=eq.${gymId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['members'], refetchType: 'all' });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'], refetchType: 'all' });
          queryClient.invalidateQueries({ queryKey: ['expiring-members'], refetchType: 'all' });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `gym_id=eq.${gymId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['payments'], refetchType: 'all' });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'], refetchType: 'all' });
          queryClient.invalidateQueries({ queryKey: ['monthly-revenue'], refetchType: 'all' });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gymId, queryClient]);
  
  // Check if charts should be shown (not for Lite plan)
  const showCharts = features?.hasCharts ?? true;
  
  const [greeting, setGreeting] = useState(getGreeting());
  const [animatedStats, setAnimatedStats] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // Show skeleton while initial data loads
  const isInitialLoading = statsLoading || profileLoading;

  // Handle opening member profile from check-in
  const handleCheckInClick = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (member) {
      setSelectedMember(member);
      setIsProfileOpen(true);
    }
  };

  // Update greeting on mount and every minute
  useEffect(() => {
    setGreeting(getGreeting());
    const interval = setInterval(() => setGreeting(getGreeting()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Trigger animations after mount
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedStats(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Get user's first name
  const userName = getFirstName(profile?.full_name);

  // Recent members (last 5)
  const recentMembers = members.slice(0, 5);

  // Recent payments (last 5)
  const recentPayments = useMemo(() => payments.slice(0, 5), [payments]);

  // Format revenue data for chart
  const revenueChartData = useMemo(() => {
    const data = [...monthlyRevenue]
      .reverse()
      .map((r) => ({
        month: format(new Date(r.month), "MMM"),
        revenue: Number(r.total_revenue),
      }));

    // If no data, show empty months
    if (data.length === 0) {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
      months.forEach((month) => data.push({ month, revenue: 0 }));
    }
    return data;
  }, [monthlyRevenue]);

  // Weekly attendance data
  const weeklyAttendanceData = useMemo(() => {
    if (dailyAttendance.length === 0) return [];
    return [...dailyAttendance].reverse().map((d: any) => ({
      day: format(new Date(d.date), "EEE"),
      checkIns: Number(d.check_ins),
    }));
  }, [dailyAttendance]);

  if (!gymId) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center max-w-md animate-fade-in">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto mb-4 animate-float">
              <Calendar className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Welcome to MuscleDesk!</h2>
            <p className="text-muted-foreground mb-6">
              Your account is not yet linked to a gym. Please contact the MuscleDesk admin to get your gym assigned.
            </p>
            <Button onClick={() => navigate("/settings")}>View Settings</Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Show skeleton for initial load
  if (isInitialLoading) {
    return (
      <DashboardLayout>
        <DashboardSkeleton type="admin" />
      </DashboardLayout>
    );
  }

  const activityIconStyles: Record<string, string> = {
    member: "activity-icon-member",
    class: "activity-icon-class",
    payment: "activity-icon-payment",
    attendance: "activity-icon-attendance",
  };

  // Check if Lite plan
  const isLitePlan = features?.plan === 'lite';

  return (
    <DashboardLayout>
      {/* Lite Plan Upgrade Banner */}
      {isLitePlan && (
        <div className="mb-6 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-purple-500/5 to-primary/5 p-4 sm:p-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Unlock More Features</h3>
                <p className="text-sm text-muted-foreground">
                  Upgrade to Standard for QR attendance, payments, analytics, charts & member portal
                </p>
              </div>
            </div>
            <Button 
              onClick={() => navigate("/settings")} 
              className="gap-2 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shrink-0"
            >
              Upgrade Now
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Header with Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 lg:mb-8">
        <div className="animate-fade-in">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {greeting}, {userName || "there"}! 
            <span className="inline-block ml-2 animate-float">👋</span>
          </h1>
          <p className="text-muted-foreground mt-1">Here's what's happening at your gym today</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 animate-slide-in-right">
          <DashboardSearch
            members={members}
            onMemberClick={(member) => {
              setSelectedMember(member);
              setIsProfileOpen(true);
            }}
          />
          <NotificationCenter />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 lg:mb-8">
        <div className={`transition-all duration-500 ${animatedStats ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '0ms' }}>
          <StatCard
            title="Total Members"
            value={statsLoading ? "..." : stats?.totalMembers || 0}
            subtitle={`${stats?.activeMembers || 0} active`}
            icon={Users}
            iconVariant="teal"
          />
        </div>
        <div className={`transition-all duration-500 ${animatedStats ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '100ms' }}>
          <StatCard
            title="Monthly Revenue"
            value={statsLoading ? "..." : `₹${(stats?.monthlyRevenue || 0).toLocaleString()}`}
            subtitle="This month"
            icon={DollarSign}
            iconVariant="green"
          />
        </div>
        <div className={`transition-all duration-500 ${animatedStats ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '200ms' }}>
          <StatCard
            title="Attendance Rate"
            value={statsLoading ? "..." : `${stats?.todayAttendance || 0}`}
            subtitle="Today's check-ins"
            icon={Calendar}
            iconVariant="orange"
          />
        </div>
        <div className={`transition-all duration-500 ${animatedStats ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '300ms' }}>
          <StatCard
            title="Expiring Soon"
            value={statsLoading ? "..." : stats?.expiringMembers || 0}
            subtitle="Need renewal"
            icon={Clock}
            iconVariant="red"
          />
        </div>
      </div>

      {/* Charts & Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 lg:mb-8">
        {/* Weekly Attendance Chart */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 sm:p-5 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 relative overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-foreground">Weekly Attendance</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">Member check-ins this week</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/attendance")} className="hidden sm:flex group">
              View Details
              <ArrowUpRight className="ml-1 h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Button>
          </div>
          
          {/* Chart - takes remaining space */}
          <div className="flex-1 min-h-[180px]">
            {showCharts ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyAttendanceData.length > 0 ? weeklyAttendanceData : [{ day: 'Mon', checkIns: 0 }, { day: 'Tue', checkIns: 0 }, { day: 'Wed', checkIns: 0 }, { day: 'Thu', checkIns: 0 }, { day: 'Fri', checkIns: 0 }, { day: 'Sat', checkIns: 0 }, { day: 'Sun', checkIns: 0 }]}>
                  <defs>
                    <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--foreground))" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [value, "Check-ins"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="checkIns"
                    stroke="hsl(var(--foreground))"
                    strokeWidth={2}
                    fill="url(#colorAttendance)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <UpgradeOverlay
                feature="Attendance Charts"
                description="Visualize attendance trends and patterns with interactive charts"
                minHeight="180px"
              />
            )}
          </div>
          
          {/* Weekly Stats - responsive grid (only for Standard+) */}
          {showCharts && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-4 pt-4 border-t border-border">
              <div className="rounded-lg bg-muted/30 p-2 sm:p-3 text-center">
                <div className="flex items-center justify-center gap-1 sm:gap-1.5 mb-0.5 sm:mb-1">
                  <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-md-green" />
                  <span className="text-[10px] sm:text-xs text-muted-foreground truncate">Weekly Total</span>
                </div>
                <p className="text-lg sm:text-xl font-bold text-foreground">
                  {weeklyAttendanceData.reduce((sum, d) => sum + d.checkIns, 0)}
                </p>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground">check-ins</p>
              </div>
              
              <div className="rounded-lg bg-muted/30 p-2 sm:p-3 text-center">
                <div className="flex items-center justify-center gap-1 sm:gap-1.5 mb-0.5 sm:mb-1">
                  <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-md-teal" />
                  <span className="text-[10px] sm:text-xs text-muted-foreground truncate">Daily Avg</span>
                </div>
                <p className="text-lg sm:text-xl font-bold text-foreground">
                  {weeklyAttendanceData.length > 0 
                    ? Math.round(weeklyAttendanceData.reduce((sum, d) => sum + d.checkIns, 0) / weeklyAttendanceData.length) 
                    : 0}
                </p>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground">per day</p>
              </div>
              
              <div className="rounded-lg bg-muted/30 p-2 sm:p-3 text-center">
                <div className="flex items-center justify-center gap-1 sm:gap-1.5 mb-0.5 sm:mb-1">
                  <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-md-orange" />
                  <span className="text-[10px] sm:text-xs text-muted-foreground truncate">Peak Day</span>
                </div>
                <p className="text-lg sm:text-xl font-bold text-foreground">
                  {weeklyAttendanceData.length > 0 
                    ? weeklyAttendanceData.reduce((max, d) => d.checkIns > max.checkIns ? d : max, weeklyAttendanceData[0]).day
                    : '-'}
                </p>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                  {weeklyAttendanceData.length > 0 
                    ? `${weeklyAttendanceData.reduce((max, d) => d.checkIns > max.checkIns ? d : max, weeklyAttendanceData[0]).checkIns} visits`
                    : 'no data'}
                </p>
              </div>
              
              <div className="rounded-lg bg-muted/30 p-2 sm:p-3 text-center">
                <div className="flex items-center justify-center gap-1 sm:gap-1.5 mb-0.5 sm:mb-1">
                  <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-primary" />
                  <span className="text-[10px] sm:text-xs text-muted-foreground truncate">Active Rate</span>
                </div>
                <p className="text-lg sm:text-xl font-bold text-foreground">
                  {stats?.activeMembers && stats.activeMembers > 0 
                    ? Math.round((weeklyAttendanceData.reduce((sum, d) => sum + d.checkIns, 0) / stats.activeMembers) * 100 / 7)
                    : 0}%
                </p>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground">of members</p>
              </div>
            </div>
          )}
        </div>

        {/* Today's Check-ins */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-foreground">Today's Check-ins</h3>
              <p className="text-xs sm:text-sm text-md-green">{todayAttendance.length} members</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => navigate("/attendance")} className="h-8 w-8">
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </div>
          {todayAttendance.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No check-ins yet</p>
              <Button variant="link" size="sm" onClick={() => navigate("/attendance")}>
                Record attendance
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {todayAttendance.slice(0, 5).map((a, index) => (
                <div 
                  key={a.id} 
                  className="flex items-center gap-3 animate-fade-in cursor-pointer rounded-lg p-2 hover:bg-muted/50 transition-colors" 
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => a.member_id && handleCheckInClick(a.member_id)}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-md-green/10 text-md-green shrink-0">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{a.member?.full_name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(a.check_in_at), "h:mm a")}</p>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                    a.source === 'qr' 
                      ? 'bg-md-teal/10 text-md-teal' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {a.source === 'qr' ? 'QR' : 'Manual'}
                  </span>
                </div>
              ))}
              {todayAttendance.length > 5 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-xs text-muted-foreground hover:text-foreground mt-2"
                  onClick={() => navigate("/attendance")}
                >
                  View {todayAttendance.length - 5} more check-ins
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recent Members & Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Members */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-foreground">Recent Members</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">Latest registrations</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/members")} className="hidden sm:flex group">
              View All
              <ArrowUpRight className="ml-1 h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Button>
          </div>
          
          {/* Content with blur for Lite plan */}
          <div className={isLitePlan ? "blur-sm pointer-events-none select-none" : ""}>
            {recentMembers.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No members yet</p>
                <Button variant="link" size="sm" onClick={() => navigate("/members")}>
                  <UserPlus className="mr-1 h-4 w-4" />
                  Add Members
                </Button>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {recentMembers.map((member, index) => (
                  <div 
                    key={member.id} 
                    className="flex items-center justify-between py-2 animate-fade-in cursor-pointer rounded-lg px-2 -mx-2 hover:bg-muted/50 transition-colors" 
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => {
                      setSelectedMember(member);
                      setIsProfileOpen(true);
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <MemberAvatar name={member.full_name} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{member.full_name}</p>
                        <p className="text-xs text-muted-foreground">{member.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={member.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Quick Stats */}
            <div className="border-t border-border pt-4 mt-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <button 
                  onClick={() => navigate("/members?filter=active")}
                  className="rounded-lg bg-muted/30 p-2 hover:bg-muted/50 transition-colors"
                >
                  <p className="text-base sm:text-lg font-bold text-md-green">{stats?.activeMembers || 0}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Active</p>
                </button>
                <button 
                  onClick={() => navigate("/members?filter=expiring")}
                  className="rounded-lg bg-muted/30 p-2 hover:bg-muted/50 transition-colors"
                >
                  <p className="text-base sm:text-lg font-bold text-md-orange">{stats?.expiringMembers || 0}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Expiring</p>
                </button>
                <button 
                  onClick={() => navigate("/members?filter=expired")}
                  className="rounded-lg bg-muted/30 p-2 hover:bg-muted/50 transition-colors"
                >
                  <p className="text-base sm:text-lg font-bold text-md-red">{stats?.expiredMembers || 0}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Expired</p>
                </button>
              </div>
            </div>
          </div>
          
          {/* Upgrade overlay for Lite plan */}
          {isLitePlan && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[1px]">
              <div className="text-center px-4">
                <div className="h-10 w-10 mx-auto rounded-lg bg-muted/80 border border-border flex items-center justify-center mb-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">Upgrade to view details</p>
              </div>
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-foreground">Recent Payments</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">Latest transactions</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/payments")} className="hidden sm:flex group">
              View All
              <ArrowUpRight className="ml-1 h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Button>
          </div>
          
          {/* Content with blur for Lite plan */}
          <div className={isLitePlan ? "blur-sm pointer-events-none select-none" : ""}>
            {recentPayments.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No payments yet</p>
                <Button variant="link" size="sm" onClick={() => navigate("/payments")}>
                  Record payment
                </Button>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {recentPayments.map((payment, index) => (
                  <div key={payment.id} className="flex items-center justify-between py-2 animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <MemberAvatar name={payment.member?.full_name || "Unknown"} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{payment.member?.full_name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">
                          {payment.plan_name || "Payment"} • <span className="uppercase">{payment.payment_mode}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-md-green">₹{payment.amount.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">{format(new Date(payment.created_at), "MMM d, h:mm a")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Quick Stats */}
            <div className="border-t border-border pt-4 mt-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <button 
                  onClick={() => navigate("/payments?filter=completed")}
                  className="rounded-lg bg-muted/30 p-2 hover:bg-muted/50 transition-colors"
                >
                  <p className="text-base sm:text-lg font-bold text-md-green">
                    ₹{((stats?.monthlyRevenue || 0) / 1000).toFixed(0)}k
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Revenue</p>
                </button>
                <button 
                  onClick={() => navigate("/payments?filter=pending")}
                  className="rounded-lg bg-muted/30 p-2 hover:bg-muted/50 transition-colors"
                >
                  <p className="text-base sm:text-lg font-bold text-md-orange">
                    {payments.filter(p => p.status === 'pending').length}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Pending</p>
                </button>
                <button 
                  onClick={() => navigate("/payments")}
                  className="rounded-lg bg-muted/30 p-2 hover:bg-muted/50 transition-colors"
                >
                  <p className="text-base sm:text-lg font-bold text-foreground">
                    {payments.length}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Total</p>
                </button>
              </div>
            </div>
          </div>
          
          {/* Upgrade overlay for Lite plan */}
          {isLitePlan && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[1px]">
              <div className="text-center px-4">
                <div className="h-10 w-10 mx-auto rounded-lg bg-muted/80 border border-border flex items-center justify-center mb-2">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">Upgrade to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Member Profile Modal */}
      {selectedMember && (
        <MemberProfile
          member={selectedMember}
          isOpen={isProfileOpen}
          onClose={() => {
            setIsProfileOpen(false);
            setSelectedMember(null);
          }}
          onEdit={() => {
            setIsProfileOpen(false);
            navigate(`/members?edit=${selectedMember.id}`);
          }}
        />
      )}
    </DashboardLayout>
  );
}