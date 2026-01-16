import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useDashboardStats,
  useMonthlyRevenue,
  useMonthlyExpenses,
  useDailyAttendance,
  useMembers,
  usePayments,
  useExpenses,
} from "@/hooks/useGymData";
import { useAnalyticsExport } from "@/hooks/useAnalyticsExport";
import { UpgradeRequiredPage } from "@/components/UpgradeOverlay";
import { useGymPlanFeatures } from "@/hooks/useGymPlanFeatures";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format, subDays, subMonths, isAfter, parseISO, startOfDay } from "date-fns";
import {
  DollarSign,
  Users,
  TrendingUp,
  Calendar,
  Download,
  UserPlus,
  Percent,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  FileText,
  FileSpreadsheet,
  ChevronDown,
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
  // ALL HOOKS MUST BE CALLED AT THE TOP - BEFORE ANY CONDITIONAL RETURNS
  const [activeRange, setActiveRange] = useState<string>("30 Days");
  const { data: features, isLoading: featuresLoading } = useGymPlanFeatures();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: members = [] } = useMembers();
  const { data: allPayments = [] } = usePayments();
  const { data: allExpenses = [] } = useExpenses();
  const { exportToCSV, exportToPDF } = useAnalyticsExport();
  
  // Calculate days and months based on selected range
  const { daysBack, monthsBack } = useMemo(() => {
    switch (activeRange) {
      case "7 Days": return { daysBack: 7, monthsBack: 1 };
      case "30 Days": return { daysBack: 30, monthsBack: 1 };
      case "90 Days": return { daysBack: 90, monthsBack: 3 };
      case "6 Months": return { daysBack: 180, monthsBack: 6 };
      default: return { daysBack: 30, monthsBack: 1 };
    }
  }, [activeRange]);

  // Fetch data based on range
  const { data: monthlyRevenue = [] } = useMonthlyRevenue(monthsBack);
  const { data: monthlyExpenses = [] } = useMonthlyExpenses(monthsBack);
  const { data: dailyAttendance = [] } = useDailyAttendance(daysBack);

  // Calculate date range start
  const rangeStartDate = useMemo(() => {
    return startOfDay(subDays(new Date(), daysBack));
  }, [daysBack]);

  // Filter payments by selected range - MUST BE BEFORE CONDITIONAL RETURNS
  const filteredPayments = useMemo(() => {
    return allPayments.filter((p: any) => {
      const paymentDate = parseISO(p.created_at);
      return isAfter(paymentDate, rangeStartDate);
    });
  }, [allPayments, rangeStartDate]);

  // Filter expenses by selected range
  const filteredExpenses = useMemo(() => {
    return allExpenses.filter((e: any) => {
      const expenseDate = parseISO(e.expense_date);
      return isAfter(expenseDate, rangeStartDate);
    });
  }, [allExpenses, rangeStartDate]);

  // Calculate totals for the selected range
  const rangeRevenue = useMemo(() => {
    return filteredPayments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
  }, [filteredPayments]);

  const rangeExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
  }, [filteredExpenses]);

  const rangeProfit = useMemo(() => {
    return rangeRevenue - rangeExpenses;
  }, [rangeRevenue, rangeExpenses]);

  // Process revenue data for chart - group by appropriate period
  const revenueChartData = useMemo(() => {
    if (daysBack <= 30) {
      // For 7 or 30 days, show daily data
      const dailyData: Record<string, { revenue: number; expenses: number; profit: number }> = {};
      
      // Initialize all days in range
      for (let i = daysBack - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateKey = format(date, "yyyy-MM-dd");
        dailyData[dateKey] = { revenue: 0, expenses: 0, profit: 0 };
      }
      
      // Add payment data
      filteredPayments.forEach((p: any) => {
        const dateKey = format(parseISO(p.created_at), "yyyy-MM-dd");
        if (dailyData[dateKey]) {
          dailyData[dateKey].revenue += Number(p.amount || 0);
        }
      });
      
      // Add expense data
      filteredExpenses.forEach((e: any) => {
        const dateKey = format(parseISO(e.expense_date), "yyyy-MM-dd");
        if (dailyData[dateKey]) {
          dailyData[dateKey].expenses += Number(e.amount || 0);
        }
      });
      
      // Calculate profit
      Object.keys(dailyData).forEach((key) => {
        dailyData[key].profit = dailyData[key].revenue - dailyData[key].expenses;
      });
      
      return Object.entries(dailyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({
          month: format(parseISO(date), daysBack <= 7 ? "EEE" : "MMM d"),
          ...data,
        }));
    } else {
      // For 90 days and 6 months, show monthly data
      const revenueByMonth: Record<string, { revenue: number; expenses: number; profit: number }> = {};
      
      // Initialize months
      for (let i = monthsBack - 1; i >= 0; i--) {
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
    }
  }, [monthlyRevenue, monthlyExpenses, filteredPayments, filteredExpenses, daysBack, monthsBack]);

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

  // Member status distribution
  const memberStatusData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let active = 0, expiring = 0, expired = 0, blocked = 0;
    
    members.forEach((member) => {
      if (member.is_blocked) {
        blocked++;
        return;
      }
      const expiryDate = new Date(member.expiry_date);
      expiryDate.setHours(0, 0, 0, 0);
      
      if (expiryDate < today) {
        expired++;
      } else {
        const sevenDaysFromNow = new Date(today);
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        if (expiryDate <= sevenDaysFromNow) {
          expiring++;
        } else {
          active++;
        }
      }
    });
    
    return [
      { name: "Active", value: active, color: "hsl(var(--md-green))" },
      { name: "Expiring", value: expiring, color: "hsl(var(--md-yellow))" },
      { name: "Expired", value: expired, color: "hsl(var(--md-red))" },
      { name: "Blocked", value: blocked, color: "hsl(var(--muted-foreground))" },
    ].filter(item => item.value > 0);
  }, [members]);

  // Expense breakdown by category
  const expenseCategoryData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    
    filteredExpenses.forEach((expense: any) => {
      const category = expense.category || "Other";
      categoryTotals[category] = (categoryTotals[category] || 0) + Number(expense.amount || 0);
    });
    
    const colors: Record<string, string> = {
      rent: "hsl(var(--md-blue))",
      utilities: "hsl(var(--md-yellow))",
      salaries: "hsl(var(--md-purple))",
      equipment: "hsl(var(--md-teal))",
      maintenance: "hsl(var(--md-orange))",
      marketing: "hsl(var(--md-pink))",
      supplies: "hsl(var(--md-green))",
      other: "hsl(var(--muted-foreground))",
    };
    
    return Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: colors[name.toLowerCase()] || colors.other,
      }));
  }, [filteredExpenses]);

  // Payment mode breakdown
  const paymentModeData = useMemo(() => {
    const modeTotals: Record<string, { count: number; amount: number }> = {};
    
    filteredPayments.forEach((payment: any) => {
      const mode = payment.payment_mode || "cash";
      if (!modeTotals[mode]) {
        modeTotals[mode] = { count: 0, amount: 0 };
      }
      modeTotals[mode].count++;
      modeTotals[mode].amount += Number(payment.amount || 0);
    });
    
    const colors: Record<string, string> = {
      cash: "hsl(var(--md-green))",
      upi: "hsl(var(--md-purple))",
      card: "hsl(var(--md-blue))",
      bank_transfer: "hsl(var(--md-teal))",
      other: "hsl(var(--muted-foreground))",
    };
    
    const labels: Record<string, string> = {
      cash: "Cash",
      upi: "UPI",
      card: "Card",
      bank_transfer: "Bank Transfer",
      other: "Other",
    };
    
    return Object.entries(modeTotals)
      .sort((a, b) => b[1].amount - a[1].amount)
      .map(([mode, data]) => ({
        name: labels[mode] || mode,
        value: data.amount,
        count: data.count,
        color: colors[mode] || colors.other,
      }));
  }, [filteredPayments]);

  // Member growth over time
  const memberGrowthData = useMemo(() => {
    if (daysBack <= 30) {
      // Daily data for short ranges
      const dailyData: Record<string, number> = {};
      
      for (let i = daysBack - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateKey = format(date, "yyyy-MM-dd");
        dailyData[dateKey] = 0;
      }
      
      members.forEach((member) => {
        const joinDate = format(parseISO(member.start_date), "yyyy-MM-dd");
        if (dailyData[joinDate] !== undefined) {
          dailyData[joinDate]++;
        }
      });
      
      // Calculate cumulative
      let cumulative = members.filter((m) => {
        const joinDate = parseISO(m.start_date);
        return joinDate < rangeStartDate;
      }).length;
      
      return Object.entries(dailyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, newMembers]) => {
          cumulative += newMembers;
          return {
            date: format(parseISO(date), daysBack <= 7 ? "EEE" : "MMM d"),
            newMembers,
            totalMembers: cumulative,
          };
        });
    } else {
      // Monthly data for longer ranges
      const monthlyData: Record<string, number> = {};
      
      for (let i = monthsBack - 1; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        const monthKey = format(monthDate, "yyyy-MM");
        monthlyData[monthKey] = 0;
      }
      
      members.forEach((member) => {
        const joinMonth = format(parseISO(member.start_date), "yyyy-MM");
        if (monthlyData[joinMonth] !== undefined) {
          monthlyData[joinMonth]++;
        }
      });
      
      let cumulative = members.filter((m) => {
        const joinDate = parseISO(m.start_date);
        return joinDate < subMonths(new Date(), monthsBack);
      }).length;
      
      return Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, newMembers]) => {
          cumulative += newMembers;
          return {
            date: format(new Date(month + "-01"), "MMM"),
            newMembers,
            totalMembers: cumulative,
          };
        });
    }
  }, [members, daysBack, monthsBack, rangeStartDate]);

  // Attendance trend data - adjusted to show appropriate number of days
  const attendanceChartData = useMemo(() => {
    if (dailyAttendance.length === 0) return [];
    
    // Show all data points but limit display for readability
    const maxPoints = daysBack <= 7 ? 7 : daysBack <= 30 ? 14 : daysBack <= 90 ? 30 : 30;
    
    return [...dailyAttendance]
      .reverse()
      .slice(-maxPoints)
      .map((d: any) => ({
        day: format(new Date(d.date), daysBack <= 7 ? "EEE" : "MMM d"),
        checkIns: Number(d.check_ins || 0),
      }));
  }, [dailyAttendance, daysBack]);

  // Peak hours data (simulated based on attendance - in real app would need hourly data)
  const peakHoursData = useMemo(() => {
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

  // Calculate attendance rate for the selected period
  const attendanceRate = useMemo(() => {
    if (!stats?.activeMembers || stats.activeMembers === 0) return 0;
    const avgDailyAttendance = dailyAttendance.length > 0 
      ? dailyAttendance.reduce((sum: number, d: any) => sum + Number(d.check_ins || 0), 0) / dailyAttendance.length 
      : 0;
    return Math.min(100, Math.round((avgDailyAttendance / stats.activeMembers) * 100));
  }, [dailyAttendance, stats]);

  // Calculate total check-ins for the period
  const totalCheckIns = useMemo(() => {
    return dailyAttendance.reduce((sum: number, d: any) => sum + Number(d.check_ins || 0), 0);
  }, [dailyAttendance]);

  // Revenue per member
  const revenuePerMember = useMemo(() => {
    const activeCount = stats?.activeMembers || 0;
    if (activeCount === 0) return 0;
    return Math.round(rangeRevenue / activeCount);
  }, [rangeRevenue, stats]);

  // Average transaction value
  const avgTransactionValue = useMemo(() => {
    if (filteredPayments.length === 0) return 0;
    return Math.round(rangeRevenue / filteredPayments.length);
  }, [rangeRevenue, filteredPayments]);

  // New members in period
  const newMembersInPeriod = useMemo(() => {
    return members.filter((m) => {
      const joinDate = parseISO(m.start_date);
      return isAfter(joinDate, rangeStartDate);
    }).length;
  }, [members, rangeStartDate]);

  // Retention rate (active / total)
  const retentionRate = useMemo(() => {
    if (members.length === 0) return 0;
    const activeCount = memberStatusData.find(d => d.name === "Active")?.value || 0;
    return Math.round((activeCount / members.length) * 100);
  }, [members, memberStatusData]);

  // Get subtitle based on active range
  const getSubtitle = () => {
    switch (activeRange) {
      case "7 Days": return "Last 7 days";
      case "30 Days": return "Last 30 days";
      case "90 Days": return "Last 90 days";
      case "6 Months": return "Last 6 months";
      default: return "Last 30 days";
    }
  };

  // Handle export
  const handleExport = (type: "csv" | "pdf") => {
    const exportData = {
      activeRange,
      rangeRevenue,
      rangeExpenses,
      rangeProfit,
      totalCheckIns,
      attendanceRate,
      newMembersInPeriod,
      activeMembers: stats?.activeMembers || 0,
      totalMembers: stats?.totalMembers || 0,
      retentionRate,
      avgTransactionValue,
      filteredPaymentsCount: filteredPayments.length,
      revenueChartData,
      membershipData,
      memberStatusData,
      expenseCategoryData,
      paymentModeData,
      attendanceChartData,
    };

    try {
      if (type === "csv") {
        exportToCSV(exportData);
        toast.success("CSV report downloaded successfully!");
      } else {
        exportToPDF(exportData);
        toast.success("PDF report downloaded successfully!");
      }
    } catch (error) {
      toast.error("Failed to export report. Please try again.");
      console.error("Export error:", error);
    }
  };

  if (featuresLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  // Show upgrade page for Lite plan
  if (features && !features.hasAnalyticsPage) {
    return (
      <DashboardLayout>
        <UpgradeRequiredPage
          feature="Advanced Analytics"
          description="Gain deep insights into your gym's performance with comprehensive analytics, revenue trends, member statistics, and growth metrics."
          benefits={[
            "Revenue & profit analysis",
            "Attendance trends & patterns",
            "Member growth tracking",
            "Peak hours analysis",
            "Export reports"
          ]}
        />
      </DashboardLayout>
    );
  }

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="hidden sm:flex">
                <Download className="mr-2 h-4 w-4" />
                Export
                <ChevronDown className="ml-2 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("csv")}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("pdf")}>
                <FileText className="mr-2 h-4 w-4" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard
          title="Total Revenue"
          value={statsLoading ? "..." : `₹${rangeRevenue.toLocaleString()}`}
          subtitle={getSubtitle()}
          icon={DollarSign}
          iconVariant="teal"
        />
        <StatCard
          title="Net Profit"
          value={statsLoading ? "..." : `₹${rangeProfit.toLocaleString()}`}
          subtitle={rangeProfit >= 0 ? "Profitable" : "Loss"}
          icon={rangeProfit >= 0 ? ArrowUpRight : ArrowDownRight}
          iconVariant={rangeProfit >= 0 ? "green" : "red"}
        />
        <StatCard
          title="Total Expenses"
          value={statsLoading ? "..." : `₹${rangeExpenses.toLocaleString()}`}
          subtitle={`${filteredExpenses.length} transactions`}
          icon={CreditCard}
          iconVariant="orange"
        />
        <StatCard
          title="Total Check-ins"
          value={statsLoading ? "..." : totalCheckIns.toLocaleString()}
          subtitle={`${attendanceRate}% avg rate`}
          icon={Activity}
          iconVariant="blue"
        />
      </div>

      {/* Revenue Analysis & Membership Plans */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
        {/* Revenue Analysis */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 sm:p-5 hover:shadow-lg transition-shadow duration-300">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">Revenue Analysis</h3>
            <p className="text-sm text-muted-foreground">Revenue, expenses, and profit trends • {getSubtitle()}</p>
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
                interval={daysBack <= 7 ? 0 : "preserveStartEnd"}
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

      {/* Secondary Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard
          title="New Members"
          value={statsLoading ? "..." : newMembersInPeriod}
          subtitle={getSubtitle()}
          icon={UserPlus}
          iconVariant="blue"
        />
        <StatCard
          title="Active Members"
          value={statsLoading ? "..." : stats?.activeMembers || 0}
          subtitle={`${stats?.totalMembers || 0} total`}
          icon={Users}
          iconVariant="green"
        />
        <StatCard
          title="Retention Rate"
          value={statsLoading ? "..." : `${retentionRate}%`}
          subtitle="Active / Total"
          icon={Percent}
          iconVariant="teal"
        />
        <StatCard
          title="Avg Transaction"
          value={statsLoading ? "..." : `₹${avgTransactionValue.toLocaleString()}`}
          subtitle={`${filteredPayments.length} payments`}
          icon={TrendingUp}
          iconVariant="orange"
        />
      </div>

      {/* Member Growth & Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
        {/* Member Growth */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 hover:shadow-lg transition-shadow duration-300">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">Member Growth</h3>
            <p className="text-sm text-muted-foreground">New members & total growth • {getSubtitle()}</p>
          </div>
          {memberGrowthData.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              <p className="text-sm">No member data</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={memberGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  interval={daysBack <= 7 ? 0 : "preserveStartEnd"}
                />
                <YAxis
                  yAxisId="left"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  width={30}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  width={35}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="newMembers"
                  fill="hsl(var(--md-blue))"
                  radius={[4, 4, 0, 0]}
                  name="New Members"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="totalMembers"
                  stroke="hsl(var(--md-teal))"
                  strokeWidth={2}
                  dot={false}
                  name="Total Members"
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
          <div className="flex items-center justify-center gap-6 mt-3">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-md-blue" />
              <span className="text-xs text-muted-foreground">New</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-md-teal" />
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
          </div>
        </div>

        {/* Member Status Distribution */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 hover:shadow-lg transition-shadow duration-300">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">Member Status</h3>
            <p className="text-sm text-muted-foreground">Distribution by membership status</p>
          </div>
          {memberStatusData.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              <p className="text-sm">No members yet</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={memberStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {memberStatusData.map((entry, index) => (
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
              <div className="grid grid-cols-2 gap-2 mt-2">
                {memberStatusData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs text-muted-foreground">{item.name}</span>
                    <span className="text-xs font-medium text-foreground ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Attendance Trend & Peak Hours */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
        {/* Attendance Trend */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 hover:shadow-lg transition-shadow duration-300">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">Attendance Trend</h3>
            <p className="text-sm text-muted-foreground">Daily check-ins • {getSubtitle()}</p>
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
                  interval={daysBack <= 7 ? 0 : "preserveStartEnd"}
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
            <p className="text-sm text-muted-foreground">Estimated visitor distribution • {getSubtitle()}</p>
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

      {/* Expense Breakdown & Payment Modes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Expense Breakdown */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 hover:shadow-lg transition-shadow duration-300">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">Expense Breakdown</h3>
            <p className="text-sm text-muted-foreground">By category • {getSubtitle()}</p>
          </div>
          {expenseCategoryData.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              <p className="text-sm">No expenses recorded</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={expenseCategoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickFormatter={(value) => value >= 1000 ? `₹${value / 1000}k` : `₹${value}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    width={70}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [`₹${value.toLocaleString()}`, "Amount"]}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {expenseCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Expenses</span>
                  <span className="font-semibold text-foreground">₹{rangeExpenses.toLocaleString()}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Payment Modes */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 hover:shadow-lg transition-shadow duration-300">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">Payment Methods</h3>
            <p className="text-sm text-muted-foreground">Revenue by payment mode • {getSubtitle()}</p>
          </div>
          {paymentModeData.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              <p className="text-sm">No payments recorded</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={paymentModeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {paymentModeData.map((entry, index) => (
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
                    formatter={(value: number, name: string) => [`₹${value.toLocaleString()}`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {paymentModeData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs text-muted-foreground truncate">{item.name}</span>
                    <span className="text-xs font-medium text-foreground ml-auto">₹{item.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
