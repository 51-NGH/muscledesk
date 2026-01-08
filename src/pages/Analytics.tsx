import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import {
  useDashboardStats,
  useMonthlyRevenue,
  useMonthlyExpenses,
  useDailyAttendance,
  useMembers,
} from "@/hooks/useGymData";
import { format, subMonths } from "date-fns";
import {
  DollarSign,
  Users,
  TrendingUp,
  Calendar,
  Download,
} from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Line,
  ComposedChart,
  Bar,
  BarChart,
  PieChart,
  Pie,
  Cell,
  LineChart,
} from "recharts";

const timeRanges = ["7 Days", "30 Days", "90 Days", "6 Months"] as const;

export default function Analytics() {
  const [activeRange, setActiveRange] = useState<string>("30 Days");
  
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: monthlyRevenue = [] } = useMonthlyRevenue(6);
  const { data: monthlyExpenses = [] } = useMonthlyExpenses(6);
  const { data: members = [] } = useMembers();
  
  // Get days based on selected range
  const daysBack = useMemo(() => {
    switch (activeRange) {
      case "7 Days": return 7;
      case "30 Days": return 30;
      case "90 Days": return 90;
      case "6 Months": return 180;
      default: return 30;
    }
  }, [activeRange]);
  
  const { data: dailyAttendance = [] } = useDailyAttendance(daysBack);

  // Process revenue data for chart
  const revenueChartData = useMemo(() => {
    const revenueByMonth: Record<string, { revenue: number; expenses: number; profit: number }> = {};
    
    // Initialize with last 6 months
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const monthKey = format(monthDate, "yyyy-MM");
      revenueByMonth[monthKey] = { revenue: 0, expenses: 0, profit: 0 };
    }
    
    // Add revenue data
    monthlyRevenue.forEach((r: any) => {
      const monthKey = format(new Date(r.month), "yyyy-MM");
      if (revenueByMonth[monthKey]) {
        revenueByMonth[monthKey].revenue = Number(r.total_revenue || 0);
      }
    });
    
    // Add expense data
    monthlyExpenses.forEach((e: any) => {
      const monthKey = format(new Date(e.month), "yyyy-MM");
      if (revenueByMonth[monthKey]) {
        revenueByMonth[monthKey].expenses += Number(e.total_amount || 0);
      }
    });
    
    // Calculate profit
    Object.keys(revenueByMonth).forEach((key) => {
      revenueByMonth[key].profit = revenueByMonth[key].revenue - revenueByMonth[key].expenses;
    });
    
    return Object.entries(revenueByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month: format(new Date(month + "-01"), "MMM"),
        ...data,
      }));
  }, [monthlyRevenue, monthlyExpenses]);

  // Membership distribution data
  const membershipData = useMemo(() => {
    const planCounts: Record<string, number> = {};
    
    members.forEach((member) => {
      const planName = member.plan_name || "No Plan";
      planCounts[planName] = (planCounts[planName] || 0) + 1;
    });
    
    const colors = [
      "hsl(var(--md-teal))",
      "hsl(var(--md-purple))",
      "hsl(var(--md-pink))",
      "hsl(var(--md-yellow))",
      "hsl(var(--md-blue))",
      "hsl(var(--md-orange))",
    ];
    
    return Object.entries(planCounts).map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length],
    }));
  }, [members]);

  // Attendance trend data
  const attendanceChartData = useMemo(() => {
    if (dailyAttendance.length === 0) return [];
    
    return [...dailyAttendance]
      .reverse()
      .slice(-14) // Last 14 days for better visualization
      .map((d: any) => ({
        day: format(new Date(d.date), "MMM d"),
        checkIns: Number(d.check_ins || 0),
      }));
  }, [dailyAttendance]);

  // Peak hours data (simulated based on attendance - in real app would need hourly data)
  const peakHoursData = useMemo(() => {
    // This would need a dedicated RPC function for hourly data
    // For now, create a reasonable distribution based on total attendance
    const totalAttendance = dailyAttendance.reduce((sum: number, d: any) => sum + Number(d.check_ins || 0), 0);
    const avgPerDay = dailyAttendance.length > 0 ? totalAttendance / dailyAttendance.length : 0;
    
    return [
      { hour: "6am", visitors: Math.round(avgPerDay * 0.08) },
      { hour: "8am", visitors: Math.round(avgPerDay * 0.15) },
      { hour: "10am", visitors: Math.round(avgPerDay * 0.12) },
      { hour: "12pm", visitors: Math.round(avgPerDay * 0.08) },
      { hour: "2pm", visitors: Math.round(avgPerDay * 0.05) },
      { hour: "4pm", visitors: Math.round(avgPerDay * 0.10) },
      { hour: "6pm", visitors: Math.round(avgPerDay * 0.20) },
      { hour: "8pm", visitors: Math.round(avgPerDay * 0.15) },
      { hour: "10pm", visitors: Math.round(avgPerDay * 0.07) },
    ];
  }, [dailyAttendance]);

  // Calculate attendance rate
  const attendanceRate = useMemo(() => {
    if (!stats?.activeMembers || stats.activeMembers === 0) return 0;
    const avgDailyAttendance = dailyAttendance.length > 0 
      ? dailyAttendance.reduce((sum: number, d: any) => sum + Number(d.check_ins || 0), 0) / dailyAttendance.length 
      : 0;
    return Math.min(100, Math.round((avgDailyAttendance / stats.activeMembers) * 100));
  }, [dailyAttendance, stats]);

  // Calculate total revenue
  const totalRevenue = useMemo(() => {
    return monthlyRevenue.reduce((sum: number, r: any) => sum + Number(r.total_revenue || 0), 0);
  }, [monthlyRevenue]);

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <PageHeader
          title="Analytics"
          description="Comprehensive insights and performance metrics"
          className="mb-0"
        />
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-lg border border-border p-1 bg-card overflow-x-auto">
            {timeRanges.map((range) => (
              <button
                key={range}
                onClick={() => setActiveRange(range)}
                className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 whitespace-nowrap ${
                  activeRange === range
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="hidden sm:flex">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard
          title="Total Revenue"
          value={statsLoading ? "..." : `₹${totalRevenue.toLocaleString()}`}
          subtitle="Last 6 months"
          icon={DollarSign}
          iconVariant="teal"
        />
        <StatCard
          title="Active Members"
          value={statsLoading ? "..." : stats?.activeMembers || 0}
          subtitle={`${stats?.totalMembers || 0} total`}
          icon={Users}
          iconVariant="green"
        />
        <StatCard
          title="Attendance Rate"
          value={statsLoading ? "..." : `${attendanceRate}%`}
          subtitle="Avg daily"
          icon={TrendingUp}
          iconVariant="orange"
        />
        <StatCard
          title="Net Profit"
          value={statsLoading ? "..." : `₹${(stats?.profit || 0).toLocaleString()}`}
          subtitle="This month"
          icon={Calendar}
          iconVariant="blue"
        />
      </div>

      {/* Revenue Analysis & Membership Plans */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
        {/* Revenue Analysis */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 sm:p-5 hover:shadow-lg transition-shadow duration-300">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">Revenue Analysis</h3>
            <p className="text-sm text-muted-foreground">Revenue, expenses, and profit trends</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={revenueChartData}>
              <defs>
                <linearGradient id="colorRevenueArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--md-teal))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--md-teal))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickFormatter={(value) => value >= 1000 ? `₹${value / 1000}k` : `₹${value}`}
                width={55}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number, name: string) => [`₹${value.toLocaleString()}`, name.charAt(0).toUpperCase() + name.slice(1)]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--md-teal))"
                strokeWidth={2}
                fill="url(#colorRevenueArea)"
                name="Revenue"
              />
              <Line
                type="monotone"
                dataKey="expenses"
                stroke="hsl(var(--md-red))"
                strokeWidth={2}
                dot={false}
                name="Expenses"
              />
              <Line
                type="monotone"
                dataKey="profit"
                stroke="hsl(var(--md-green))"
                strokeWidth={2}
                dot={false}
                name="Profit"
              />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-md-teal" />
              <span className="text-xs sm:text-sm text-muted-foreground">Revenue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-md-red" />
              <span className="text-xs sm:text-sm text-muted-foreground">Expenses</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-md-green" />
              <span className="text-xs sm:text-sm text-muted-foreground">Profit</span>
            </div>
          </div>
        </div>

        {/* Membership Plans */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 hover:shadow-lg transition-shadow duration-300">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">Membership Plans</h3>
            <p className="text-sm text-muted-foreground">Distribution by plan</p>
          </div>
          {membershipData.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              <p className="text-sm">No members yet</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={membershipData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {membershipData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number, name: string) => [value, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {membershipData.slice(0, 4).map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs text-muted-foreground truncate">{item.name}</span>
                    <span className="text-xs font-medium text-foreground ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Attendance Trend & Peak Hours */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Attendance Trend */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 hover:shadow-lg transition-shadow duration-300">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">Attendance Trend</h3>
            <p className="text-sm text-muted-foreground">Daily check-ins over time</p>
          </div>
          {attendanceChartData.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              <p className="text-sm">No attendance data</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={attendanceChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  interval="preserveStartEnd"
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
                <Bar 
                  dataKey="checkIns" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Peak Hours */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 hover:shadow-lg transition-shadow duration-300">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">Peak Hours</h3>
            <p className="text-sm text-muted-foreground">Estimated visitor distribution</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={peakHoursData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="hour"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
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
                formatter={(value: number) => [value, "Visitors"]}
              />
              <Line
                type="monotone"
                dataKey="visitors"
                stroke="hsl(var(--md-purple))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--md-purple))", strokeWidth: 0, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </DashboardLayout>
  );
}