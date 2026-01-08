import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { MemberAvatar } from "@/components/ui/member-avatar";
import { StatusBadge, PlanBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

const revenueData = [
  { month: "Jan", revenue: 42000 },
  { month: "Feb", revenue: 48000 },
  { month: "Mar", revenue: 45000 },
  { month: "Apr", revenue: 52000 },
  { month: "May", revenue: 58000 },
  { month: "Jun", revenue: 65000 },
  { month: "Jul", revenue: 72000 },
];

const recentActivity = [
  {
    id: 1,
    type: "member",
    title: "New member joined",
    description: "Sarah Johnson signed up for Premium plan",
    icon: UserPlus,
  },
  {
    id: 2,
    type: "class",
    title: "Class scheduled",
    description: "HIIT Training session added for tomorrow",
    icon: CalendarDays,
  },
  {
    id: 3,
    type: "payment",
    title: "Payment received",
    description: "Monthly subscription from Mike Chen",
    icon: CreditCard,
  },
  {
    id: 4,
    type: "attendance",
    title: "Attendance milestone",
    description: "Emma Wilson completed 100 classes",
    icon: Activity,
  },
];

const recentMembers = [
  { id: 1, name: "Sarah Johnson", email: "sarah.j@email.com", status: "active" as const, plan: "premium" as const },
  { id: 2, name: "Mike Chen", email: "mike.c@email.com", status: "active" as const, plan: "standard" as const },
  { id: 3, name: "Emma Wilson", email: "emma.w@email.com", status: "active" as const, plan: "premium" as const },
];

const todaysClasses = [
  { id: 1, name: "HIIT Training", instructor: "John Smith", time: "09:00", capacity: 20 },
  { id: 2, name: "Yoga Flow", instructor: "Lisa Park", time: "10:30", capacity: 15 },
  { id: 3, name: "Strength Training", instructor: "Mike Brown", time: "14:00", capacity: 12 },
];

const activityIconStyles: Record<string, string> = {
  member: "activity-icon-member",
  class: "activity-icon-class",
  payment: "activity-icon-payment",
  attendance: "activity-icon-attendance",
};

export default function Dashboard() {
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
              placeholder="Search members, classes..."
              className="w-[280px] pl-10"
            />
          </div>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
              3
            </span>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Members"
          value="2,847"
          icon={Users}
          iconVariant="teal"
          change={12.5}
        />
        <StatCard
          title="Monthly Revenue"
          value="$72,450"
          icon={DollarSign}
          iconVariant="green"
          change={8.2}
        />
        <StatCard
          title="Active Classes"
          value="156"
          icon={Calendar}
          iconVariant="orange"
          change={3.1}
        />
        <StatCard
          title="Attendance Rate"
          value="94.2%"
          icon={TrendingUp}
          iconVariant="teal"
          change={2.4}
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
                tickFormatter={(value) => `$${value / 1000}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
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
        </div>
      </div>

      {/* Recent Members & Today's Classes */}
      <div className="grid grid-cols-2 gap-6">
        {/* Recent Members */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">Recent Members</h3>
            <p className="text-sm text-muted-foreground">Latest member registrations</p>
          </div>
          <div className="space-y-3">
            {recentMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <MemberAvatar name={member.name} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={member.status} />
                  <span className="text-sm text-muted-foreground">{member.plan.charAt(0).toUpperCase() + member.plan.slice(1)}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Today's Classes */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">Today's Classes</h3>
            <p className="text-sm text-muted-foreground">Upcoming sessions</p>
          </div>
          <div className="space-y-3">
            {todaysClasses.map((cls) => (
              <div key={cls.id} className="flex items-center justify-between py-2 border-l-2 border-md-teal pl-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{cls.name}</p>
                  <p className="text-xs text-muted-foreground">Instructor: {cls.instructor}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">{cls.time}</p>
                  <p className="text-xs text-muted-foreground">{cls.capacity} spots</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
