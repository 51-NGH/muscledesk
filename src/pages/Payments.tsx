import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  Download,
  Search,
  Filter,
  MoreVertical,
  CreditCard,
} from "lucide-react";
import { Input } from "@/components/ui/input";

type PaymentStatus = "completed" | "pending" | "failed";
type PlanType = "premium" | "standard" | "basic";

interface Transaction {
  id: string;
  member: string;
  plan: PlanType;
  amount: number;
  method: string;
  status: PaymentStatus;
  date: string;
}

const transactions: Transaction[] = [
  { id: "TXN-2847", member: "Sarah Johnson", plan: "premium", amount: 89.99, method: "Visa ••••4242", status: "completed", date: "2024-12-27" },
  { id: "TXN-2846", member: "Mike Chen", plan: "standard", amount: 59.99, method: "Mastercard ••••8901", status: "completed", date: "2024-12-27" },
  { id: "TXN-2845", member: "Emma Wilson", plan: "premium", amount: 89.99, method: "Visa ••••3456", status: "completed", date: "2024-12-26" },
  { id: "TXN-2844", member: "David Brown", plan: "standard", amount: 59.99, method: "PayPal", status: "pending", date: "2024-12-26" },
  { id: "TXN-2843", member: "Lisa Anderson", plan: "premium", amount: 89.99, method: "Amex ••••7890", status: "completed", date: "2024-12-25" },
  { id: "TXN-2842", member: "James Wilson", plan: "basic", amount: 39.99, method: "Visa ••••1234", status: "failed", date: "2024-12-25" },
  { id: "TXN-2841", member: "Maria Garcia", plan: "premium", amount: 89.99, method: "Mastercard ••••5678", status: "completed", date: "2024-12-24" },
];

const filterTabs = ["All", "Completed", "Pending", "Failed"] as const;

const planColors: Record<PlanType, string> = {
  premium: "plan-premium",
  standard: "plan-standard",
  basic: "plan-basic",
};

const statusConfig: Record<PaymentStatus, { icon: typeof CheckCircle; className: string }> = {
  completed: { icon: CheckCircle, className: "status-completed" },
  pending: { icon: Clock, className: "status-pending" },
  failed: { icon: XCircle, className: "status-failed" },
};

export default function Payments() {
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTransactions = transactions.filter((txn) => {
    const matchesSearch = txn.member.toLowerCase().includes(searchQuery.toLowerCase()) ||
      txn.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === "All" || txn.status === activeFilter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  return (
    <DashboardLayout>
      <PageHeader
        title="Payments & Billing"
        description="Manage transactions and revenue streams"
      >
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Revenue"
          value="$127,450"
          icon={DollarSign}
          iconVariant="teal"
          change={18.2}
        />
        <StatCard
          title="Successful Payments"
          value="2,847"
          icon={CheckCircle}
          iconVariant="green"
          change={12.5}
        />
        <StatCard
          title="Pending"
          value="23"
          icon={Clock}
          iconVariant="orange"
          change={3.1}
        />
        <StatCard
          title="Failed"
          value="12"
          icon={XCircle}
          iconVariant="red"
          change={-8.4}
        />
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
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
          <p className="text-sm text-muted-foreground">Latest payment activities</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr className="text-left text-sm text-muted-foreground">
                <th className="px-5 py-3 font-medium">Transaction ID</th>
                <th className="px-5 py-3 font-medium">Member</th>
                <th className="px-5 py-3 font-medium">Plan</th>
                <th className="px-5 py-3 font-medium">Amount</th>
                <th className="px-5 py-3 font-medium">Payment Method</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((txn) => {
                const StatusIcon = statusConfig[txn.status].icon;
                return (
                  <tr key={txn.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-5 py-4 text-sm font-medium text-foreground">{txn.id}</td>
                    <td className="px-5 py-4 text-sm text-foreground">{txn.member}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs ${planColors[txn.plan]}`}>
                        {txn.plan.charAt(0).toUpperCase() + txn.plan.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-foreground">${txn.amount.toFixed(2)}</td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        {txn.method}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs ${statusConfig[txn.status].className}`}>
                        <StatusIcon className="h-3 w-3" />
                        {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{txn.date}</td>
                    <td className="px-5 py-4">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
