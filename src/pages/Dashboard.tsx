import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { MemberAvatar } from "@/components/ui/member-avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardStats, useMembers, useAttendance } from "@/hooks/useGymData";
import {
  Users,
  DollarSign,
  Calendar,
  TrendingUp,
  Search,
  Bell,
  UserPlus,
  CalendarDays,
  CreditCard,
  Activity,
  MoreVertical,
} from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { useNavigate } from "react-router-dom";

// Mock data for revenue chart (will be replaced with real data)
const revenueData = [
  { month: "Jan", revenue: 42000 },
  { month: "Feb", revenue: 48000 },
  { month: "Mar", revenue: 45000 },
  { month: "Apr", revenue: 52000 },
  { month: "May", revenue: 58000 },
  { month: "Jun", revenue: 65000 },
  { month: "Jul", revenue: 72000 },
];

export default function Dashboard() {
  const { gymId, user } = useAuth();
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: members = [] } = useMembers();
  const { data: todayAttendance = [] } = useAttendance(new Date().toISOString().split("T")[0]);

  // Recent members (last 3)
  const recentMembers = members.slice(0, 3);

  // Recent activity from attendance
  const recentActivity = todayAttendance.slice(0, 4).map((a) => ({
    id: a.id,
    type: "attendance",
    title: "Member checked in",
    description: `${a.member?.full_name || "Unknown"} via ${a.source}`,
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
              Get started by creating your gym. This will enable member management, attendance tracking, and more.
            </p>
            <Button onClick={() => navigate("/settings")}>Create Your Gym</Button>
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
            <Input placeholder="Search members, classes..." className="w-[280px] pl-10" />
          </div>
          <Button variant="ghost" size="icon" className="relative">
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
          change={12.5}
        />
        <StatCard
          title="Monthly Revenue"
          value={statsLoading ? "..." : `₹${(stats?.monthlyRevenue || 0).toLocaleString()}`}
          icon={DollarSign}
          iconVariant="green"
          change={8.2}
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
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">Revenue Overview</h3>
            <p className="text-sm text-muted-foreground">Monthly revenue trend</p>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={revenueData}>
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
                tickFormatter={(value) => `₹${value / 1000}k`}
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
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
            <p className="text-sm text-muted-foreground">Latest updates and notifications</p>
          </div>
          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No activity today</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${activityIconStyles[activity.type]}`}
                  >
                    <activity.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{activity.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Members & Stats */}
      <div className="grid grid-cols-2 gap-6">
        {/* Recent Members */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">Recent Members</h3>
            <p className="text-sm text-muted-foreground">Latest member registrations</p>
          </div>
          {recentMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No members yet</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate("/members")}>
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
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">Member Status</h3>
            <p className="text-sm text-muted-foreground">Membership overview</p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-md-green" />
                <span className="text-sm text-muted-foreground">Active</span>
              </div>
              <span className="text-sm font-medium text-foreground">{stats?.activeMembers || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-md-orange" />
                <span className="text-sm text-muted-foreground">Expiring Soon</span>
              </div>
              <span className="text-sm font-medium text-foreground">{stats?.expiringMembers || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-md-red" />
                <span className="text-sm text-muted-foreground">Expired</span>
              </div>
              <span className="text-sm font-medium text-foreground">{stats?.expiredMembers || 0}</span>
            </div>
            <div className="border-t border-border pt-4 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">This Month's Profit</span>
                <span className="text-lg font-bold text-md-green">
                  ₹{(stats?.profit || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
