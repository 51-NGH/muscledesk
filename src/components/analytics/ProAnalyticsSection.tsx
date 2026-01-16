import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMembers, usePayments } from "@/hooks/useGymData";
import { format, subMonths, parseISO, startOfMonth, endOfMonth, differenceInDays } from "date-fns";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  RefreshCw,
  AlertTriangle,
  Crown,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from "recharts";

interface ProAnalyticsSectionProps {
  activeRange: string;
}

export function ProAnalyticsSection({ activeRange }: ProAnalyticsSectionProps) {
  const { gymId } = useAuth();
  const { data: members = [] } = useMembers();
  const { data: allPayments = [] } = usePayments();

  // Fetch retention stats from database
  const { data: retentionStats } = useQuery({
    queryKey: ["retention_stats", gymId],
    queryFn: async () => {
      if (!gymId) return null;
      const { data, error } = await supabase.rpc("get_retention_stats", { _gym_id: gymId });
      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!gymId,
  });

  // Calculate member growth trend (last 6 months)
  const growthTrend = useMemo(() => {
    const months: { month: string; newMembers: number; totalMembers: number; growthRate: number }[] = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const newInMonth = members.filter((m) => {
        const joinDate = parseISO(m.start_date);
        return joinDate >= monthStart && joinDate <= monthEnd;
      }).length;
      
      const totalAtEnd = members.filter((m) => {
        const joinDate = parseISO(m.start_date);
        return joinDate <= monthEnd;
      }).length;
      
      const prevTotal = months.length > 0 ? months[months.length - 1].totalMembers : totalAtEnd - newInMonth;
      const growthRate = prevTotal > 0 ? ((totalAtEnd - prevTotal) / prevTotal) * 100 : 0;
      
      months.push({
        month: format(monthDate, "MMM"),
        newMembers: newInMonth,
        totalMembers: totalAtEnd,
        growthRate: Math.round(growthRate * 10) / 10,
      });
    }
    
    return months;
  }, [members]);

  // Revenue forecasting (simple linear projection)
  const revenueForecast = useMemo(() => {
    const monthlyData: { month: string; actual: number; forecast?: number }[] = [];
    
    // Calculate past 3 months revenue
    for (let i = 2; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const monthRevenue = allPayments
        .filter((p: any) => {
          const paymentDate = parseISO(p.created_at);
          return paymentDate >= monthStart && paymentDate <= monthEnd;
        })
        .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
      
      monthlyData.push({
        month: format(monthDate, "MMM"),
        actual: monthRevenue,
      });
    }
    
    // Simple linear regression for forecast
    const n = monthlyData.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = monthlyData.reduce((sum, d) => sum + d.actual, 0);
    const sumXY = monthlyData.reduce((sum, d, i) => sum + i * d.actual, 0);
    const sumX2 = monthlyData.reduce((sum, _, i) => sum + i * i, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) || 0;
    const intercept = (sumY - slope * sumX) / n;
    
    // Add 3 month forecast
    for (let i = 0; i < 3; i++) {
      const monthDate = subMonths(new Date(), -(i + 1));
      const projected = Math.max(0, intercept + slope * (n + i));
      
      monthlyData.push({
        month: format(monthDate, "MMM"),
        actual: 0,
        forecast: Math.round(projected),
      });
    }
    
    return monthlyData;
  }, [allPayments]);

  // Churn analysis
  const churnAnalysis = useMemo(() => {
    const today = new Date();
    const expired = members.filter((m) => {
      const expiry = new Date(m.expiry_date);
      return expiry < today && !m.is_blocked;
    });
    
    const churned = expired.length;
    const active = members.filter((m) => new Date(m.expiry_date) >= today).length;
    const churnRate = members.length > 0 ? (churned / members.length) * 100 : 0;
    
    // Average membership duration
    const durations = members.map((m) => {
      const start = parseISO(m.start_date);
      const end = new Date(m.expiry_date) < today ? new Date(m.expiry_date) : today;
      return differenceInDays(end, start);
    });
    const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    
    return {
      churned,
      active,
      churnRate: Math.round(churnRate * 10) / 10,
      avgDurationDays: Math.round(avgDuration),
    };
  }, [members]);

  // Member lifetime value
  const lifetimeValue = useMemo(() => {
    const memberPayments: Record<string, number> = {};
    
    allPayments.forEach((p: any) => {
      if (!memberPayments[p.member_id]) {
        memberPayments[p.member_id] = 0;
      }
      memberPayments[p.member_id] += Number(p.amount || 0);
    });
    
    const values = Object.values(memberPayments);
    const avgLTV = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    
    return Math.round(avgLTV);
  }, [allPayments]);

  return (
    <div className="space-y-6">
      {/* Pro Badge */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-md-purple/10 to-md-pink/10 border border-md-purple/20 w-fit">
        <Crown className="h-4 w-4 text-md-purple" />
        <span className="text-sm font-medium text-md-purple">Pro Analytics</span>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="h-4 w-4 text-md-teal" />
            <span className="text-sm text-muted-foreground">Retention Rate</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {retentionStats?.retention_rate?.toFixed(1) || churnAnalysis.active > 0 ? ((churnAnalysis.active / members.length) * 100).toFixed(1) : 0}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">Active / Total members</p>
        </div>
        
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-md-orange" />
            <span className="text-sm text-muted-foreground">Churn Rate</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{churnAnalysis.churnRate}%</p>
          <p className="text-xs text-muted-foreground mt-1">{churnAnalysis.churned} expired members</p>
        </div>
        
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-md-blue" />
            <span className="text-sm text-muted-foreground">Avg Duration</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{Math.round(churnAnalysis.avgDurationDays / 30)} mo</p>
          <p className="text-xs text-muted-foreground mt-1">{churnAnalysis.avgDurationDays} days avg</p>
        </div>
        
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-md-green" />
            <span className="text-sm text-muted-foreground">Lifetime Value</span>
          </div>
          <p className="text-2xl font-bold text-foreground">₹{lifetimeValue.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Avg revenue per member</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Growth Trend */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">Member Growth Trend</h3>
            <p className="text-sm text-muted-foreground">6-month growth analysis</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={growthTrend}>
              <defs>
                <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--md-teal))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--md-teal))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} width={40} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Area
                type="monotone"
                dataKey="totalMembers"
                stroke="hsl(var(--md-teal))"
                strokeWidth={2}
                fill="url(#colorGrowth)"
                name="Total Members"
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-4 mt-3">
            {growthTrend.length >= 2 && (
              <div className="flex items-center gap-2 text-sm">
                {growthTrend[growthTrend.length - 1].growthRate >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-md-green" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-md-red" />
                )}
                <span className={growthTrend[growthTrend.length - 1].growthRate >= 0 ? "text-md-green" : "text-md-red"}>
                  {growthTrend[growthTrend.length - 1].growthRate >= 0 ? "+" : ""}
                  {growthTrend[growthTrend.length - 1].growthRate}% this month
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Revenue Forecast */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">Revenue Forecast</h3>
            <p className="text-sm text-muted-foreground">3-month projection based on trends</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenueForecast}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} width={50} tickFormatter={(v) => `₹${v >= 1000 ? `${v/1000}k` : v}`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number, name: string) => [`₹${value.toLocaleString()}`, name === "actual" ? "Actual" : "Forecast"]}
              />
              <Bar dataKey="actual" fill="hsl(var(--md-teal))" radius={[4, 4, 0, 0]} name="Actual" />
              <Bar dataKey="forecast" fill="hsl(var(--md-purple))" radius={[4, 4, 0, 0]} name="Forecast" opacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-6 mt-3">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-md-teal" />
              <span className="text-xs text-muted-foreground">Actual</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-md-purple opacity-70" />
              <span className="text-xs text-muted-foreground">Forecast</span>
            </div>
          </div>
        </div>
      </div>

      {/* Retention Insights */}
      {retentionStats && (
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">Retention Insights</h3>
            <p className="text-sm text-muted-foreground">This month's member activity</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-2xl font-bold text-md-green">{retentionStats.members_renewed_this_month || 0}</p>
              <p className="text-xs text-muted-foreground">Renewals</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-2xl font-bold text-md-red">{retentionStats.members_churned_this_month || 0}</p>
              <p className="text-xs text-muted-foreground">Churned</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-2xl font-bold text-foreground">{retentionStats.active_members || 0}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-2xl font-bold text-foreground">{Math.round(retentionStats.avg_membership_duration || 0)}</p>
              <p className="text-xs text-muted-foreground">Avg Days</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
