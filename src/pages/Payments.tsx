import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { MemberAvatar } from "@/components/ui/member-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { usePayments, useMembers, useCreatePayment, useMembershipPlans, useDashboardStats } from "@/hooks/useGymData";
import { UpgradeRequiredPage } from "@/components/UpgradeOverlay";
import { useGymPlanFeatures } from "@/hooks/useGymPlanFeatures";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  Download,
  Search,
  Filter,
  CreditCard,
  Plus,
  Banknote,
  Smartphone,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type PaymentMode = "cash" | "upi" | "card";
type PaymentStatus = "completed" | "pending" | "failed";

const filterTabs = ["All", "Completed", "Pending", "Failed"] as const;

const statusConfig: Record<PaymentStatus, { icon: typeof CheckCircle; className: string }> = {
  completed: { icon: CheckCircle, className: "status-completed" },
  pending: { icon: Clock, className: "status-pending" },
  failed: { icon: XCircle, className: "status-failed" },
};

const paymentModeIcons: Record<PaymentMode, typeof Banknote> = {
  cash: Banknote,
  upi: Smartphone,
  card: CreditCard,
};

export default function Payments() {
  const { gymId } = useAuth();
  const { data: features, isLoading: featuresLoading } = useGymPlanFeatures();
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [newPayment, setNewPayment] = useState({
    member_id: "",
    amount: "",
    payment_mode: "cash" as PaymentMode,
    plan_id: "",
    extend_days: "30",
  });

  // ALL hooks must be called BEFORE any conditional returns
  const { data: payments = [], isLoading } = usePayments();
  const { data: members = [] } = useMembers();
  const { data: plans = [] } = useMembershipPlans();
  const { data: stats } = useDashboardStats();
  const createPayment = useCreatePayment();

  // Memoize expensive computations
  const filteredPayments = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();
    return payments.filter((p) => {
      const matchesSearch =
        p.member?.full_name?.toLowerCase().includes(searchLower) ||
        p.member?.member_id?.toLowerCase().includes(searchLower);
      const matchesFilter = activeFilter === "All" || p.status === activeFilter.toLowerCase();
      return matchesSearch && matchesFilter;
    });
  }, [payments, searchQuery, activeFilter]);

  const paymentStats = useMemo(() => ({
    total: payments.reduce((sum, p) => p.status === "completed" ? sum + Number(p.amount) : sum, 0),
    completed: payments.filter((p) => p.status === "completed").length,
    pending: payments.filter((p) => p.status === "pending").length,
    failed: payments.filter((p) => p.status === "failed").length,
  }), [payments]);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPayment.member_id || !newPayment.amount) {
      toast.error("Please fill all required fields");
      return;
    }

    const member = members.find((m) => m.id === newPayment.member_id);
    const plan = plans.find((p) => p.id === newPayment.plan_id);

    // Check if this is the member's first payment
    const memberPayments = payments.filter((p) => p.member_id === newPayment.member_id);
    const isFirstPayment = memberPayments.length === 0;

    // Calculate dates for payment record
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const currentExpiry = member ? new Date(member.expiry_date) : today;
    currentExpiry.setHours(0, 0, 0, 0);
    
    // If membership is still active (expiry in future), extend from expiry date
    // If membership expired, start fresh from today
    const extensionStartDate = currentExpiry >= today ? currentExpiry : today;
    
    const extendDays = newPayment.plan_id ? (plan?.duration_days || 30) : parseInt(newPayment.extend_days);
    const newExpiry = new Date(extensionStartDate);
    newExpiry.setDate(newExpiry.getDate() + extendDays);

    // For payment record: track the billing period
    const billingPeriodStart = extensionStartDate.toISOString().split("T")[0];
    const billingPeriodEnd = newExpiry.toISOString().split("T")[0];

    try {
      await createPayment.mutateAsync({
        member_id: newPayment.member_id,
        amount: parseFloat(newPayment.amount),
        payment_mode: newPayment.payment_mode,
        plan_id: newPayment.plan_id || undefined,
        plan_name: plan?.name,
        new_start_date: billingPeriodStart,
        // FIRST PAYMENT: Don't extend membership - it's payment for initial period
        // SUBSEQUENT PAYMENTS: Extend membership to new expiry date
        new_expiry_date: isFirstPayment ? undefined : billingPeriodEnd,
      });
      
      if (isFirstPayment) {
        toast.info("First payment recorded (membership dates unchanged)");
      }
      
      setIsAddPaymentOpen(false);
      setNewPayment({ member_id: "", amount: "", payment_mode: "cash", plan_id: "", extend_days: "30" });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handlePlanSelect = (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    setNewPayment({
      ...newPayment,
      plan_id: planId,
      amount: plan ? plan.price.toString() : newPayment.amount,
    });
  };

  const handleExport = () => {
    // Create CSV content
    const headers = ["Date", "Member", "Amount", "Method", "Status", "Plan"];
    const rows = filteredPayments.map((p) => [
      format(new Date(p.created_at), "yyyy-MM-dd HH:mm"),
      p.member?.full_name || "Unknown",
      `₹${p.amount}`,
      p.payment_mode,
      p.status,
      p.plan_name || "-",
    ]);
    
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export downloaded!");
  };

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
  if (features && !features.hasPaymentsPage) {
    return (
      <DashboardLayout>
        <UpgradeRequiredPage
          feature="Payments & Billing"
          description="Track payments, generate invoices, view transaction history, and manage your gym's revenue with detailed analytics."
          benefits={[
            "Complete payment tracking",
            "Multiple payment methods (Cash, UPI, Card)",
            "Transaction history & exports",
            "Revenue analytics",
            "Member billing management"
          ]}
        />
      </DashboardLayout>
    );
  }

  if (!gymId) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">No Gym Found</h2>
            <p className="text-muted-foreground">Please wait for your gym to be assigned.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader title="Payments & Billing" description="Manage transactions and revenue">
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
        <Button onClick={() => setIsAddPaymentOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Record Payment
        </Button>
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Monthly Revenue"
          value={`₹${(stats?.monthlyRevenue || 0).toLocaleString()}`}
          icon={DollarSign}
          iconVariant="teal"
        />
        <StatCard
          title="Completed"
          value={paymentStats.completed}
          icon={CheckCircle}
          iconVariant="green"
        />
        <StatCard
          title="Pending"
          value={paymentStats.pending}
          icon={Clock}
          iconVariant="orange"
        />
        <StatCard
          title="Net Profit"
          value={`₹${(stats?.profit || 0).toLocaleString()}`}
          icon={DollarSign}
          iconVariant="green"
        />
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by member name or ID..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center rounded-lg border border-border p-1">
          {filterTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeFilter === tab
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-xl border border-border bg-card">
        <div className="p-5 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Recent Transactions</h3>
          <p className="text-sm text-muted-foreground">{filteredPayments.length} payment records</p>
        </div>

        {isLoading ? (
          <div className="p-10 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-10 text-center">
            <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Payments</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "No payments match your search" : "No payment records yet"}
            </p>
            <Button onClick={() => setIsAddPaymentOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Record First Payment
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr className="text-left text-sm text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Member</th>
                  <th className="px-5 py-3 font-medium">Plan</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Method</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => {
                  const StatusIcon = statusConfig[payment.status].icon;
                  const MethodIcon = paymentModeIcons[payment.payment_mode];
                  return (
                    <tr key={payment.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <MemberAvatar name={payment.member?.full_name || "Unknown"} size="sm" />
                          <div>
                            <p className="text-sm font-medium text-foreground">{payment.member?.full_name}</p>
                            <p className="text-xs text-muted-foreground">{payment.member?.member_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-foreground">{payment.plan_name || "Custom"}</span>
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-foreground">₹{Number(payment.amount).toLocaleString()}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground capitalize">
                          <MethodIcon className="h-4 w-4" />
                          {payment.payment_mode}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs ${statusConfig[payment.status].className}`}>
                          <StatusIcon className="h-3 w-3" />
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">
                        {format(new Date(payment.created_at), "MMM d, yyyy h:mm a")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Payment Dialog */}
      <Dialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddPayment} className="space-y-4">
            <div className="space-y-2">
              <Label>Member *</Label>
              <Select value={newPayment.member_id} onValueChange={(v) => setNewPayment({ ...newPayment, member_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select member..." />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name} ({member.member_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Plan (Optional)</Label>
              <Select value={newPayment.plan_id} onValueChange={handlePlanSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select plan or enter custom amount" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - ₹{plan.price} ({plan.duration_days} days)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                  placeholder="₹0"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Extend Days</Label>
                <Input
                  type="number"
                  value={newPayment.extend_days}
                  onChange={(e) => setNewPayment({ ...newPayment, extend_days: e.target.value })}
                  placeholder="30"
                  disabled={!!newPayment.plan_id}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Payment Method *</Label>
              <div className="flex gap-2">
                {(["cash", "upi", "card"] as PaymentMode[]).map((mode) => {
                  const Icon = paymentModeIcons[mode];
                  return (
                    <Button
                      key={mode}
                      type="button"
                      variant={newPayment.payment_mode === mode ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setNewPayment({ ...newPayment, payment_mode: mode })}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {mode.toUpperCase()}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddPaymentOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createPayment.isPending}>
                {createPayment.isPending ? "Recording..." : "Record Payment"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
