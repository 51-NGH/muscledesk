import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useExpenses, useCreateExpense, ExpenseCategory } from "@/hooks/useGymData";
import { UpgradeRequiredPage } from "@/components/UpgradeOverlay";
import { useGymPlanFeatures } from "@/hooks/useGymPlanFeatures";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfMonth, endOfMonth } from "date-fns";
import {
  TrendingDown,
  Building2,
  Users,
  Zap,
  Wrench,
  MoreHorizontal,
  Plus,
  Calendar,
} from "lucide-react";

const categoryConfig: Record<ExpenseCategory, { label: string; icon: typeof Building2; className: string }> = {
  rent: { label: "Rent", icon: Building2, className: "category-icon-rent" },
  salary: { label: "Salary", icon: Users, className: "category-icon-salary" },
  electricity: { label: "Electricity", icon: Zap, className: "category-icon-electricity" },
  maintenance: { label: "Maintenance", icon: Wrench, className: "category-icon-maintenance" },
  other: { label: "Other", icon: MoreHorizontal, className: "category-icon-other" },
};

export default function Expenses() {
  const { data: features, isLoading: featuresLoading } = useGymPlanFeatures();
  const { data: expenses = [], isLoading } = useExpenses();
  const createExpense = useCreateExpense();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [newExpense, setNewExpense] = useState({
    category: "other" as ExpenseCategory,
    amount: "",
    description: "",
    expense_date: format(new Date(), "yyyy-MM-dd"),
  });

  // Show loading state while checking features
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
  if (features && !features.hasExpenseTracking) {
    return (
      <DashboardLayout>
        <UpgradeRequiredPage
          feature="Expense Tracking"
          description="Track and categorize all your gym expenses, monitor spending patterns, and maintain complete financial records."
          benefits={[
            "Categorized expense tracking",
            "Monthly expense reports",
            "Receipt management",
            "Spending analytics",
            "Export financial data"
          ]}
        />
      </DashboardLayout>
    );
  }

  // Filter expenses by selected month
  const filteredExpenses = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));
    
    return expenses.filter((expense) => {
      const expenseDate = new Date(expense.expense_date);
      return expenseDate >= monthStart && expenseDate <= monthEnd;
    });
  }, [expenses, selectedMonth]);

  // Calculate totals by category
  const categoryTotals = useMemo(() => {
    const totals: Record<ExpenseCategory, number> = {
      rent: 0,
      salary: 0,
      electricity: 0,
      maintenance: 0,
      other: 0,
    };
    
    filteredExpenses.forEach((expense) => {
      totals[expense.category] += expense.amount;
    });
    
    return totals;
  }, [filteredExpenses]);

  const totalExpenses = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);

  const handleAddExpense = async () => {
    if (!newExpense.amount || Number(newExpense.amount) <= 0) return;
    
    await createExpense.mutateAsync({
      category: newExpense.category,
      amount: Number(newExpense.amount),
      description: newExpense.description || undefined,
      expense_date: newExpense.expense_date,
    });
    
    setIsAddDialogOpen(false);
    setNewExpense({
      category: "other",
      amount: "",
      description: "",
      expense_date: format(new Date(), "yyyy-MM-dd"),
    });
  };

  // Generate month options (last 12 months)
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      options.push({
        value: format(date, "yyyy-MM"),
        label: format(date, "MMMM yyyy"),
      });
    }
    return options;
  }, []);

  return (
    <DashboardLayout>
      <PageHeader title="Expenses" description="Track and manage your gym expenses">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[140px] sm:w-[180px]">
            <Calendar className="mr-2 h-4 w-4 hidden sm:block" />
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Add Expense</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Expense</DialogTitle>
              <DialogDescription>
                Record a new expense for your gym
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newExpense.category}
                  onValueChange={(value: ExpenseCategory) =>
                    setNewExpense({ ...newExpense, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <config.icon className="h-4 w-4" />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="amount">Amount (₹)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0"
                    value={newExpense.amount}
                    onChange={(e) =>
                      setNewExpense({ ...newExpense, amount: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newExpense.expense_date}
                    onChange={(e) =>
                      setNewExpense({ ...newExpense, expense_date: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  placeholder="Enter description"
                  value={newExpense.description}
                  onChange={(e) =>
                    setNewExpense({ ...newExpense, description: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleAddExpense} disabled={createExpense.isPending}>
                {createExpense.isPending ? "Adding..." : "Add Expense"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard
          title="Total Expenses"
          value={`₹${totalExpenses.toLocaleString()}`}
          icon={TrendingDown}
          iconVariant="red"
        />
        <StatCard
          title="Rent"
          value={`₹${categoryTotals.rent.toLocaleString()}`}
          icon={Building2}
          iconVariant="blue"
        />
        <StatCard
          title="Salary"
          value={`₹${categoryTotals.salary.toLocaleString()}`}
          icon={Users}
          iconVariant="teal"
        />
        <StatCard
          title="Electricity"
          value={`₹${categoryTotals.electricity.toLocaleString()}`}
          icon={Zap}
          iconVariant="orange"
        />
      </div>

      {/* Expense History */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-foreground">Expense History</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            All expenses for {format(new Date(selectedMonth + "-01"), "MMMM yyyy")}
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-10 sm:py-12 text-muted-foreground">
            Loading expenses...
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="text-center py-10 sm:py-12 text-muted-foreground">
            <TrendingDown className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 opacity-50" />
            <p className="text-base sm:text-lg font-medium">No expenses recorded</p>
            <p className="text-xs sm:text-sm">Add your first expense to start tracking</p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {filteredExpenses.map((expense, index) => {
              const config = categoryConfig[expense.category];
              const CategoryIcon = config.icon;
              
              return (
                <div
                  key={expense.id}
                  className="flex items-center justify-between py-2.5 sm:py-3 border-b border-border last:border-0 animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg shrink-0 ${config.className}`}>
                      <CategoryIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground">{config.label}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-none">
                        {expense.description || "No description"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-sm text-foreground">
                      ₹{expense.amount.toLocaleString()}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      {format(new Date(expense.expense_date), "MMM d")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}