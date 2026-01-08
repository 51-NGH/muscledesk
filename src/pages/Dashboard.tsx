import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { MemberAvatar } from "@/components/ui/member-avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardStats, useMembers, useAttendance, useMonthlyRevenue, useExpiringMembers } from "@/hooks/useGymData";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  Users,
  DollarSign,
  Calendar,
  TrendingUp,
  Search,
  Bell,
  UserPlus,
  Activity,
  MoreVertical,
  ArrowUpRight,
  Clock,
} from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

export default function Dashboard() {
  const { gymId } = useAuth();
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: members = [] } = useMembers();
  const { data: todayAttendance = [] } = useAttendance(new Date().toISOString().split("T")[0]);
  const { data: monthlyRevenue = [] } = useMonthlyRevenue(6);
  const { data: expiringMembers = [] } = useExpiringMembers(7);

  // Recent members (last 5)
  const recentMembers = members.slice(0, 5);

  // Format revenue data for chart
  const revenueChartData = [...monthlyRevenue]
    .reverse()
    .map((r) => ({
      month: format(new Date(r.month), "MMM"),
      revenue: Number(r.total_revenue),
    }));

  // If no data, show empty months
  if (revenueChartData.length === 0) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    months.forEach((month) => revenueChartData.push({ month, revenue: 0 }));
  }

  // Recent activity from attendance
  const recentActivity = todayAttendance.slice(0, 5).map((a) => ({
    id: a.id,
    type: "attendance" as const,
    title: "Member checked in",
    description: `${a.member?.full_name || "Unknown"} via ${a.source === "qr" ? "QR Scan" : "Manual"}`,
    time: format(new Date(a.check_in_at), "h:mm a"),
    icon: Activity,
  }));

  if (!gymId) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center max-w-md">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto mb-4">
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
      {/* Header with Search */}
      <div className="flex items-center justify-between mb-6">
        <PageHeader
          title="Dashboard"
          description="Welcome back, here's what's happening today"
          className="mb-0"
        />
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              className="w-[280px] pl-10"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  navigate(`/members?search=${(e.target as HTMLInputElement).value}`);
                }
              }}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => navigate("/members?filter=Expiring")}
          >
            <Bell className="h-5 w-5" />
            {(stats?.expiringMembers || 0) > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                {stats?.expiringMembers}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Members"
          value={statsLoading ? "..." : stats?.totalMembers || 0}
          icon={Users}
          iconVariant="teal"
        />
        <StatCard
          title="Monthly Revenue"
          value={statsLoading ? "..." : `₹${(stats?.monthlyRevenue || 0).toLocaleString()}`}
          icon={DollarSign}
          iconVariant="green"
        />
        <StatCard
          title="Today's Attendance"
          value={statsLoading ? "..." : stats?.todayAttendance || 0}
          icon={Calendar}
          iconVariant="orange"
        />
        <StatCard
          title="Active Members"
          value={statsLoading ? "..." : stats?.activeMembers || 0}
          icon={TrendingUp}
          iconVariant="teal"
        />
      </div>

      {/* Charts & Activity Row */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Revenue Chart */}
        <div className="col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Revenue Overview</h3>
              <p className="text-sm text-muted-foreground">Last 6 months revenue trend</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/payments")}>
              View All
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={revenueChartData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--md-teal))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--md-teal))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickFormatter={(value) => `₹${value >= 1000 ? `${value / 1000}k` : value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => [`₹${value.toLocaleString()}`, "Revenue"]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--md-teal))"
                strokeWidth={2}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Today's Activity</h3>
              <p className="text-sm text-muted-foreground">Recent check-ins</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/attendance")}>
              View All
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No activity today</p>
              <Button variant="link" size="sm" onClick={() => navigate("/attendance")}>
                Record attendance
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${activityIconStyles[activity.type]}`}>
                    <activity.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{activity.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Members & Expiring Soon */}
      <div className="grid grid-cols-2 gap-6">
        {/* Recent Members */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Recent Members</h3>
              <p className="text-sm text-muted-foreground">Latest registrations</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/members")}>
              View All
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
          {recentMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No members yet</p>
              <Button variant="link" size="sm" onClick={() => navigate("/members")}>
                <UserPlus className="mr-1 h-4 w-4" />
                Add Members
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <MemberAvatar name={member.full_name} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{member.full_name}</p>
                      <p className="text-xs text-muted-foreground">{member.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={member.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expiring Soon */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Expiring Soon</h3>
              <p className="text-sm text-muted-foreground">Renewals due in 7 days</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/members?filter=Expiring")}>
              View All
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
          {expiringMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No memberships expiring soon</p>
            </div>
          ) : (
            <div className="space-y-3">
              {expiringMembers.slice(0, 5).map((member: any) => (
                <div key={member.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <MemberAvatar name={member.full_name} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{member.full_name}</p>
                      <p className="text-xs text-muted-foreground">{member.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-md-orange">
                      {member.days_remaining === 0 ? "Today" : `${member.days_remaining} days`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(member.expiry_date), "MMM d")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Stats */}
          <div className="border-t border-border pt-4 mt-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-lg font-bold text-md-green">{stats?.activeMembers || 0}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
              <div>
                <p className="text-lg font-bold text-md-orange">{stats?.expiringMembers || 0}</p>
                <p className="text-xs text-muted-foreground">Expiring</p>
              </div>
              <div>
                <p className="text-lg font-bold text-md-red">{stats?.expiredMembers || 0}</p>
                <p className="text-xs text-muted-foreground">Expired</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
