import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { MemberAvatar } from "@/components/ui/member-avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardStats, useMembers, useAttendance, useMonthlyRevenue, useExpiringMembers, useUserProfile, useDailyAttendance, usePayments } from "@/hooks/useGymData";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useEffect, useState, useMemo } from "react";
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
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: members = [] } = useMembers();
  const { data: todayAttendance = [] } = useAttendance(new Date().toISOString().split("T")[0]);
  const { data: monthlyRevenue = [] } = useMonthlyRevenue(6);
  const { data: expiringMembers = [] } = useExpiringMembers(7);
  const { data: profile } = useUserProfile();
  const { data: dailyAttendance = [] } = useDailyAttendance(7);
  const { data: payments = [] } = usePayments();
  
  const [greeting, setGreeting] = useState(getGreeting());
  const [animatedStats, setAnimatedStats] = useState(false);

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

  const activityIconStyles: Record<string, string> = {
    member: "activity-icon-member",
    class: "activity-icon-class",
    payment: "activity-icon-payment",
    attendance: "activity-icon-attendance",
  };

  return (
    <DashboardLayout>
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
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              className="w-full sm:w-[280px] pl-10 transition-all duration-300 focus:ring-2 focus:ring-primary/20"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  navigate(`/members?search=${(e.target as HTMLInputElement).value}`);
                }
              }}
            />
          </div>
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
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 sm:p-5 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
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
          <ResponsiveContainer width="100%" height={200}>
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
        </div>

        {/* Today's Check-ins */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-foreground">Today's Check-ins</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">{todayAttendance.length} members</p>
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
            <div className="space-y-3 max-h-[180px] overflow-y-auto">
              {todayAttendance.slice(0, 5).map((a, index) => (
                <div key={a.id} className="flex items-center gap-3 animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-md-green/10 text-md-green shrink-0">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{a.member?.full_name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(a.check_in_at), "h:mm a")}</p>
                  </div>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                    a.source === 'qr' 
                      ? 'bg-primary/10 text-primary' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {a.source === 'qr' ? 'QR' : 'Manual'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Members & Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Members */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
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
                <div key={member.id} className="flex items-center justify-between py-2 animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
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
        </div>

        {/* Recent Payments */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
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
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-md-green/10 text-md-green shrink-0">
                      <DollarSign className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">₹{payment.amount.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground uppercase">{payment.payment_mode}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">{format(new Date(payment.created_at), "MMM d")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Quick Stats */}
          <div className="border-t border-border pt-4 mt-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-base sm:text-lg font-bold text-md-green">{stats?.activeMembers || 0}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
              <div>
                <p className="text-base sm:text-lg font-bold text-md-orange">{stats?.expiringMembers || 0}</p>
                <p className="text-xs text-muted-foreground">Expiring</p>
              </div>
              <div>
                <p className="text-base sm:text-lg font-bold text-md-red">{stats?.expiredMembers || 0}</p>
                <p className="text-xs text-muted-foreground">Expired</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}