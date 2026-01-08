import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  Users,
  TrendingUp,
  Calendar,
  Download,
  Filter,
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
  Legend,
  LineChart,
} from "recharts";

const revenueData = [
  { month: "Jan", revenue: 42000, expenses: 28000, profit: 14000 },
  { month: "Feb", revenue: 48000, expenses: 30000, profit: 18000 },
  { month: "Mar", revenue: 45000, expenses: 29000, profit: 16000 },
  { month: "Apr", revenue: 52000, expenses: 31000, profit: 21000 },
  { month: "May", revenue: 58000, expenses: 33000, profit: 25000 },
  { month: "Jun", revenue: 65000, expenses: 35000, profit: 30000 },
  { month: "Jul", revenue: 72000, expenses: 38000, profit: 34000 },
];

const membershipData = [
  { name: "Premium", value: 450, color: "hsl(var(--md-teal))" },
  { name: "Standard", value: 680, color: "hsl(var(--md-purple))" },
  { name: "Basic", value: 320, color: "hsl(var(--md-pink))" },
  { name: "Trial", value: 150, color: "hsl(var(--md-yellow))" },
];

const classPerformanceData = [
  { name: "Mon", classes: 145, attendance: 132 },
  { name: "Tue", classes: 178, attendance: 165 },
  { name: "Wed", classes: 156, attendance: 148 },
  { name: "Thu", classes: 168, attendance: 155 },
  { name: "Fri", classes: 142, attendance: 130 },
  { name: "Sat", classes: 189, attendance: 175 },
  { name: "Sun", classes: 120, attendance: 108 },
];

const peakHoursData = [
  { hour: "6am", visitors: 45 },
  { hour: "8am", visitors: 120 },
  { hour: "10am", visitors: 180 },
  { hour: "12pm", visitors: 150 },
  { hour: "2pm", visitors: 90 },
  { hour: "4pm", visitors: 130 },
  { hour: "6pm", visitors: 210 },
  { hour: "8pm", visitors: 175 },
  { hour: "10pm", visitors: 60 },
];

const timeRanges = ["7 Days", "30 Days", "90 Days", "1 Year"] as const;

export default function Analytics() {
  const [activeRange, setActiveRange] = useState<string>("7 Days");

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <PageHeader
          title="Analytics"
          description="Comprehensive insights and performance metrics"
          className="mb-0"
        />
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border border-border p-1">
            {timeRanges.map((range) => (
              <button
                key={range}
                onClick={() => setActiveRange(range)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeRange === range
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Revenue"
          value="$72,450"
          icon={DollarSign}
          iconVariant="teal"
          change={18.2}
        />
        <StatCard
          title="Active Members"
          value="2,847"
          icon={Users}
          iconVariant="green"
          change={12.5}
        />
        <StatCard
          title="Avg Attendance"
          value="94.2%"
          icon={TrendingUp}
          iconVariant="orange"
          change={3.1}
        />
        <StatCard
          title="Classes/Week"
          value="156"
          icon={Calendar}
          iconVariant="red"
          change={-2.4}
        />
      </div>

      {/* Revenue Analysis & Membership Plans */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Revenue Analysis */}
        <div className="col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">Revenue Analysis</h3>
            <p className="text-sm text-muted-foreground">Revenue, expenses, and profit trends</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={revenueData}>
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
              <span className="text-sm text-muted-foreground">revenue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-md-red" />
              <span className="text-sm text-muted-foreground">expenses</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-md-green" />
              <span className="text-sm text-muted-foreground">profit</span>
            </div>
          </div>
        </div>

        {/* Membership Plans */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">Membership Plans</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={membershipData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {membershipData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {membershipData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-muted-foreground">{item.name}</span>
                <span className="text-sm font-medium text-foreground ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Class Performance & Peak Hours */}
      <div className="grid grid-cols-2 gap-6">
        {/* Class Performance */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">Class Performance</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={classPerformanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="classes" fill="hsl(var(--md-blue))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="attendance" fill="hsl(var(--md-purple))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Peak Hours */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">Peak Hours</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={peakHoursData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="hour"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
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
